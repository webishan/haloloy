import 'dotenv/config';
import { db } from './db';
import { users, admins } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createAdminAccounts() {
  console.log('🔐 Creating missing local admin accounts...');
  
  try {
    // Check existing admins
    const existingUsers = await db.select().from(users).where(sql`role = 'local_admin'`);
    console.log(`📊 Found ${existingUsers.length} existing local admins`);
    
    // Hash password for admins
    const hashedPassword = await bcrypt.hash('local123', 10);
    
    // Create 4 local admin users (only if they don't exist)
    const localAdmins = [
      {
        username: 'local_admin_1',
        email: 'local1@komarce.com',
        password: hashedPassword,
        firstName: 'Local',
        lastName: 'Admin 1',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_2', 
        email: 'local2@komarce.com',
        password: hashedPassword,
        firstName: 'Local',
        lastName: 'Admin 2',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_3',
        email: 'local3@komarce.com', 
        password: hashedPassword,
        firstName: 'Local',
        lastName: 'Admin 3',
        role: 'local_admin',
        country: 'BD'
      },
      {
        username: 'local_admin_4',
        email: 'local4@komarce.com',
        password: hashedPassword,
        firstName: 'Local',
        lastName: 'Admin 4',
        role: 'local_admin',
        country: 'BD'
      }
    ];

    console.log('👥 Creating missing user accounts...');
    
    // Filter out existing usernames/emails
    const existingUsernames = existingUsers.map(u => u.username);
    const existingEmails = existingUsers.map(u => u.email);
    
    const newAdmins = localAdmins.filter(admin => 
      !existingUsernames.includes(admin.username) && 
      !existingEmails.includes(admin.email)
    );
    
    if (newAdmins.length === 0) {
      console.log('✅ All 4 local admin accounts already exist!');
      return;
    }
    
    console.log(`➕ Creating ${newAdmins.length} new local admin accounts...`);
    const insertedUsers = await db.insert(users).values(newAdmins).returning();
    
    console.log(`✅ Created ${insertedUsers.length} user accounts`);

    console.log('🔧 Creating admin profiles...');
    
    // Create admin profiles
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

    console.log('🎉 Admin accounts created successfully!');
    console.log('📋 Admin Login Credentials:');
    console.log('');
    console.log('🌍 Global Admin:');
    console.log('   Email: global@komarce.com');
    console.log('   Password: global123');
    console.log('');
    console.log('🏢 Local Admins (4 accounts):');
    console.log('   Email: local1@komarce.com | Password: local123');
    console.log('   Email: local2@komarce.com | Password: local123');
    console.log('   Email: local3@komarce.com | Password: local123');
    console.log('   Email: local4@komarce.com | Password: local123');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error creating admin accounts:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('create-admin-accounts.ts')) {
  createAdminAccounts()
    .then(() => {
      console.log('🎉 Admin accounts setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin accounts setup failed:', error);
      process.exit(1);
    });
}

export { createAdminAccounts };
