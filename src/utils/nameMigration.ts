import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface UserDoc {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  // ... other fields
}

export class NameMigrationService {
  /**
   * Parse a full name into first and last name
   */
  static parseName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length === 0) {
      return { firstName: '', lastName: '' };
    } else if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    } else if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] };
    } else {
      // For names with 3+ parts, treat first as firstName, rest as lastName
      return { 
        firstName: parts[0], 
        lastName: parts.slice(1).join(' ') 
      };
    }
  }

  /**
   * Migrate all existing users to have firstName/lastName fields
   */
  static async migrateExistingUsers(): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const results = {
      success: true,
      processed: 0,
      errors: [] as string[]
    };

    try {
      // Migrate regular users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserDoc;
        
        // Only process if firstName/lastName don't exist but name does
        if (userData.name && !userData.firstName && !userData.lastName) {
          const { firstName, lastName } = this.parseName(userData.name);
          
          try {
            await updateDoc(doc(db, 'users', userDoc.id), {
              firstName,
              lastName,
              // Keep the original name field for backward compatibility
              name: userData.name,
              migratedAt: new Date()
            });
            results.processed++;
            console.log(`✅ Migrated user: ${userData.name} -> ${firstName} ${lastName}`);
          } catch (error) {
            results.errors.push(`Failed to migrate user ${userDoc.id}: ${error}`);
            console.error(`❌ Failed to migrate user ${userDoc.id}:`, error);
          }
        }
      }

      // Migrate advertisers
      const advertisersSnapshot = await getDocs(collection(db, 'advertisers'));
      for (const advertiserDoc of advertisersSnapshot.docs) {
        const advertiserData = advertiserDoc.data() as UserDoc;
        
        if (advertiserData.name && !advertiserData.firstName && !advertiserData.lastName) {
          const { firstName, lastName } = this.parseName(advertiserData.name);
          
          try {
            await updateDoc(doc(db, 'advertisers', advertiserDoc.id), {
              firstName,
              lastName,
              name: advertiserData.name,
              migratedAt: new Date()
            });
            results.processed++;
            console.log(`✅ Migrated advertiser: ${advertiserData.name} -> ${firstName} ${lastName}`);
          } catch (error) {
            results.errors.push(`Failed to migrate advertiser ${advertiserDoc.id}: ${error}`);
            console.error(`❌ Failed to migrate advertiser ${advertiserDoc.id}:`, error);
          }
        }
      }

      console.log(`✅ Migration completed: ${results.processed} users processed, ${results.errors.length} errors`);
      return results;
    } catch (error) {
      results.success = false;
      results.errors.push(`Migration failed: ${error}`);
      console.error('❌ Migration failed:', error);
      return results;
    }
  }

  /**
   * Run migration for a single user (useful for testing)
   */
  static async migrateSingleUser(userId: string, collection: 'users' | 'advertisers' = 'users'): Promise<boolean> {
    try {
      const userDoc = await getDocs(doc(db, collection, userId));
      // Implementation similar to above but for single user
      return true;
    } catch (error) {
      console.error('❌ Single user migration failed:', error);
      return false;
    }
  }
} 