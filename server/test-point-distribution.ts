import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function testPointDistribution() {
  console.log('🧪 Testing Point Distribution System...');
  
  try {
    // Check current point distributions
    console.log('📊 Current Point Distributions:');
    const allDistributions = await db.select().from(pointDistributions);
    console.log(`Found ${allDistributions.length} distributions in database`);
    
    allDistributions.forEach((dist, index) => {
      console.log(`   ${index + 1}. ID: ${dist.id}`);
      console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Points: ${dist.points}`);
      console.log(`      Description: ${dist.description}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log(`      Created: ${dist.createdAt}`);
      console.log('');
    });
    
    // Check admin balances
    console.log('👤 Admin Balances:');
    const allAdmins = await db.select().from(admins);
    allAdmins.forEach(admin => {
      console.log(`   User ID: ${admin.userId}`);
      console.log(`   Country: ${admin.country}`);
      console.log(`   Points Balance: ${admin.pointsBalance || 0}`);
      console.log(`   Total Received: ${admin.totalPointsReceived || 0}`);
      console.log(`   Total Distributed: ${admin.totalPointsDistributed || 0}`);
      console.log('');
    });
    
    // Test creating a new distribution
    console.log('🔬 Testing new distribution creation...');
    const testDistribution = {
      fromUserId: 'test-global-admin',
      toUserId: 'test-local-admin',
      points: 1000,
      description: 'Test distribution',
      distributionType: 'test',
      status: 'completed'
    };
    
    const newDistribution = await db.insert(pointDistributions).values(testDistribution).returning();
    console.log('✅ Test distribution created successfully:');
    console.log(`   ID: ${newDistribution[0].id}`);
    console.log(`   Points: ${newDistribution[0].points}`);
    
    // Verify it was saved
    const verifyDistribution = await db.select().from(pointDistributions)
      .where(sql`id = ${newDistribution[0].id}`);
    
    if (verifyDistribution.length > 0) {
      console.log('✅ Distribution verified in database!');
    } else {
      console.log('❌ Distribution not found in database!');
    }
    
    // Clean up test data
    await db.delete(pointDistributions).where(sql`id = ${newDistribution[0].id}`);
    console.log('🧹 Test distribution cleaned up');
    
    console.log('\n✅ Point distribution system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('test-point-distribution.ts')) {
  testPointDistribution()
    .then(() => {
      console.log('🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPointDistribution };
