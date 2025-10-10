import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins, users } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

async function testTransactionAPI() {
  console.log('🧪 Testing Transaction API...');
  
  try {
    // Find Kenya local admin (KE)
    const kenyaUsers = await db.select().from(users).where(eq(users.country, 'KE'));
    const kenyaAdmin = kenyaUsers.find(user => user.role === 'local_admin');
    
    if (!kenyaAdmin) {
      console.log('❌ Kenya local admin not found');
      return;
    }
    
    console.log(`✅ Found Kenya Local Admin: ${kenyaAdmin.id} (${kenyaAdmin.email})`);
    
    // Test the transaction history query directly
    console.log('\n🔍 Testing transaction history query...');
    
    const distributions = await db.select().from(pointDistributions).where(
      sql`(
        (${pointDistributions.toUserId} = ${kenyaAdmin.id} AND ${pointDistributions.fromUserId} != ${kenyaAdmin.id} AND ${pointDistributions.fromUserId} != 'system') OR
        (${pointDistributions.fromUserId} = ${kenyaAdmin.id} AND ${pointDistributions.toUserId} != ${kenyaAdmin.id} AND ${pointDistributions.toUserId} != 'system')
      ) AND ${pointDistributions.distributionType} != 'point_generation'`
    );
    
    console.log(`📊 Found ${distributions.length} relevant distributions for Kenya admin`);
    
    distributions.forEach((dist, index) => {
      const isCredit = dist.toUserId === kenyaAdmin.id;
      const amount = isCredit ? `+${dist.points}` : `-${dist.points}`;
      const type = isCredit ? 'CREDIT' : 'DEBIT';
      console.log(`   ${index + 1}. ${type}: ${amount} points (${dist.description})`);
      console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log(`      Created: ${dist.createdAt}`);
      console.log('');
    });
    
    // Check admin balance
    const kenyaAdminProfile = await db.select().from(admins).where(eq(admins.userId, kenyaAdmin.id)).limit(1);
    if (kenyaAdminProfile[0]) {
      console.log(`💰 Kenya Admin Balance: ${kenyaAdminProfile[0].pointsBalance || 0}`);
      console.log(`📥 Total Received: ${kenyaAdminProfile[0].totalPointsReceived || 0}`);
      console.log(`📤 Total Distributed: ${kenyaAdminProfile[0].totalPointsDistributed || 0}`);
    }
    
    console.log('\n✅ Transaction API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Transaction API test failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('test-transaction-api.ts')) {
  testTransactionAPI()
    .then(() => {
      console.log('🎉 Transaction API test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Transaction API test failed:', error);
      process.exit(1);
    });
}

export { testTransactionAPI };
