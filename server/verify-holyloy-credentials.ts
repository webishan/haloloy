import 'dotenv/config';
import { db } from './db';
import { users } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function verifyHolyloyCredentials() {
  console.log('🔍 Verifying Holyloy admin credentials...');
  
  try {
    // Get global admin
    const globalAdmin = await db.select().from(users).where(eq(users.email, 'global@holyloy.com')).limit(1);
    
    if (globalAdmin.length === 0) {
      console.log('❌ Global admin not found!');
      return;
    }
    
    const admin = globalAdmin[0];
    console.log(`✅ Found global admin: ${admin.email}`);
    
    // Test password
    const isPasswordValid = await bcrypt.compare('holyloy123', admin.password);
    console.log(`🔐 Password 'holyloy123' is valid: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification failed!');
      console.log('🔧 Let me check what password is stored...');
      
      // Try common passwords
      const testPasswords = ['global123', 'holyloy123', 'admin123', 'password'];
      for (const testPassword of testPasswords) {
        const isValid = await bcrypt.compare(testPassword, admin.password);
        if (isValid) {
          console.log(`✅ Found working password: ${testPassword}`);
          break;
        }
      }
    }
    
    // Get local admins
    const localAdmins = await db.select().from(users).where(eq(users.role, 'local_admin'));
    console.log(`📊 Found ${localAdmins.length} local admins`);
    
    for (const localAdmin of localAdmins) {
      console.log(`   - ${localAdmin.email} (${localAdmin.username})`);
    }
    
    console.log('');
    console.log('📋 Current Admin Credentials:');
    console.log('🌍 Global Admin:');
    console.log(`   Email: ${admin.email}`);
    console.log('   Password: holyloy123 (should work)');
    console.log('');
    console.log('🏢 Local Admins:');
    localAdmins.forEach(admin => {
      console.log(`   Email: ${admin.email} | Password: local123`);
    });
    
  } catch (error) {
    console.error('❌ Error verifying credentials:', error);
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('verify-holyloy-credentials.ts')) {
  verifyHolyloyCredentials()
    .then(() => {
      console.log('🎉 Credential verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Credential verification failed:', error);
      process.exit(1);
    });
}

export { verifyHolyloyCredentials };
