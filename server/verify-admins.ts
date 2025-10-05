import 'dotenv/config';
import { db } from './db';
import { users, admins } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function verifyAdminAccounts() {
  console.log('🔍 Verifying admin accounts...');
  
  try {
    // Get all admin users
    const adminUsers = await db.select().from(users).where(sql`role IN ('global_admin', 'local_admin')`);
    
    console.log(`📊 Found ${adminUsers.length} admin users:`);
    console.log('');
    
    // Group by role
    const globalAdmins = adminUsers.filter(u => u.role === 'global_admin');
    const localAdmins = adminUsers.filter(u => u.role === 'local_admin');
    
    console.log(`🌍 Global Admins (${globalAdmins.length}):`);
    globalAdmins.forEach(admin => {
      console.log(`   ✅ ${admin.email} (${admin.username})`);
    });
    
    console.log('');
    console.log(`🏢 Local Admins (${localAdmins.length}):`);
    localAdmins.forEach(admin => {
      console.log(`   ✅ ${admin.email} (${admin.username})`);
    });
    
    // Get admin profiles
    const adminProfiles = await db.select().from(admins);
    console.log('');
    console.log(`🔧 Admin Profiles: ${adminProfiles.length}`);
    
    console.log('');
    console.log('📋 Complete Login Credentials:');
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
    
    if (localAdmins.length === 4) {
      console.log('✅ Perfect! You now have 4 local admin accounts as requested!');
    } else {
      console.log(`⚠️ Expected 4 local admins, but found ${localAdmins.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin accounts:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('verify-admins.ts')) {
  verifyAdminAccounts()
    .then(() => {
      console.log('🎉 Admin verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin verification failed:', error);
      process.exit(1);
    });
}

export { verifyAdminAccounts };
