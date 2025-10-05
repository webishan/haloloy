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
    
    // Create 4 local admins
    const localAdmins = [
      {
        username: 'local_admin_1',
        email: 'local1@holyloy.com',
        password: localPassword,
        firstName: 'Local',
        lastName: 'Admin 1',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_2',
        email: 'local2@holyloy.com',
        password: localPassword,
        firstName: 'Local',
        lastName: 'Admin 2',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_3',
        email: 'local3@holyloy.com',
        password: localPassword,
        firstName: 'Local',
        lastName: 'Admin 3',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_4',
        email: 'local4@holyloy.com',
        password: localPassword,
        firstName: 'Local',
        lastName: 'Admin 4',
        role: 'local_admin',
        country: 'BD'
      }
    ];
    
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
    console.log('🏢 Local Admins (4 accounts):');
    console.log('   Email: local1@holyloy.com | Password: local123');
    console.log('   Email: local2@holyloy.com | Password: local123');
    console.log('   Email: local3@holyloy.com | Password: local123');
    console.log('   Email: local4@holyloy.com | Password: local123');
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
