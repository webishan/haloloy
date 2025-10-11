import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Force reload for Income Wallet fix
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Auto-seed data on development startup only
  if (process.env.NODE_ENV === "development") {
    try {
      const { seedTestData } = await import("./seed-data");
      await seedTestData();
      console.log("✅ Development data seeded automatically");
    } catch (error) {
      console.log("❌ Error seeding test data:", error);
      console.log("⚠️  Auto-seed skipped (data may already exist)");
    }
    
    // Update global admin credentials
    try {
      const { updateGlobalAdminCredentials } = await import("./update-global-admin");
      await updateGlobalAdminCredentials();
    } catch (error) {
      console.log("⚠️  Could not update global admin credentials:", error);
    }
  } else {
    console.log("🚀 Production mode - skipping auto-seed");
  }

  // Run database migrations
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    
    // Add password reset fields to admins table
    await db.execute(sql`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await db.execute(sql`
      ALTER TABLE admins 
      ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP
    `);
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.log("⚠️ Migration warning:", error);
  }

  // Initialize Global Number System
  try {
    const { storage } = await import("./storage");
    await storage.initializeStepUpConfig();
    console.log("✅ Global Number System initialized");
  } catch (error) {
    console.log("❌ Error initializing Global Number System:", error);
  }

  // Migrate existing merchants to have accountType field
  try {
    console.log("🔄 Migrating existing merchants to include accountType...");
    const { storage } = await import("./storage");
    const allMerchants = await storage.getMerchants();
    console.log(`📊 Found ${allMerchants.length} merchants to check for accountType migration`);
    
    let updatedCount = 0;
    for (const merchant of allMerchants) {
      // Check if merchant doesn't have accountType set
      if (!merchant.accountType) {
        await storage.updateMerchant(merchant.userId, {
          accountType: 'merchant' // Default to 'merchant' for existing merchants
        });
        updatedCount++;
        console.log(`✅ Updated merchant ${merchant.businessName} with accountType: merchant`);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`✅ Migration completed: Updated ${updatedCount} merchants with accountType field`);
    } else {
      console.log("✅ All merchants already have accountType field set");
    }
  } catch (error) {
    console.log("⚠️  Error migrating merchants accountType:", error);
  }

  // Fix missing referral codes for existing merchants
  try {
    const { storage } = await import("./storage");
    const allMerchants = await storage.getMerchants();
    let fixedCount = 0;
    
    for (const merchant of allMerchants) {
      if (!merchant.merchantReferralCode) {
        console.log(`🔧 Fixing missing referral code for merchant: ${merchant.businessName}`);
        const newReferralCode = await storage.generateMerchantReferralCode(merchant.userId);
        await storage.updateMerchant(merchant.userId, {
          merchantReferralCode: newReferralCode
        });
        console.log(`✅ Generated referral code: ${newReferralCode}`);
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} merchants with missing referral codes`);
    }
  } catch (error) {
    console.log("❌ Error fixing merchant referral codes:", error);
  }

  // Fix customer_serial_numbers table schema to allow multiple global numbers per customer
  try {
    console.log("🔄 Fixing customer_serial_numbers table schema...");
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");

    // Drop the unique constraint on customer_id to allow multiple global numbers per customer
    console.log("🔄 Dropping unique constraint on customer_id...");
    await db.execute(sql`
      ALTER TABLE customer_serial_numbers 
      DROP CONSTRAINT IF EXISTS customer_serial_numbers_customer_id_unique;
    `);
    console.log("✅ Successfully removed unique constraint on customer_id");

    // Add an index on customer_id for better query performance
    console.log("🔄 Adding index on customer_id...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_customer_id 
      ON customer_serial_numbers(customer_id);
    `);
    console.log("✅ Successfully added index on customer_id");

    // Add an index on global_serial_number for better query performance
    console.log("🔄 Adding index on global_serial_number...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_customer_serial_numbers_global_serial_number 
      ON customer_serial_numbers(global_serial_number);
    `);
    console.log("✅ Successfully added index on global_serial_number");

    console.log("🎉 Database schema migration completed successfully!");
    console.log("✅ Customers can now earn multiple global numbers");

    // Clean up any existing duplicate global numbers
    console.log("🧹 Cleaning up duplicate global numbers...");
    const duplicateCheck = await db.execute(sql`
      SELECT customer_id, global_serial_number, COUNT(*) as count
      FROM customer_serial_numbers 
      GROUP BY customer_id, global_serial_number
      HAVING COUNT(*) > 1
      ORDER BY customer_id, global_serial_number
    `);

    if (duplicateCheck.length > 0) {
      console.log(`🔍 Found ${duplicateCheck.length} duplicate combinations, cleaning up...`);
      
      for (const duplicate of duplicateCheck) {
        // Keep the first occurrence, delete the rest
        const recordsToDelete = await db.execute(sql`
          SELECT id FROM customer_serial_numbers 
          WHERE customer_id = ${duplicate.customer_id} 
          AND global_serial_number = ${duplicate.global_serial_number}
          ORDER BY assigned_at ASC
          OFFSET 1
        `);
        
        for (const record of recordsToDelete) {
          await db.execute(sql`DELETE FROM customer_serial_numbers WHERE id = ${record.id}`);
        }
      }
      
      console.log("✅ Successfully cleaned up duplicate global numbers");
    } else {
      console.log("✅ No duplicate global numbers found");
    }

  } catch (error) {
    console.log("⚠️  Error fixing customer_serial_numbers schema:", error);
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5006', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
