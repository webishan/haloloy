import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

async function cleanupProblematicTransactions() {
  console.log('🧹 Cleaning up problematic transactions...');
  
  try {
    // Get all point distributions
    const allDistributions = await db.select().from(pointDistributions);
    console.log(`📊 Found ${allDistributions.length} total distributions`);
    
    // Find problematic distributions
    const problematicDistributions = allDistributions.filter(dist => 
      dist.fromUserId === dist.toUserId || // Self-transactions
      dist.fromUserId === 'system' || // System-generated
      dist.description?.includes('generated') || // Point generation descriptions
      dist.distributionType === 'point_generation' || // Point generation type
      dist.description?.includes('system') // System-related descriptions
    );
    
    console.log(`🔍 Found ${problematicDistributions.length} problematic distributions:`);
    
    if (problematicDistributions.length > 0) {
      problematicDistributions.forEach((dist, index) => {
        console.log(`   ${index + 1}. ID: ${dist.id}`);
        console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
        console.log(`      Points: ${dist.points}`);
        console.log(`      Description: ${dist.description}`);
        console.log(`      Type: ${dist.distributionType}`);
        console.log(`      Created: ${dist.createdAt}`);
        console.log('');
      });
      
      console.log('⚠️  These distributions will be deleted to fix transaction history.');
      console.log('🔄 Deleting problematic distributions...');
      
      // Delete problematic distributions
      for (const dist of problematicDistributions) {
        await db.delete(pointDistributions).where(sql`id = ${dist.id}`);
        console.log(`✅ Deleted distribution: ${dist.id}`);
      }
      
      console.log(`🎉 Cleaned up ${problematicDistributions.length} problematic distributions`);
    } else {
      console.log('✅ No problematic distributions found');
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingDistributions = await db.select().from(pointDistributions);
    console.log(`📊 Remaining distributions: ${remainingDistributions.length}`);
    
    remainingDistributions.forEach((dist, index) => {
      console.log(`   ${index + 1}. From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Points: ${dist.points}, Description: ${dist.description}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log('');
    });
    
    // Check admin balances
    console.log('\n👤 Checking admin balances after cleanup...');
    const allAdmins = await db.select().from(admins);
    
    for (const admin of allAdmins) {
      // Get distributions where this admin is the recipient (credits)
      const credits = remainingDistributions.filter(dist => 
        dist.toUserId === admin.userId && 
        dist.fromUserId !== admin.userId && 
        dist.fromUserId !== 'system'
      );
      
      // Get distributions where this admin is the sender (debits)
      const debits = remainingDistributions.filter(dist => 
        dist.fromUserId === admin.userId && 
        dist.toUserId !== admin.userId && 
        dist.toUserId !== 'system'
      );
      
      const totalCredits = credits.reduce((sum, dist) => sum + dist.points, 0);
      const totalDebits = debits.reduce((sum, dist) => sum + dist.points, 0);
      
      console.log(`\n👤 Admin: ${admin.userId} (${admin.country})`);
      console.log(`   Current Balance: ${admin.pointsBalance || 0}`);
      console.log(`   Total Credits: ${totalCredits}`);
      console.log(`   Total Debits: ${totalDebits}`);
      console.log(`   Expected Balance: ${totalCredits - totalDebits}`);
      
      // Show transaction history
      const userDistributions = remainingDistributions.filter(dist => 
        dist.fromUserId === admin.userId || dist.toUserId === admin.userId
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      console.log(`   📊 Transaction History (${userDistributions.length} transactions):`);
      userDistributions.forEach((dist, index) => {
        const isCredit = dist.toUserId === admin.userId;
        const amount = isCredit ? `+${dist.points}` : `-${dist.points}`;
        const type = isCredit ? 'CREDIT' : 'DEBIT';
        console.log(`     ${index + 1}. ${type}: ${amount} points (${dist.description})`);
      });
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('cleanup-problematic-transactions.ts')) {
  cleanupProblematicTransactions()
    .then(() => {
      console.log('🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupProblematicTransactions };
