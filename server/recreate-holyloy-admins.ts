import 'dotenv/config';
import { db } from './db';
import { users, admins } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function recreateHolyloyAdmins() {
  console.log('🔄 Recreating admin accounts with Holyloy emails...');
  
  try {
    // Step 1: Remove all existing admin users
    console.log('🗑️ Removing all existing admin accounts...');
    
    const existingAdmins = await db.select().from(users).where(sql`role IN ('global_admin', 'local_admin')`);
    console.log(`📊 Found ${existingAdmins.length} existing admin accounts to remove`);
    
    // Remove admin profiles first
    for (const admin of existingAdmins) {
      await db.delete(admins).where(sql`user_id = ${admin.id}`);
    }
    
    // Remove admin users
    await db.delete(users).where(sql`role IN ('global_admin', 'local_admin')`);
    
    console.log('✅ All existing admin accounts removed');
    
    // Step 2: Create new Holyloy admin accounts
    console.log('🔐 Creating new Holyloy admin accounts...');
    
    // Hash passwords
    const globalPassword = await bcrypt.hash('holyloy123', 10);
    const localPassword = await bcrypt.hash('local123', 10);
    
    // Create global admin
    const globalAdmin = {
      username: 'global_admin',
      email: 'global@holyloy.com',
      password: globalPassword,
      firstName: 'Global',
      lastName: 'Admin',
      role: 'global_admin',
      country: 'BD'
    };
    
    // Create 17 local admins for different countries
    const countries = [
      // Africa
      { code: "KE", name: "Kenya", email: "ke@holyloy.com" },
      { code: "MU", name: "Mauritius", email: "mu@holyloy.com" },
      { code: "RW", name: "Rwanda", email: "rw@holyloy.com" },
      { code: "UG", name: "Uganda", email: "ug@holyloy.com" },
      
      // Asia & Middle East
      { code: "BH", name: "Bahrain", email: "bh@holyloy.com" },
      { code: "BD", name: "Bangladesh", email: "bd@holyloy.com" },
      { code: "IN", name: "India", email: "in@holyloy.com" },
      { code: "ID", name: "Indonesia", email: "id@holyloy.com" },
      { code: "MY", name: "Malaysia", email: "my@holyloy.com" },
      { code: "PK", name: "Pakistan", email: "pk@holyloy.com" },
      { code: "PH", name: "Philippines", email: "ph@holyloy.com" },
      { code: "QA", name: "Qatar", email: "qa@holyloy.com" },
      { code: "SG", name: "Singapore", email: "sg@holyloy.com" },
      { code: "LK", name: "Sri Lanka", email: "lk@holyloy.com" },
      { code: "TH", name: "Thailand", email: "th@holyloy.com" },
      { code: "TR", name: "Turkey", email: "tr@holyloy.com" },
      { code: "AE", name: "UAE", email: "ae@holyloy.com" }
    ];

    const localAdmins = countries.map(country => ({
      username: `local_admin_${country.code.toLowerCase()}`,
      email: country.email,
      password: localPassword,
      firstName: country.name,
      lastName: 'Admin',
      role: 'local_admin',
      country: country.code
    }));
    
    // Insert all users
    const allUsers = [globalAdmin, ...localAdmins];
    const insertedUsers = await db.insert(users).values(allUsers).returning();
    
    console.log(`✅ Created ${insertedUsers.length} new admin user accounts`);
    
    // Step 3: Create admin profiles
    console.log('🔧 Creating admin profiles...');
    
    const adminProfiles = insertedUsers.map(user => ({
      userId: user.id,
      adminType: user.role === 'global_admin' ? 'global' : 'local',
      country: user.country,
      pointsBalance: 0,
      totalPointsReceived: 0,
      totalPointsDistributed: 0,
      permissions: [],
      isActive: true
    }));
    
    const insertedAdmins = await db.insert(admins).values(adminProfiles).returning();
    
    console.log(`✅ Created ${insertedAdmins.length} admin profiles`);
    
    // Step 4: Verify final accounts
    const finalGlobalAdmins = await db.select().from(users).where(sql`role = 'global_admin'`);
    const finalLocalAdmins = await db.select().from(users).where(sql`role = 'local_admin'`);
    
    console.log('🎉 Holyloy admin accounts created successfully!');
    console.log('');
    console.log('📋 New Holyloy Admin Login Credentials:');
    console.log('');
    console.log('🌍 Global Admin:');
    console.log('   Email: global@holyloy.com');
    console.log('   Password: holyloy123');
    console.log('');
    console.log('🏢 Local Admins (17 countries):');
    countries.forEach(country => {
      console.log(`   ${country.name}: ${country.email} | Password: local123`);
    });
    console.log('');
    console.log(`✅ Verification: ${finalGlobalAdmins.length} global admin, ${finalLocalAdmins.length} local admins`);
    
  } catch (error) {
    console.error('❌ Error recreating Holyloy admin accounts:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('recreate-holyloy-admins.ts')) {
  recreateHolyloyAdmins()
    .then(() => {
      console.log('🎉 Holyloy admin recreation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Holyloy admin recreation failed:', error);
      process.exit(1);
    });
}

export { recreateHolyloyAdmins };
