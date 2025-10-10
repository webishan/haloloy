import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

async function cleanupPointTransactions() {
  console.log('🧹 Cleaning up point transaction data...');
  
  try {
    // Get all point distributions
    const allDistributions = await db.select().from(pointDistributions);
    console.log(`📊 Found ${allDistributions.length} total point distributions`);
    
    // Find problematic distributions (system-generated or duplicates)
    const problematicDistributions = allDistributions.filter(dist => 
      dist.fromUserId === 'system' || 
      dist.description?.includes('system') ||
      dist.description?.includes('generated')
    );
    
    console.log(`🔍 Found ${problematicDistributions.length} potentially problematic distributions`);
    
    if (problematicDistributions.length > 0) {
      console.log('📋 Problematic distributions:');
      problematicDistributions.forEach((dist, index) => {
        console.log(`   ${index + 1}. ID: ${dist.id}`);
        console.log(`      From: ${dist.fromUserId}, To: ${dist.toUserId}`);
        console.log(`      Points: ${dist.points}, Description: ${dist.description}`);
        console.log(`      Created: ${dist.createdAt}`);
        console.log('');
      });
      
      // Ask for confirmation before deletion
      console.log('⚠️  These distributions will be deleted. This will fix the transaction history.');
      console.log('🔄 To proceed, uncomment the deletion code below and run this script again.');
      
      // Uncomment the following lines to actually delete the problematic distributions:
      /*
      for (const dist of problematicDistributions) {
        await db.delete(pointDistributions).where(sql`id = ${dist.id}`);
        console.log(`✅ Deleted distribution: ${dist.id}`);
      }
      console.log(`🎉 Cleaned up ${problematicDistributions.length} problematic distributions`);
      */
    }
    
    // Check admin balances for consistency
    console.log('\n🔍 Checking admin balances...');
    const allAdmins = await db.select().from(admins);
    
    for (const admin of allAdmins) {
      // Get distributions where this admin is the recipient
      const receivedDistributions = allDistributions.filter(dist => 
        dist.toUserId === admin.userId && dist.fromUserId !== 'system'
      );
      
      // Get distributions where this admin is the sender
      const sentDistributions = allDistributions.filter(dist => 
        dist.fromUserId === admin.userId && dist.fromUserId !== 'system'
      );
      
      const totalReceived = receivedDistributions.reduce((sum, dist) => sum + dist.points, 0);
      const totalDistributed = sentDistributions.reduce((sum, dist) => sum + dist.points, 0);
      
      console.log(`\n👤 Admin: ${admin.userId}`);
      console.log(`   Current Balance: ${admin.pointsBalance || 0}`);
      console.log(`   Total Received: ${admin.totalPointsReceived || 0} (calculated: ${totalReceived})`);
      console.log(`   Total Distributed: ${admin.totalPointsDistributed || 0} (calculated: ${totalDistributed})`);
      console.log(`   Expected Balance: ${totalReceived - totalDistributed}`);
      
      // Show transaction history with sequential balance calculation
      console.log(`   📊 Transaction History:`);
      const userDistributions = allDistributions.filter(dist => 
        dist.fromUserId === admin.userId || dist.toUserId === admin.userId
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const startingBalance = (admin.pointsBalance || 0) - totalReceived + totalDistributed;
      let runningBalance = startingBalance;
      
      userDistributions.forEach((dist, index) => {
        const isCredit = dist.toUserId === admin.userId;
        const isDebit = dist.fromUserId === admin.userId;
        
        if (isCredit) {
          runningBalance += dist.points;
        } else if (isDebit) {
          runningBalance -= dist.points;
        }
        
        console.log(`      ${index + 1}. ${new Date(dist.createdAt).toLocaleString()}`);
        console.log(`         ${isCredit ? 'Credit' : 'Debit'}: ${dist.points} - Balance After: ${runningBalance}`);
        console.log(`         Description: ${dist.description}`);
      });
      
      if ((admin.pointsBalance || 0) !== (totalReceived - totalDistributed)) {
        console.log(`   ⚠️  Balance mismatch detected!`);
      }
    }
    
    console.log('\n✅ Point transaction cleanup analysis completed!');
    
  } catch (error) {
    console.error('❌ Error cleaning up point transactions:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('cleanup-point-transactions.ts')) {
  cleanupPointTransactions()
    .then(() => {
      console.log('🎉 Point transaction cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Point transaction cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupPointTransactions };
