import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function updateGlobalAdminCredentials() {
  try {
    console.log('🔧 Updating global admin credentials...');
    
    // First, check if tkhanishan@gmail.com already exists
    const existingTkhanishan = await db.select().from(users).where(eq(users.email, 'tkhanishan@gmail.com')).limit(1);
    
    if (existingTkhanishan.length > 0) {
      console.log('✅ Found existing user with tkhanishan@gmail.com, updating to global admin...');
      
      // Update the existing user to be a global admin
      const hashedPassword = await bcrypt.hash('holyloy123', 10);
      
      await db.update(users)
        .set({
          password: hashedPassword,
          phone: '+8801871648461',
          country: 'BD',
          role: 'global_admin'
        })
        .where(eq(users.id, existingTkhanishan[0].id));
      
      console.log('✅ Updated existing user to global admin!');
      console.log('📧 Email: tkhanishan@gmail.com');
      console.log('📱 Phone: +8801871648461');
      console.log('🔑 Password: holyloy123');
      
      return true;
    }
    
    // If tkhanishan@gmail.com doesn't exist, update the global admin
    const existingGlobalAdmin = await db.select().from(users).where(eq(users.email, 'global@holyloy.com')).limit(1);
    
    if (existingGlobalAdmin.length === 0) {
      console.log('❌ Global admin not found with old email');
      return false;
    }
    
    console.log('✅ Found existing global admin:', existingGlobalAdmin[0].email);
    
    // Update the user with new credentials
    const hashedPassword = await bcrypt.hash('holyloy123', 10);
    
    await db.update(users)
      .set({
        email: 'tkhanishan@gmail.com',
        password: hashedPassword,
        phone: '+8801871648461',
        country: 'BD'
      })
      .where(eq(users.id, existingGlobalAdmin[0].id));
    
    console.log('✅ Global admin credentials updated successfully!');
    console.log('📧 New email: tkhanishan@gmail.com');
    console.log('📱 New phone: +8801871648461');
    console.log('🔑 Password: holyloy123');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating global admin:', error);
    return false;
  }
}
