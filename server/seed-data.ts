import { storage } from "./storage";
import bcrypt from "bcryptjs";

// Function to clear all test data
export async function clearTestData() {
  console.log("🗑️ Clearing test data...");
  // Note: In a real application, you'd want to be more careful about clearing data
  // For development purposes, we'll just restart with fresh data
  console.log("✅ Test data cleared");
}

export async function seedTestData() {
  try {
    console.log("🌱 Seeding test data...");

    // Check if data already exists
    const existingUsers = await storage.getUsersByRole("customer");
    if (existingUsers.length > 0) {
      console.log("✅ Test data already exists, skipping seed");
      return;
    }

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

    // Create Merchants for each country
    const merchants = [];
    const hashedMerchantPassword = await bcrypt.hash("merchant123", 10);
    
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      for (let j = 1; j <= 3; j++) {
        const merchantUser = await storage.createUser({
          username: `merchant_${country.code.toLowerCase()}_${j}`,
          email: `merchant${j}@${country.code.toLowerCase()}.komarce.com`,
          password: hashedMerchantPassword,
          firstName: `Merchant`,
          lastName: `${country.name} ${j}`,
          role: "merchant",
          country: country.code
        });

        const merchant = await storage.createMerchant({
          userId: merchantUser.id,
          businessName: `${country.name} Store ${j}`,
          businessType: ["Electronics", "Fashion", "Food"][j-1] || "General",
          tier: j === 1 ? "gold" : j === 2 ? "silver" : "bronze",
          availablePoints: 5000,
          totalPointsDistributed: 0
        });
        merchants.push(merchant);
      }
    }

    // Create Customers for each country
    const customers = [];
    const hashedCustomerPassword = await bcrypt.hash("customer123", 10);
    
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      for (let j = 1; j <= 5; j++) {
        const customerUser = await storage.createUser({
          username: `customer_${country.code.toLowerCase()}_${j}`,
          email: `customer${j}@${country.code.toLowerCase()}.komarce.com`,
          password: hashedCustomerPassword,
          firstName: `Customer`,
          lastName: `${country.name} ${j}`,
          role: "customer",
          country: country.code
        });

        // Create customer profile with all required fields
        const uniqueAccountNumber = await storage.generateUniqueAccountNumber();
        const customerProfile = await storage.createCustomerProfile({
          userId: customerUser.id,
          uniqueAccountNumber,
          mobileNumber: `+${country.code === 'BD' ? '880' : country.code === 'MY' ? '60' : country.code === 'AE' ? '971' : '63'}${Math.floor(Math.random() * 1000000000)}`,
          email: customerUser.email,
          fullName: `${customerUser.firstName} ${customerUser.lastName}`,
          fathersName: `Father of ${customerUser.firstName}`,
          mothersName: `Mother of ${customerUser.firstName}`,
          nidNumber: `${country.code}${Math.floor(Math.random() * 1000000000)}`,
          bloodGroup: ['A+', 'B+', 'O+', 'AB+'][Math.floor(Math.random() * 4)],
          profileComplete: true,
          totalPointsEarned: Math.floor(Math.random() * 5000) + 1000,
          currentPointsBalance: Math.floor(Math.random() * 3000) + 500,
          tier: j === 1 ? 'gold' : j === 2 ? 'silver' : 'bronze',
          isActive: true
        });

        // Generate QR code for the customer
        const qrCode = await storage.generateCustomerQRCode(customerUser.id);

        // Create customer wallet
        await storage.createCustomerWallet({
          customerId: customerProfile.id,
          pointsBalance: customerProfile.currentPointsBalance,
          totalPointsEarned: customerProfile.totalPointsEarned,
          totalPointsSpent: Math.floor(Math.random() * 1000),
          totalPointsTransferred: Math.floor(Math.random() * 500)
        });

        // Also create the legacy customer record for backward compatibility
        const customer = await storage.createCustomer({
          userId: customerUser.id,
          totalPoints: customerProfile.currentPointsBalance,
          accumulatedPoints: customerProfile.totalPointsEarned
        });
        customers.push(customer);
      }
    }

    // Initialize loyalty system with wallets for all users
    console.log("💰 Creating loyalty wallets...");
    
    const allUsers = [...localAdmins, ...merchants.map(m => ({ id: m.userId, role: 'merchant' })), ...customers.map(c => ({ id: c.userId, role: 'customer' }))];
    for (const user of allUsers) {
      if (user.id) {
        // Create three wallets for each user
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'reward_points',
          balance: Math.floor(Math.random() * 2000).toString()
        });
        
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'income', 
          balance: Math.floor(Math.random() * 1000).toString()
        });
        
        await storage.createUserWallet({
          userId: user.id,
          walletType: 'commerce',
          balance: Math.floor(Math.random() * 500).toString()
        });
      }
    }

    // Create StepUp reward numbers for customers
    console.log("🎯 Creating StepUp reward numbers...");
    for (const customer of customers.slice(0, 10)) { // First 10 customers get reward numbers
      await storage.createStepUpRewardNumber({
        userId: customer.userId,
        type: Math.random() > 0.5 ? 'global' : 'local',
        rewardNumber: Math.floor(Math.random() * 1000000) + 100000,
        serialNumber: `RN${Math.floor(Math.random() * 1000000)}`
      });
    }

    // Create sample referrals
    console.log("🤝 Creating referral relationships...");
    for (let i = 0; i < 5; i++) {
      const referrer = customers[i];
      const referee = customers[i + 5];
      
      if (referrer && referee) {
        await storage.createReferral({
          referrerId: referrer.userId,
          refereeId: referee.userId,
          referralCode: `REF${referrer.userId.slice(-6).toUpperCase()}`,
          referralType: 'customer'
        });
      }
    }

    // Create sample point transactions
    console.log("💸 Creating sample transactions...");
    for (let i = 0; i < 20; i++) {
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      
      await storage.createPointTransaction({
        userId: randomCustomer.userId,
        points: Math.floor(Math.random() * 500) + 50,
        transactionType: ['cashback', 'referral_commission', 'admin_manual', 'purchase'][Math.floor(Math.random() * 4)],
        description: `Sample transaction ${i + 1}`,
        pointsSource: 'system'
      });
    }

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

    // Create leaderboard entries
    console.log("🏆 Creating leaderboard entries...");
    for (let i = 0; i < 10; i++) {
      const customer = customers[i];
      
      await storage.createLeaderboard({
        userId: customer.userId,
        userType: 'customer',
        leaderboardType: i < 5 ? 'global' : 'local',
        country: 'BD', // Default country for testing
        totalPoints: Math.floor(Math.random() * 10000) + 1000,
        rank: i + 1
      });
    }

    console.log("✅ Test data seeded successfully!");
    console.log(`Created:
    - 1 Global Admin (global@komarce.com / global123)
    - ${localAdmins.length} Local Admins (local123)
    - ${merchants.length} Merchants (merchant123)  
    - ${customers.length} Customers (customer123)
    - Loyalty wallets and reward numbers
    - Sample transactions and referrals
    - Admin settings and leaderboards`);
    
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