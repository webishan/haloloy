import 'dotenv/config';
import { db } from './db';
import { users, admins } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function cleanupAdmins() {
  console.log('🧹 Cleaning up admin accounts to keep exactly 4 local admins...');
  
  try {
    // Get all local admin users
    const localAdmins = await db.select().from(users).where(eq(users.role, 'local_admin'));
    
    console.log(`📊 Found ${localAdmins.length} local admin users`);
    
    if (localAdmins.length <= 4) {
      console.log('✅ Already have 4 or fewer local admins. No cleanup needed.');
      return;
    }
    
    // Keep the 4 newest ones (local1-4) and remove the older ones
    const keepAdmins = localAdmins.filter(admin => 
      admin.username.startsWith('local_admin_') && 
      ['local_admin_1', 'local_admin_2', 'local_admin_3', 'local_admin_4'].includes(admin.username)
    );
    
    const removeAdmins = localAdmins.filter(admin => 
      !['local_admin_1', 'local_admin_2', 'local_admin_3', 'local_admin_4'].includes(admin.username)
    );
    
    console.log(`✅ Keeping ${keepAdmins.length} local admins`);
    console.log(`🗑️ Removing ${removeAdmins.length} extra local admins`);
    
    // Remove extra admins
    for (const admin of removeAdmins) {
      console.log(`   Removing: ${admin.email} (${admin.username})`);
      
      // Remove admin profile first
      await db.delete(admins).where(eq(admins.userId, admin.id));
      
      // Then remove user
      await db.delete(users).where(eq(users.id, admin.id));
    }
    
    console.log('✅ Cleanup completed successfully!');
    
    // Verify final count
    const finalLocalAdmins = await db.select().from(users).where(eq(users.role, 'local_admin'));
    console.log(`📊 Final count: ${finalLocalAdmins.length} local admins`);
    
    console.log('');
    console.log('📋 Final Admin Login Credentials:');
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
    
  } catch (error) {
    console.error('❌ Error during admin cleanup:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('cleanup-admins.ts')) {
  cleanupAdmins()
    .then(() => {
      console.log('🎉 Admin cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupAdmins };
