import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { InvitationService } from './invitationService';
import { UserFriendService } from './userFriendService';

export interface RegistrationData {
  uid: string;
  email: string;
  username: string;
  inviteCode?: string;
}

export class RegistrationService {
  /**
   * Handle user registration with optional invitation code
   */
  static async handleRegistration(data: RegistrationData): Promise<{ success: boolean; error?: string }> {
    try {
      const { uid, email, username, inviteCode } = data;

      // Initialize user friend fields
      await UserFriendService.initializeFriendFields(uid);

      // Update user document with additional info
      await updateDoc(doc(db, 'users', uid), {
        email,
        username,
        registeredAt: serverTimestamp()
      });

      // Process invitation code if provided
      if (inviteCode) {
        const invitationResult = await InvitationService.acceptInvitation(inviteCode, uid);
        
        if (invitationResult.success) {
          console.log('Invitation accepted successfully during registration');
        } else {
          console.warn('Failed to accept invitation during registration:', invitationResult.error);
          // Don't fail registration if invitation processing fails
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling registration:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Check if invitation code is valid
   */
  static async validateInvitationCode(inviteCode: string): Promise<{
    isValid: boolean;
    senderUsername?: string;
    error?: string;
  }> {
    try {
      const invitation = await InvitationService.getInvitationByCode(inviteCode);
      
      if (!invitation) {
        return { isValid: false, error: 'Invalid invitation code' };
      }

      if (invitation.isUsed) {
        return { isValid: false, error: 'Invitation code has already been used' };
      }

      if (new Date() > invitation.expiresAt) {
        return { isValid: false, error: 'Invitation code has expired' };
      }

      return { 
        isValid: true, 
        senderUsername: invitation.senderUsername 
      };
    } catch (error) {
      console.error('Error validating invitation code:', error);
      return { isValid: false, error: 'Failed to validate invitation code' };
    }
  }

  /**
   * Extract invitation code from URL parameters
   */
  static getInvitationCodeFromURL(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('invite');
  }
} 