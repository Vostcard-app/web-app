import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';

export interface OnboardingState {
  hasSeenOnboarding: boolean;
  onboardingCompletedAt?: string;
  onboardingVersion?: number; // For future onboarding updates
}

export const OnboardingService = {
  /**
   * Check if user has seen the onboarding tour
   * @returns Promise<boolean>
   */
  async hasUserSeenOnboarding(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.hasSeenOnboarding === true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return false; // Default to showing onboarding if we can't check
    }
  },

  /**
   * Mark user as having completed the onboarding tour
   * @returns Promise<void>
   */
  async markOnboardingCompleted(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasSeenOnboarding: true,
        onboardingCompletedAt: new Date().toISOString(),
        onboardingVersion: 1 // Current version
      });

      console.log('✅ Onboarding marked as completed for user:', user.uid);
    } catch (error) {
      console.error('❌ Error marking onboarding as completed:', error);
      throw error;
    }
  },

  /**
   * Reset onboarding status (for testing or if user wants to see tour again)
   * @returns Promise<void>
   */
  async resetOnboarding(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasSeenOnboarding: false,
        onboardingCompletedAt: null,
        onboardingVersion: null
      });

      console.log('✅ Onboarding reset for user:', user.uid);
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
      throw error;
    }
  },

  /**
   * Get full onboarding state for a user
   * @returns Promise<OnboardingState>
   */
  async getOnboardingState(): Promise<OnboardingState> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { hasSeenOnboarding: false };
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return {
          hasSeenOnboarding: userData.hasSeenOnboarding === true,
          onboardingCompletedAt: userData.onboardingCompletedAt,
          onboardingVersion: userData.onboardingVersion
        };
      }
      
      return { hasSeenOnboarding: false };
    } catch (error) {
      console.error('❌ Error getting onboarding state:', error);
      return { hasSeenOnboarding: false };
    }
  }
};