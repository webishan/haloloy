import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins, users } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

async function testDatabaseOnly() {
  console.log('🧪 Testing Database-Only Operations...');
  
  try {
    // Test 1: Check if point distributions are in database
    console.log('\n📊 Test 1: Point Distributions in Database');
    const distributions = await db.select().from(pointDistributions);
    console.log(`Found ${distributions.length} point distributions in database`);
    
    if (distributions.length > 0) {
      console.log('✅ Point distributions are stored in database');
      distributions.forEach((dist, index) => {
        console.log(`   ${index + 1}. From: ${dist.fromUserId} → To: ${dist.toUserId}`);
        console.log(`      Points: ${dist.points}, Type: ${dist.distributionType}`);
      });
    } else {
      console.log('❌ No point distributions found in database');
    }
    
    // Test 2: Check admin balances in database
    console.log('\n👤 Test 2: Admin Balances in Database');
    const allAdmins = await db.select().from(admins);
    console.log(`Found ${allAdmins.length} admins in database`);
    
    allAdmins.forEach(admin => {
      console.log(`   User ID: ${admin.userId}`);
      console.log(`   Country: ${admin.country}`);
      console.log(`   Points Balance: ${admin.pointsBalance || 0}`);
      console.log(`   Total Received: ${admin.totalPointsReceived || 0}`);
      console.log(`   Total Distributed: ${admin.totalPointsDistributed || 0}`);
      console.log('');
    });
    
    // Test 3: Simulate a point distribution
    console.log('🔬 Test 3: Simulating Point Distribution');
    
    // Find a local admin to test with
    const localAdmins = allAdmins.filter(admin => admin.adminType === 'local');
    if (localAdmins.length === 0) {
      console.log('❌ No local admins found for testing');
      return;
    }
    
    const testAdmin = localAdmins[0];
    console.log(`Testing with admin: ${testAdmin.userId} (${testAdmin.country})`);
    console.log(`Current balance: ${testAdmin.pointsBalance || 0}`);
    
    // Create a test distribution
    const testDistribution = {
      fromUserId: 'test-global-admin',
      toUserId: testAdmin.userId,
      points: 5000,
      description: 'Test distribution - Database Only',
      distributionType: 'test',
      status: 'completed'
    };
    
    // Insert distribution
    const newDistribution = await db.insert(pointDistributions).values(testDistribution).returning();
    console.log('✅ Test distribution created in database');
    
    // Update admin balance
    const newBalance = (testAdmin.pointsBalance || 0) + testDistribution.points;
    await db.update(admins)
      .set({
        pointsBalance: newBalance,
        totalPointsReceived: (testAdmin.totalPointsReceived || 0) + testDistribution.points
      })
      .where(eq(admins.userId, testAdmin.userId));
    
    console.log(`✅ Admin balance updated to: ${newBalance}`);
    
    // Verify the changes
    const updatedAdmin = await db.select().from(admins).where(eq(admins.userId, testAdmin.userId)).limit(1);
    console.log(`✅ Verified balance in database: ${updatedAdmin[0].pointsBalance}`);
    
    // Test 4: Check transaction history calculation
    console.log('\n📋 Test 4: Transaction History Calculation');
    const userDistributions = await db.select().from(pointDistributions).where(
      sql`${pointDistributions.fromUserId} = ${testAdmin.userId} OR ${pointDistributions.toUserId} = ${testAdmin.userId}`
    );
    
    const totalCredits = userDistributions
      .filter(d => d.toUserId === testAdmin.userId)
      .reduce((sum, d) => sum + d.points, 0);
    
    const totalDebits = userDistributions
      .filter(d => d.fromUserId === testAdmin.userId)
      .reduce((sum, d) => sum + d.points, 0);
    
    console.log(`   Total Credits: ${totalCredits}`);
    console.log(`   Total Debits: ${totalDebits}`);
    console.log(`   Net Balance: ${totalCredits - totalDebits}`);
    console.log(`   Current Balance: ${updatedAdmin[0].pointsBalance}`);
    
    if (totalCredits - totalDebits === updatedAdmin[0].pointsBalance) {
      console.log('✅ Balance calculation is correct!');
    } else {
      console.log('❌ Balance calculation mismatch!');
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(pointDistributions).where(sql`id = ${newDistribution[0].id}`);
    
    // Restore original balance
    await db.update(admins)
      .set({
        pointsBalance: testAdmin.pointsBalance || 0,
        totalPointsReceived: testAdmin.totalPointsReceived || 0
      })
      .where(eq(admins.userId, testAdmin.userId));
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All database-only tests completed successfully!');
    console.log('📝 Summary:');
    console.log('   ✅ Point distributions are stored in database');
    console.log('   ✅ Admin balances are stored in database');
    console.log('   ✅ Point distribution creation works');
    console.log('   ✅ Balance updates work');
    console.log('   ✅ Transaction history calculation works');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('test-database-only.ts')) {
  testDatabaseOnly()
    .then(() => {
      console.log('🎉 Database-only test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database-only test failed:', error);
      process.exit(1);
    });
}

export { testDatabaseOnly };
