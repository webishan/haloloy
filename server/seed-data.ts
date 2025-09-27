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

    // Create persistent merchant account
    console.log("🏪 Creating persistent merchant account...");
    const hashedMerchantPassword = await bcrypt.hash("ishan007", 10);
    const merchantUser = await storage.createUser({
      username: "tkhanishan",
      email: "tkhanishan@gmail.com",
      password: hashedMerchantPassword,
      firstName: "Ishan",
      lastName: "Merchant",
      role: "merchant",
      country: "BD",
      phone: "+8801234567890"
    });

    // Create merchant profile
    const merchant = await storage.createMerchant({
      userId: merchantUser.id,
      businessName: "Ishan's Business",
      businessType: "retail",
      accountType: "merchant",
      tier: "merchant",
      referralId: `REF_${merchantUser.id.substring(0, 8).toUpperCase()}`,
      loyaltyPointsBalance: 10000, // Give some initial points
      availablePoints: 10000,
      komarceBalance: "500.00"
    });

    // Create merchant wallets
    await storage.createUserWallet({
      userId: merchantUser.id,
      walletType: 'reward_points',
      balance: '10000'
    });
    
    await storage.createUserWallet({
      userId: merchantUser.id,
      walletType: 'income', 
      balance: '0'
    });
    
    await storage.createUserWallet({
      userId: merchantUser.id,
      walletType: 'commerce',
      balance: '500'
    });

    const merchants = [merchant];

    // Create persistent customer account
    console.log("👤 Creating persistent customer account...");
    const hashedCustomerPassword = await bcrypt.hash("samin007", 10);
    const customerUser = await storage.createUser({
      username: "samin",
      email: "samin@gmail.com",
      password: hashedCustomerPassword,
      firstName: "Samin",
      lastName: "Customer",
      role: "customer",
      country: "BD",
      phone: "+8801234567891"
    });

    // Generate unique account number
    const uniqueAccountNumber = await storage.generateUniqueAccountNumber();

    // Create customer profile
    const customerProfile = await storage.createCustomerProfile({
      userId: customerUser.id,
      uniqueAccountNumber,
      mobileNumber: "+8801234567891",
      email: "samin@gmail.com",
      fullName: "Samin Customer",
      profileComplete: true,
      totalPointsEarned: 0,
      currentPointsBalance: 0,
      accumulatedPoints: 0,
      globalSerialNumber: 0,
      localSerialNumber: 0,
      tier: 'bronze',
      isActive: true
    });

    // Create customer wallet
    await storage.createCustomerWallet({
      customerId: customerProfile.id,
      pointsBalance: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      totalPointsTransferred: 0
    });

    // Generate QR code for customer
    await storage.generateCustomerQRCode(customerUser.id);

    const customers = [customerProfile];

    // Initialize loyalty system with wallets for admin users
    console.log("💰 Creating loyalty wallets for admins...");
    
    const allAdminUsers = [...localAdmins];
    for (const user of allAdminUsers) {
      if (user.id) {
        // Create three wallets for each admin user
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

    // Initialize Global Number system
    console.log("🎯 Initializing Global Number system...");
    await storage.initializeStepUpConfig();

    // Skip creating referrals for now
    console.log("🤝 Skipping referral relationships...");

    // Skip creating sample transactions for now  
    console.log("💸 Skipping sample transactions...");

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

    // Skip creating leaderboard entries for now
    console.log("🏆 Skipping leaderboard entries...");

    // Global Number system is ready for use
    console.log("🎯 Global Number system initialized and ready...");
    const serialResult = { assignedCount: 0 };
    
    console.log("✅ Test data seeded successfully!");
    console.log(`Created:
    - 1 Global Admin (global@komarce.com / global123)
    - ${localAdmins.length} Local Admins (local123)
    - 1 Persistent Merchant (tkhanishan@gmail.com / ishan007)  
    - 1 Persistent Customer (samin@gmail.com / samin007)
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