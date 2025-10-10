import 'dotenv/config';
import { db } from './db';
import { users, admins, pointDistributions } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function verifyDatabaseConnection() {
  console.log('🔍 Verifying database connection and data...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful');
    
    // Check users table
    console.log('\n👥 Checking users table...');
    const allUsers = await db.select().from(users);
    console.log(`📊 Found ${allUsers.length} users in database`);
    
    // Check admins table
    console.log('\n🔐 Checking admins table...');
    const allAdmins = await db.select().from(admins);
    console.log(`📊 Found ${allAdmins.length} admins in database`);
    
    // Check point distributions table
    console.log('\n💰 Checking point distributions table...');
    const allDistributions = await db.select().from(pointDistributions);
    console.log(`📊 Found ${allDistributions.length} point distributions in database`);
    
    // Show local admin details
    console.log('\n🏢 Local Admin Details:');
    const localAdmins = allAdmins.filter(admin => admin.adminType === 'local');
    localAdmins.forEach(admin => {
      console.log(`   - User ID: ${admin.userId}`);
      console.log(`     Country: ${admin.country}`);
      console.log(`     Points Balance: ${admin.pointsBalance || 0}`);
      console.log(`     Total Received: ${admin.totalPointsReceived || 0}`);
      console.log(`     Total Distributed: ${admin.totalPointsDistributed || 0}`);
      console.log('');
    });
    
    // Show point distributions
    if (allDistributions.length > 0) {
      console.log('📋 Point Distributions:');
      allDistributions.forEach((dist, index) => {
        console.log(`   ${index + 1}. From: ${dist.fromUserId} → To: ${dist.toUserId}`);
        console.log(`      Points: ${dist.points}, Description: ${dist.description}`);
        console.log(`      Created: ${dist.createdAt}`);
        console.log('');
      });
    }
    
    // Check for India admin specifically
    console.log('🇮🇳 Checking India admin specifically...');
    const indiaAdmin = localAdmins.find(admin => admin.country === 'IN');
    if (indiaAdmin) {
      console.log('✅ India admin found!');
      console.log(`   User ID: ${indiaAdmin.userId}`);
      console.log(`   Points Balance: ${indiaAdmin.pointsBalance || 0}`);
      
      // Get India admin's distributions
      const indiaDistributions = allDistributions.filter(dist => 
        dist.fromUserId === indiaAdmin.userId || dist.toUserId === indiaAdmin.userId
      );
      console.log(`   Point Distributions: ${indiaDistributions.length}`);
      
      indiaDistributions.forEach((dist, index) => {
        const type = dist.toUserId === indiaAdmin.userId ? 'Credit' : 'Debit';
        console.log(`     ${index + 1}. ${type}: ${dist.points} points`);
        console.log(`        Description: ${dist.description}`);
      });
    } else {
      console.log('❌ India admin not found!');
    }
    
    console.log('\n✅ Database verification completed!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('verify-database-connection.ts')) {
  verifyDatabaseConnection()
    .then(() => {
      console.log('🎉 Database verification completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database verification failed:', error);
      process.exit(1);
    });
}

export { verifyDatabaseConnection };
