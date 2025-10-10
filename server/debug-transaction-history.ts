import 'dotenv/config';
import { db } from './db';
import { pointDistributions, admins, users } from '../shared/schema.js';
import { sql, eq } from 'drizzle-orm';

async function debugTransactionHistory() {
  console.log('🔍 Debugging Transaction History...');
  
  try {
    // Get all point distributions
    console.log('\n📊 All Point Distributions in Database:');
    const allDistributions = await db.select().from(pointDistributions);
    console.log(`Found ${allDistributions.length} total distributions`);
    
    allDistributions.forEach((dist, index) => {
      console.log(`   ${index + 1}. ID: ${dist.id}`);
      console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Points: ${dist.points}`);
      console.log(`      Description: ${dist.description}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log(`      Created: ${dist.createdAt}`);
      console.log('');
    });
    
    // Get all admins
    console.log('👤 All Admins in Database:');
    const allAdmins = await db.select().from(admins);
    allAdmins.forEach(admin => {
      console.log(`   User ID: ${admin.userId}`);
      console.log(`   Admin Type: ${admin.adminType}`);
      console.log(`   Country: ${admin.country}`);
      console.log(`   Points Balance: ${admin.pointsBalance || 0}`);
      console.log('');
    });
    
    // Get all users
    console.log('👥 All Users in Database:');
    const allUsers = await db.select().from(users);
    const adminUsers = allUsers.filter(user => user.role === 'global_admin' || user.role === 'local_admin');
    adminUsers.forEach(user => {
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Country: ${user.country}`);
      console.log('');
    });
    
    // Find India local admin specifically
    console.log('🇮🇳 Finding India Local Admin:');
    const indiaUsers = allUsers.filter(user => user.country === 'IN' && user.role === 'local_admin');
    if (indiaUsers.length > 0) {
      const indiaAdmin = indiaUsers[0];
      console.log(`✅ Found India Local Admin: ${indiaAdmin.id} (${indiaAdmin.email})`);
      
      // Check what distributions involve this admin
      const indiaDistributions = allDistributions.filter(dist => 
        dist.fromUserId === indiaAdmin.id || dist.toUserId === indiaAdmin.id
      );
      
      console.log(`📋 Distributions involving India Admin (${indiaDistributions.length} total):`);
      indiaDistributions.forEach((dist, index) => {
        const type = dist.toUserId === indiaAdmin.id ? 'CREDIT TO' : 'DEBIT FROM';
        console.log(`   ${index + 1}. ${type} India Admin`);
        console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
        console.log(`      Points: ${dist.points}`);
        console.log(`      Description: ${dist.description}`);
        console.log(`      Type: ${dist.distributionType}`);
        console.log('');
      });
      
      // Calculate what should be shown
      const creditsToIndia = indiaDistributions.filter(dist => dist.toUserId === indiaAdmin.id);
      const debitsFromIndia = indiaDistributions.filter(dist => dist.fromUserId === indiaAdmin.id);
      
      console.log('🧮 Summary for India Admin:');
      console.log(`   Credits TO India Admin: ${creditsToIndia.length} transactions`);
      creditsToIndia.forEach(dist => {
        console.log(`     + ${dist.points} points (${dist.description})`);
      });
      
      console.log(`   Debits FROM India Admin: ${debitsFromIndia.length} transactions`);
      debitsFromIndia.forEach(dist => {
        console.log(`     - ${dist.points} points (${dist.description})`);
      });
      
      const totalCredits = creditsToIndia.reduce((sum, dist) => sum + dist.points, 0);
      const totalDebits = debitsFromIndia.reduce((sum, dist) => sum + dist.points, 0);
      
      console.log(`   Total Credits: ${totalCredits}`);
      console.log(`   Total Debits: ${totalDebits}`);
      console.log(`   Net Balance: ${totalCredits - totalDebits}`);
      
    } else {
      console.log('❌ No India Local Admin found');
    }
    
    // Check for problematic distributions
    console.log('\n🚨 Checking for Problematic Distributions:');
    const problematicDistributions = allDistributions.filter(dist => 
      dist.fromUserId === dist.toUserId || // Self-transactions
      dist.fromUserId === 'system' || // System-generated
      dist.description?.includes('generated') || // Point generation
      dist.distributionType === 'point_generation' // Point generation type
    );
    
    console.log(`Found ${problematicDistributions.length} potentially problematic distributions:`);
    problematicDistributions.forEach((dist, index) => {
      console.log(`   ${index + 1}. ID: ${dist.id}`);
      console.log(`      From: ${dist.fromUserId} → To: ${dist.toUserId}`);
      console.log(`      Points: ${dist.points}`);
      console.log(`      Description: ${dist.description}`);
      console.log(`      Type: ${dist.distributionType}`);
      console.log('');
    });
    
    console.log('\n✅ Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    throw error;
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('debug-transaction-history.ts')) {
  debugTransactionHistory()
    .then(() => {
      console.log('🎉 Debug completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error);
      process.exit(1);
    });
}

export { debugTransactionHistory };
