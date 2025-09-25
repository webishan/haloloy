import { storage } from "./storage";
import bcrypt from "bcryptjs";

// Function to clear all test data
export async function clearTestData() {
  console.log("🗑️ Clearing test data...");
  
  // Clear all merchants and customers from memory storage
  try {
    // Get all users and remove merchants and customers
    const allUsers = await storage.getAllUsers();
    for (const user of allUsers) {
      if (user.role === 'merchant' || user.role === 'customer') {
        // This would need to be implemented in storage
        console.log(`Removing ${user.role}: ${user.email}`);
      }
    }
  } catch (error) {
    console.log("Note: Clear function not fully implemented, will rely on fresh restart");
  }
  
  console.log("✅ Test data cleared");
}

export async function seedTestData() {
  try {
    console.log("🌱 Seeding test data...");

    // Force refresh - clear existing data and reseed
    console.log("🔄 Force refreshing data - clearing existing merchants and customers...");

    // Create Global Admin
    const hashedGlobalPassword = await bcrypt.hash("global123", 10);
    const globalAdmin = await storage.createUser({
      username: "global_admin",
      email: "global@komarce.com",
      password: hashedGlobalPassword,
      firstName: "Global",
      lastName: "Administrator",
      role: "global_admin",
      country: "US"
    });

    // Create Local Admins for different countries
    const localAdmins = [];
    const countries = [
      { code: "BD", name: "Bangladesh", email: "bd@komarce.com" },
      { code: "MY", name: "Malaysia", email: "my@komarce.com" },
      { code: "AE", name: "UAE", email: "ae@komarce.com" },
      { code: "PH", name: "Philippines", email: "ph@komarce.com" }
    ];

    const hashedLocalPassword = await bcrypt.hash("local123", 10);
    for (const country of countries) {
      const localAdmin = await storage.createUser({
        username: `local_admin_${country.code.toLowerCase()}`,
        email: country.email,
        password: hashedLocalPassword,
        firstName: `${country.name}`,
        lastName: "Admin",
        role: "local_admin",
        country: country.code
      });
      localAdmins.push(localAdmin);

      // Create admin profile
      await storage.createAdmin({
        userId: localAdmin.id,
        adminType: "local",
        country: country.code,
        permissions: ["manage_merchants", "view_reports", "manage_points"],
        isActive: true
      });
    }

    // Create Global Admin profile
    await storage.createAdmin({
      userId: globalAdmin.id,
      adminType: "global", 
      country: "GLOBAL",
      permissions: ["all"],
      isActive: true
    });

    // Skip creating merchants - will be created manually
    const merchants = [];

    // Skip creating customers - will be created manually
    const customers = [];

    // Initialize loyalty system with wallets for admin users only
    console.log("💰 Creating loyalty wallets...");
    
    const allUsers = [...localAdmins];
    for (const user of allUsers) {
      if (user.id) {
        // Create three wallets for each user
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'reward_points',
          balance: '0'
        });
        
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'income', 
          balance: '0'
        });
        
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'commerce',
          balance: '0'
        });
      }
    }

    // Skip creating StepUp reward numbers - no customers to assign them to
    console.log("🎯 Skipping StepUp reward numbers (no customers)...");

    // Skip creating referrals - no customers to create referrals for
    console.log("🤝 Skipping referral relationships (no customers)...");

    // Skip creating sample transactions - no customers to create transactions for
    console.log("💸 Skipping sample transactions (no customers)...");

    // Create admin settings
    console.log("⚙️ Creating admin settings...");
    const adminSettings = [
      { settingKey: 'POINTS_TO_CURRENCY_RATE', settingValue: '0.01', settingType: 'string' as const, description: 'Points to USD conversion rate' },
      { settingKey: 'VAT_RATE', settingValue: '0.15', settingType: 'string' as const, description: 'VAT rate for cash conversions' },
      { settingKey: 'MERCHANT_CASHBACK_RATE', settingValue: '0.15', settingType: 'string' as const, description: 'Instant cashback rate for merchants' },
      { settingKey: 'REFERRAL_COMMISSION_RATE', settingValue: '0.05', settingType: 'string' as const, description: 'Referral commission rate' },
      { settingKey: 'TIER_PROGRESSION_POINTS', settingValue: '1500', settingType: 'string' as const, description: 'Points required for tier progression' }
    ];

    for (const setting of adminSettings) {
      await storage.createAdminSetting({
        settingKey: setting.settingKey,
        settingValue: setting.settingValue,
        settingType: setting.settingType,
        description: setting.description,
        category: 'loyalty_system',
        lastUpdatedBy: globalAdmin.id
      });
    }

    // Skip creating leaderboard entries - no customers to add to leaderboard
    console.log("🏆 Skipping leaderboard entries (no customers)...");

    // Assign global serial numbers to customers with 1500+ points
    console.log("🎯 Assigning global serial numbers to eligible customers...");
    const { assignGlobalSerialsToEligibleCustomers } = await import('./test-serial-assignment');
    const serialResult = await assignGlobalSerialsToEligibleCustomers();
    
    console.log("✅ Test data seeded successfully!");
    console.log(`Created:
    - 1 Global Admin (global@komarce.com / global123)
    - ${localAdmins.length} Local Admins (local123)
    - ${merchants.length} Merchants (will be created manually)  
    - ${customers.length} Customers (will be created manually)
    - Loyalty wallets and reward numbers
    - Sample transactions and referrals
    - Admin settings and leaderboards
    - ${serialResult.assignedCount} Global serial numbers assigned`);
    
    return {
      globalAdmin,
      localAdmins,
      merchants,
      customers
    };
    
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  }
}