import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins, users } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

async function testTransactionFiltering() {
  console.log('🧪 Testing Transaction History Filtering...');
  
  try {
    // Find India local admin
    const indiaUsers = await db.select().from(users).where(eq(users.country, 'IN'));
    const indiaLocalAdmin = indiaUsers.find(user => user.role === 'local_admin');
    
    if (!indiaLocalAdmin) {
      console.log('❌ India local admin not found');
      return;
    }
    
    console.log(`✅ Found India Local Admin: ${indiaLocalAdmin.id} (${indiaLocalAdmin.email})`);
    
    // Find global admin
    const globalAdmins = await db.select().from(users).where(eq(users.role, 'global_admin'));
    const globalAdmin = globalAdmins[0];
    
    if (!globalAdmin) {
      console.log('❌ Global admin not found');
      return;
    }
    
    console.log(`✅ Found Global Admin: ${globalAdmin.id} (${globalAdmin.email})`);
    
    // Create a test point distribution from global admin to India local admin
    console.log('\n📤 Creating test point distribution...');
    const testDistribution = {
      fromUserId: globalAdmin.id,
      toUserId: indiaLocalAdmin.id,
      points: 50000,
      description: 'Test distribution - 50,000 points',
      distributionType: 'admin_distribution',
      status: 'completed'
    };
    
    const newDistribution = await db.insert(pointDistributions).values(testDistribution).returning();
    console.log(`✅ Created distribution: ${newDistribution[0].id}`);
    
    // Update India admin balance
    const indiaAdmin = await db.select().from(admins).where(eq(admins.userId, indiaLocalAdmin.id)).limit(1);
    if (indiaAdmin[0]) {
      const newBalance = (indiaAdmin[0].pointsBalance || 0) + 50000;
      await db.update(admins)
        .set({
          pointsBalance: newBalance,
          totalPointsReceived: (indiaAdmin[0].totalPointsReceived || 0) + 50000
        })
        .where(eq(admins.userId, indiaLocalAdmin.id));
      console.log(`✅ Updated India admin balance to: ${newBalance}`);
    }
    
    // Update global admin balance
    const globalAdminProfile = await db.select().from(admins).where(eq(admins.userId, globalAdmin.id)).limit(1);
    if (globalAdminProfile[0]) {
      const newBalance = (globalAdminProfile[0].pointsBalance || 0) - 50000;
      await db.update(admins)
        .set({
          pointsBalance: newBalance,
          totalPointsDistributed: (globalAdminProfile[0].totalPointsDistributed || 0) + 50000
        })
        .where(eq(admins.userId, globalAdmin.id));
      console.log(`✅ Updated global admin balance to: ${newBalance}`);
    }
    
    // Test the new filtering logic
    console.log('\n🔍 Testing new filtering logic...');
    
    // Get distributions using the new filtering logic
    const filteredDistributions = await db.select().from(pointDistributions).where(
      sql`(
        (${pointDistributions.toUserId} = ${indiaLocalAdmin.id} AND ${pointDistributions.fromUserId} != ${indiaLocalAdmin.id} AND ${pointDistributions.fromUserId} != 'system') OR
        (${pointDistributions.fromUserId} = ${indiaLocalAdmin.id} AND ${pointDistributions.toUserId} != ${indiaLocalAdmin.id} AND ${pointDistributions.toUserId} != 'system')
      ) AND ${pointDistributions.distributionType} != 'point_generation'`
    );
    
    console.log(`📊 Filtered distributions for India admin: ${filteredDistributions.length}`);
    
    filteredDistributions.forEach((dist, index) => {
      const isCredit = dist.toUserId === indiaLocalAdmin.id;
      const amount = isCredit ? `+${dist.points}` : `-${dist.points}`;
      const type = isCredit ? 'CREDIT' : 'DEBIT';
      console.log(`   ${index + 1}. ${type}: ${amount} points (${dist.description})`);
      console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log('');
    });
    
    // Calculate totals
    const totalCredits = filteredDistributions
      .filter(d => d.toUserId === indiaLocalAdmin.id)
      .reduce((sum, d) => sum + d.points, 0);
    
    const totalDebits = filteredDistributions
      .filter(d => d.fromUserId === indiaLocalAdmin.id)
      .reduce((sum, d) => sum + d.points, 0);
    
    console.log('📊 Summary:');
    console.log(`   Total Credits: ${totalCredits}`);
    console.log(`   Total Debits: ${totalDebits}`);
    console.log(`   Net Balance: ${totalCredits - totalDebits}`);
    
    // Verify this matches what the API should return
    console.log('\n🌐 Testing API endpoint simulation...');
    
    // Simulate the API call logic
    const apiDistributions = await db.select().from(pointDistributions).where(
      sql`(
        (${pointDistributions.toUserId} = ${indiaLocalAdmin.id} AND ${pointDistributions.fromUserId} != ${indiaLocalAdmin.id} AND ${pointDistributions.fromUserId} != 'system') OR
        (${pointDistributions.fromUserId} = ${indiaLocalAdmin.id} AND ${pointDistributions.toUserId} != ${indiaLocalAdmin.id} AND ${pointDistributions.toUserId} != 'system')
      ) AND ${pointDistributions.distributionType} != 'point_generation'`
    );
    
    const sortedDistributions = apiDistributions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const calculatedTotalCredits = sortedDistributions
      .filter(d => d.toUserId === indiaLocalAdmin.id)
      .reduce((sum, d) => sum + d.points, 0);
    
    const calculatedTotalDebits = sortedDistributions
      .filter(d => d.fromUserId === indiaLocalAdmin.id)
      .reduce((sum, d) => sum + d.points, 0);
    
    console.log(`✅ API would return ${sortedDistributions.length} transactions`);
    console.log(`✅ API Total Credits: ${calculatedTotalCredits}`);
    console.log(`✅ API Total Debits: ${calculatedTotalDebits}`);
    
    if (calculatedTotalCredits === 50000 && calculatedTotalDebits === 0) {
      console.log('🎉 SUCCESS! Transaction filtering is working correctly!');
      console.log('✅ Only shows the 50,000 credit transaction');
      console.log('✅ No extra transactions from point generation');
      console.log('✅ No system transactions');
    } else {
      console.log('❌ FAILED! Transaction filtering is not working correctly');
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(pointDistributions).where(sql`id = ${newDistribution[0].id}`);
    
    // Restore original balances
    if (indiaAdmin[0]) {
      await db.update(admins)
        .set({
          pointsBalance: indiaAdmin[0].pointsBalance || 0,
          totalPointsReceived: indiaAdmin[0].totalPointsReceived || 0
        })
        .where(eq(admins.userId, indiaLocalAdmin.id));
    }
    
    if (globalAdminProfile[0]) {
      await db.update(admins)
        .set({
          pointsBalance: globalAdminProfile[0].pointsBalance || 0,
          totalPointsDistributed: globalAdminProfile[0].totalPointsDistributed || 0
        })
        .where(eq(admins.userId, globalAdmin.id));
    }
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('test-transaction-filtering.ts')) {
  testTransactionFiltering()
    .then(() => {
      console.log('🎉 Transaction filtering test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Transaction filtering test failed:', error);
      process.exit(1);
    });
}

export { testTransactionFiltering };
