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

// Function to remove all KOMARCE users
export async function removeKomarceUsers() {
  console.log("🗑️ Removing all KOMARCE users...");
  
  try {
    const allUsers = await storage.getAllUsers();
    const komarceUsers = allUsers.filter(user => user.email.includes('@komarce.com'));
    
    console.log(`Found ${komarceUsers.length} KOMARCE users to remove`);
    
    for (const user of komarceUsers) {
      console.log(`Removing KOMARCE user: ${user.email} (Role: ${user.role})`);
      
      // Remove admin profile if exists
      const adminProfile = Array.from((storage as any).admins?.values() || [])
        .find((admin: any) => admin.userId === user.id);
      if (adminProfile) {
        (storage as any).admins?.delete(adminProfile.id);
        console.log(`✅ Removed admin profile for: ${user.email}`);
      }
      
      // Remove user account
      await storage.deleteUser(user.id);
      console.log(`✅ Removed user account: ${user.email}`);
    }
    
    console.log(`✅ Successfully removed ${komarceUsers.length} KOMARCE users`);
  } catch (error) {
    console.error("Error removing KOMARCE users:", error);
  }
}

export async function seedTestData() {
  try {
    console.log("🌱 Seeding test data...");

    // Remove all KOMARCE users first
    await removeKomarceUsers();

    // Force refresh - clear existing data and reseed
    console.log("🔄 Force refreshing data - clearing existing merchants and customers...");

    // Create Global Admin
    const hashedGlobalPassword = await bcrypt.hash("global123", 10);
    const globalAdmin = await storage.createUser({
      username: "global_admin",
      email: "global@holyloy.com",
      password: hashedGlobalPassword,
      firstName: "Global",
      lastName: "Administrator",
      role: "global_admin",
      country: "US"
    });

    // Create Local Admins for different countries
    const localAdmins = [];
    const countries = [
      { code: "AE", name: "UAE", email: "ae@holyloy.com" },
      { code: "BD", name: "Bangladesh", email: "bd@holyloy.com" },
      { code: "MY", name: "Malaysia", email: "my@holyloy.com" },
      { code: "PH", name: "Philippines", email: "ph@holyloy.com" }
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

    // Generate unique merchant referral code
    const merchantReferralCode = await storage.generateMerchantReferralCode(merchantUser.id);

    // Create merchant profile
    const merchant = await storage.createMerchant({
      userId: merchantUser.id,
      businessName: "Ishan's Business",
      businessType: "retail",
      accountType: "merchant",
      tier: "merchant",
      referralId: `REF_${merchantUser.id.substring(0, 8).toUpperCase()}`,
      merchantReferralCode: merchantReferralCode,
      loyaltyPointsBalance: 0, // Start with 0 points
      availablePoints: 0,
      komarceBalance: "500.00"
    });

    // Create merchant wallets
    await storage.createUserWallet({
      userId: merchantUser.id,
      walletType: 'reward_points',
      balance: '0'
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

    // Create merchant wallet for the MerchantRewardSystem
    await storage.createMerchantWallet({
      merchantId: merchant.id,
      rewardPointBalance: 0,
      totalPointsIssued: 0,
      incomeWalletBalance: "0.00",
      cashbackIncome: "0.00",
      referralIncome: "0.00",
      royaltyIncome: "0.00",
      totalIncomeEarned: "0.00",
      totalIncomeWithdrawn: "0.00",
      komarceWalletBalance: "500.00",
      totalKomarceReceived: "0.00",
      totalKomarceWithdrawn: "0.00"
    });

    const merchants = [merchant];

    const customers = [];

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
      // Merchant cashback rate removed - will be rebuilt from scratch
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

    // Create demo products for marketplace
    console.log("🛍️ Creating demo products...");
    await createDemoProducts(merchant.id);

    // Create demo customers with points
    console.log("👥 Creating demo customers with points...");
    await createDemoCustomers();

    // Global Number system is ready for use
    console.log("🎯 Global Number system initialized and ready...");
    const serialResult = { assignedCount: 0 };
    
    console.log("✅ Test data seeded successfully!");
    console.log(`Created:
    - 1 Global Admin (global@komarce.com / global123)
    - ${localAdmins.length} Local Admins (local123)
    - 1 Persistent Merchant (tkhanishan@gmail.com / ishan007)
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

// Function to create demo products for the marketplace
async function createDemoProducts(merchantId: string) {
  try {
    console.log(`🛍️ Starting demo product creation for merchant: ${merchantId}`);
    
    // Get categories and brands
    const categories = await storage.getCategories();
    const brands = await storage.getBrands();
    
    console.log(`📂 Found ${categories.length} categories`);
    console.log(`🏷️ Found ${brands.length} brands`);
    
    // Find or create categories
    let electronicsCategory = categories.find(c => c.name === 'Electronics');
    let fashionCategory = categories.find(c => c.name === 'Fashion');
    let homeCategory = categories.find(c => c.name === 'Home & Garden');
    
    if (!electronicsCategory) {
      electronicsCategory = await storage.createCategory({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        icon: 'smartphone',
        isActive: true
      });
    }
    
    if (!fashionCategory) {
      fashionCategory = await storage.createCategory({
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing and accessories',
        icon: 'shirt',
        isActive: true
      });
    }
    
    if (!homeCategory) {
      homeCategory = await storage.createCategory({
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home and garden products',
        icon: 'home',
        isActive: true
      });
    }
    
    // Find or create brands
    let samsungBrand = brands.find(b => b.name === 'Samsung');
    let appleBrand = brands.find(b => b.name === 'Apple');
    let nikeBrand = brands.find(b => b.name === 'Nike');
    
    if (!samsungBrand) {
      samsungBrand = await storage.createBrand({
        name: 'Samsung',
        slug: 'samsung',
        description: 'Samsung Electronics',
        logo: 'https://logo.clearbit.com/samsung.com',
        isActive: true
      });
    }
    
    if (!appleBrand) {
      appleBrand = await storage.createBrand({
        name: 'Apple',
        slug: 'apple',
        description: 'Apple Inc.',
        logo: 'https://logo.clearbit.com/apple.com',
        isActive: true
      });
    }
    
    if (!nikeBrand) {
      nikeBrand = await storage.createBrand({
        name: 'Nike',
        slug: 'nike',
        description: 'Nike Inc.',
        logo: 'https://logo.clearbit.com/nike.com',
        isActive: true
      });
    }

    // Demo products with modern images
    const demoProducts = [
      {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        description: 'Premium smartphone with advanced AI features, titanium build, and S Pen support.',
        price: '1299.00',
        originalPrice: '1399.00',
        sku: 'SGS24U-256-TIT',
        stock: 50,
        images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: samsungBrand.id,
        merchantId,
        pointsReward: 129,
        rating: '4.8',
        reviewCount: 3247
      },
      {
        name: 'Apple iPhone 15 Pro',
        slug: 'apple-iphone-15-pro',
        description: 'Latest iPhone with titanium design, A17 Pro chip, and advanced camera system.',
        price: '999.00',
        originalPrice: '1099.00',
        sku: 'IP15P-256-TIT',
        stock: 75,
        images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: appleBrand.id,
        merchantId,
        pointsReward: 99,
        rating: '4.9',
        reviewCount: 2891
      },
      {
        name: 'Samsung Galaxy Buds Pro 2',
        slug: 'samsung-galaxy-buds-pro-2',
        description: 'Premium wireless earbuds with active noise cancellation and 360 audio.',
        price: '229.00',
        originalPrice: '279.00',
        sku: 'SGBP2-WHT',
        stock: 120,
        images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: samsungBrand.id,
        merchantId,
        pointsReward: 22,
        rating: '4.7',
        reviewCount: 1456
      },
      {
        name: 'Apple AirPods Pro (2nd Gen)',
        slug: 'apple-airpods-pro-2nd-gen',
        description: 'Advanced wireless earbuds with H2 chip and enhanced noise cancellation.',
        price: '249.00',
        originalPrice: '279.00',
        sku: 'APP2-WHT',
        stock: 95,
        images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: appleBrand.id,
        merchantId,
        pointsReward: 24,
        rating: '4.8',
        reviewCount: 2189
      },
      {
        name: 'Nike Air Max 270',
        slug: 'nike-air-max-270',
        description: 'Comfortable running shoes with Max Air cushioning and breathable mesh upper.',
        price: '150.00',
        originalPrice: '180.00',
        sku: 'NAM270-BLK-10',
        stock: 200,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&crop=center'],
        categoryId: fashionCategory.id,
        brandId: nikeBrand.id,
        merchantId,
        pointsReward: 15,
        rating: '4.6',
        reviewCount: 3421
      },
      {
        name: 'Nike Dri-FIT T-Shirt',
        slug: 'nike-dri-fit-t-shirt',
        description: 'Moisture-wicking performance t-shirt for sports and casual wear.',
        price: '35.00',
        originalPrice: '45.00',
        sku: 'NDFT-BLK-M',
        stock: 300,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center'],
        categoryId: fashionCategory.id,
        brandId: nikeBrand.id,
        merchantId,
        pointsReward: 3,
        rating: '4.4',
        reviewCount: 892
      },
      {
        name: 'Smart Home Security Camera',
        slug: 'smart-home-security-camera',
        description: '4K wireless security camera with night vision and mobile app control.',
        price: '89.99',
        originalPrice: '119.99',
        sku: 'SHSC-4K-WHT',
        stock: 80,
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: samsungBrand.id,
        merchantId,
        pointsReward: 8,
        rating: '4.5',
        reviewCount: 567
      },
      {
        name: 'Wireless Charging Pad',
        slug: 'wireless-charging-pad',
        description: 'Fast wireless charging pad compatible with all Qi-enabled devices.',
        price: '29.99',
        originalPrice: '39.99',
        sku: 'WCP-QI-BLK',
        stock: 150,
        images: ['https://images.unsplash.com/photo-1609592809090-6c7c4e4a4b8e?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: appleBrand.id,
        merchantId,
        pointsReward: 2,
        rating: '4.3',
        reviewCount: 1234
      },
      {
        name: 'Smart Fitness Tracker',
        slug: 'smart-fitness-tracker',
        description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
        price: '199.00',
        originalPrice: '249.00',
        sku: 'SFT-HR-GPS-BLK',
        stock: 60,
        images: ['https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: samsungBrand.id,
        merchantId,
        pointsReward: 19,
        rating: '4.7',
        reviewCount: 1789
      },
      {
        name: 'Bluetooth Speaker',
        slug: 'bluetooth-speaker',
        description: 'Portable Bluetooth speaker with 360-degree sound and waterproof design.',
        price: '79.99',
        originalPrice: '99.99',
        sku: 'BTS-360-WP-BLU',
        stock: 100,
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: appleBrand.id,
        merchantId,
        pointsReward: 7,
        rating: '4.6',
        reviewCount: 945
      },
      {
        name: 'Gaming Mechanical Keyboard',
        slug: 'gaming-mechanical-keyboard',
        description: 'RGB mechanical gaming keyboard with customizable lighting and tactile switches.',
        price: '129.99',
        originalPrice: '159.99',
        sku: 'GMK-RGB-BLK',
        stock: 45,
        images: ['https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=400&fit=crop&crop=center'],
        categoryId: electronicsCategory.id,
        brandId: samsungBrand.id,
        merchantId,
        pointsReward: 12,
        rating: '4.8',
        reviewCount: 2341
      },
      {
        name: 'Smart LED Strip Lights',
        slug: 'smart-led-strip-lights',
        description: 'WiFi-enabled LED strip lights with app control and millions of colors.',
        price: '39.99',
        originalPrice: '59.99',
        sku: 'SLED-WIFI-5M',
        stock: 120,
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center'],
        categoryId: homeCategory.id,
        brandId: appleBrand.id,
        merchantId,
        pointsReward: 3,
        rating: '4.4',
        reviewCount: 678
      }
    ];

    // Create each demo product
    console.log(`🚀 Creating ${demoProducts.length} demo products...`);
    for (const productData of demoProducts) {
      try {
        const createdProduct = await storage.createProduct(productData);
        console.log(`✅ Created product: ${productData.name} (ID: ${createdProduct.id})`);
      } catch (productError) {
        console.error(`❌ Failed to create product ${productData.name}:`, productError);
      }
    }

    console.log(`✅ Successfully created ${demoProducts.length} demo products`);
  } catch (error) {
    console.error("❌ Error creating demo products:", error);
    throw error;
  }
}

// Function to create demo customers with points
async function createDemoCustomers() {
  try {
    const demoCustomers = [
      {
        username: "john_doe",
        email: "john.doe@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: "customer" as const,
        country: "AE",
        phone: "+971501234567",
        points: 2500 // Give 2500 points
      },
      {
        username: "sarah_smith",
        email: "sarah.smith@example.com", 
        password: "password123",
        firstName: "Sarah",
        lastName: "Smith",
        role: "customer" as const,
        country: "AE",
        phone: "+971502345678",
        points: 1800 // Give 1800 points
      },
      {
        username: "mike_wilson",
        email: "mike.wilson@example.com",
        password: "password123", 
        firstName: "Mike",
        lastName: "Wilson",
        role: "customer" as const,
        country: "AE",
        phone: "+971503456789",
        points: 3200 // Give 3200 points
      }
    ];

    for (const customerData of demoCustomers) {
      // Create user account
      const hashedPassword = await bcrypt.hash(customerData.password, 10);
      const user = await storage.createUser({
        username: customerData.username,
        email: customerData.email,
        password: hashedPassword,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        role: customerData.role,
        country: customerData.country,
        phone: customerData.phone
      });

      // Generate unique account number
      const uniqueAccountNumber = await storage.generateUniqueAccountNumber();

      // Create customer profile
      await storage.createCustomerProfile({
        userId: user.id,
        uniqueAccountNumber,
        mobileNumber: customerData.phone,
        email: customerData.email,
        fullName: `${customerData.firstName} ${customerData.lastName}`,
        profileComplete: true,
        totalPointsEarned: customerData.points,
        currentPointsBalance: customerData.points,
        accumulatedPoints: customerData.points,
        globalSerialNumber: 0,
        localSerialNumber: 0,
        tier: "bronze",
        isActive: true
      });

      // Create customer wallets with points
      await storage.createCustomerWallet({
        customerId: user.id,
        rewardPointBalance: customerData.points,
        totalRewardPointsEarned: customerData.points,
        totalRewardPointsSpent: 0,
        totalRewardPointsTransferred: 0,
        incomeBalance: "0.00",
        totalIncomeEarned: "0.00",
        totalIncomeSpent: "0.00",
        totalIncomeTransferred: "0.00",
        commerceBalance: "0.00",
        totalCommerceAdded: "0.00",
        totalCommerceSpent: "0.00",
        totalCommerceWithdrawn: "0.00"
      });

      console.log(`✅ Created customer: ${customerData.firstName} ${customerData.lastName} with ${customerData.points} points`);
    }

    console.log(`✅ Successfully created ${demoCustomers.length} demo customers with points`);
  } catch (error) {
    console.error("❌ Error creating demo customers:", error);
    throw error;
  }
}