import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  arrayUnion,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { type InvitationRequest, type InvitationLink, type InvitationStats } from '../types/FriendModels';

export interface SendInvitationOptions {
  senderUID: string;
  inviteMethod: 'email' | 'sms' | 'whatsapp';
  recipient: string; // email, phone number, or WhatsApp number
  message?: string;
}

export class InvitationService {
  
  /**
   * Generate a unique invitation code
   */
  private static generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Create invitation URL
   */
  private static createInvitationURL(inviteCode: string): string {
    const baseURL = window.location.origin;
    return `${baseURL}/join?invite=${inviteCode}`;
  }

  /**
   * Send invitation to non-registered user
   */
  static async sendInvitation(options: SendInvitationOptions): Promise<{ 
    success: boolean; 
    error?: string; 
    invitationId?: string; 
    inviteCode?: string;
  }> {
    try {
      const { senderUID, inviteMethod, recipient, message } = options;

      // Get sender information
      const senderDoc = await getDoc(doc(db, 'users', senderUID));
      if (!senderDoc.exists()) {
        return { success: false, error: 'Sender not found' };
      }
      const senderData = senderDoc.data();

      // Validate recipient format
      const validationResult = this.validateRecipient(inviteMethod, recipient);
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.error };
      }

      // Check if invitation already exists for this recipient
      const existingInviteQuery = query(
        collection(db, 'invitations'),
        where('senderUID', '==', senderUID),
        where(inviteMethod === 'email' ? 'inviteeEmail' : 
              inviteMethod === 'sms' ? 'inviteePhone' : 'inviteeWhatsApp', '==', recipient),
        where('status', '==', 'pending')
      );

      const existingInvites = await getDocs(existingInviteQuery);
      if (!existingInvites.empty) {
        return { success: false, error: 'Invitation already sent to this recipient' };
      }

      // Generate unique invite code
      const inviteCode = this.generateInviteCode();
      const invitationURL = this.createInvitationURL(inviteCode);

      // Create expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create invitation record
      const invitationData: Omit<InvitationRequest, 'id'> = {
        senderUID,
        senderUsername: senderData.username || 'A friend',
        senderEmail: senderData.email || '',
        senderAvatarURL: senderData.avatarURL,
        inviteMethod,
        inviteCode,
        status: 'pending',
        message: message || '',
        createdAt: new Date(),
        expiresAt,
        ...(inviteMethod === 'email' && { inviteeEmail: recipient }),
        ...(inviteMethod === 'sms' && { inviteePhone: recipient }),
        ...(inviteMethod === 'whatsapp' && { inviteeWhatsApp: recipient })
      };

      // Save invitation to database
      const invitationDoc = await addDoc(collection(db, 'invitations'), {
        ...invitationData,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });

      // Create invitation link record
      const invitationLink: Omit<InvitationLink, 'id'> = {
        inviteCode,
        senderUID,
        senderUsername: senderData.username || 'A friend',
        expiresAt,
        isUsed: false
      };

      await addDoc(collection(db, 'invitationLinks'), invitationLink);

      // Send the actual invitation
      const sendResult = await this.sendInvitationMessage(
        inviteMethod, 
        recipient, 
        senderData.username || 'A friend',
        invitationURL,
        message
      );

      if (sendResult.success) {
        // Update invitation with sent timestamp
        await updateDoc(doc(db, 'invitations', invitationDoc.id), {
          sentAt: serverTimestamp()
        });

        return { 
          success: true, 
          invitationId: invitationDoc.id,
          inviteCode 
        };
      } else {
        // If sending failed, mark invitation as failed
        await updateDoc(doc(db, 'invitations', invitationDoc.id), {
          status: 'cancelled'
        });

        return { success: false, error: sendResult.error };
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  }

  /**
   * Validate recipient based on invitation method
   */
  private static validateRecipient(method: string, recipient: string): { isValid: boolean; error?: string } {
    switch (method) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient)) {
          return { isValid: false, error: 'Invalid email address' };
        }
        break;
      case 'sms':
      case 'whatsapp':
        // Basic phone number validation (can be enhanced)
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(recipient)) {
          return { isValid: false, error: 'Invalid phone number' };
        }
        break;
      default:
        return { isValid: false, error: 'Invalid invitation method' };
    }
    return { isValid: true };
  }

  /**
   * Send invitation message via specified method
   */
  private static async sendInvitationMessage(
    method: 'email' | 'sms' | 'whatsapp',
    recipient: string,
    senderName: string,
    invitationURL: string,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    const defaultMessage = `Hi! ${senderName} invited you to join Vōstcard - a free app for creating and sharing location-based video stories. Join using this link: ${invitationURL}`;
    const fullMessage = customMessage 
      ? `${customMessage}\n\n${defaultMessage}`
      : defaultMessage;

    switch (method) {
      case 'email':
        return this.sendEmailInvitation(recipient, senderName, invitationURL, fullMessage);
      case 'sms':
        return this.sendSMSInvitation(recipient, fullMessage);
      case 'whatsapp':
        return this.sendWhatsAppInvitation(recipient, fullMessage);
      default:
        return { success: false, error: 'Invalid invitation method' };
    }
  }

  /**
   * Send email invitation
   */
  private static async sendEmailInvitation(
    email: string, 
    senderName: string, 
    invitationURL: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, you would integrate with:
      // - EmailJS (client-side email service)
      // - SendGrid, Mailgun, or similar (server-side)
      // - Firebase Functions with email provider
      
      // For now, we'll use a placeholder implementation
      // You can replace this with your preferred email service
      
      const emailData = {
        to: email,
        subject: `${senderName} invited you to join Vōstcard!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #002B4D;">You're invited to join Vōstcard!</h2>
            <p>Hi there!</p>
            <p><strong>${senderName}</strong> has invited you to join Vōstcard - a free app where you can create and share location-based video stories called "Vōstcards".</p>
            ${message ? `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;"><p><em>"${message}"</em></p></div>` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationURL}" style="background: #002B4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Join Vōstcard</a>
            </div>
            <p>With Vōstcard, you can:</p>
            <ul>
              <li>Create short video stories tied to specific locations</li>
              <li>Share them privately with friends or post them to the map</li>
              <li>Discover amazing places and stories from around the world</li>
              <li>Connect with friends and see their adventures</li>
            </ul>
            <p>Best of all, it's completely free!</p>
            <p>Click the link above to get started, or copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #007aff;">${invitationURL}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">This invitation will expire in 30 days. If you don't want to receive these invitations, please ignore this email.</p>
          </div>
        `
      };

      // TODO: Replace with actual email service integration
      console.log('Email invitation would be sent:', emailData);
      
      // Simulate successful email sending
      return { success: true };
      
    } catch (error) {
      console.error('Error sending email invitation:', error);
      return { success: false, error: 'Failed to send email invitation' };
    }
  }

  /**
   * Send SMS invitation
   */
  private static async sendSMSInvitation(
    phone: string, 
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, you would integrate with:
      // - Twilio
      // - AWS SNS
      // - Firebase Functions with SMS provider
      
      const smsData = {
        to: phone,
        body: message
      };

      // TODO: Replace with actual SMS service integration
      console.log('SMS invitation would be sent:', smsData);
      
      // Simulate successful SMS sending
      return { success: true };
      
    } catch (error) {
      console.error('Error sending SMS invitation:', error);
      return { success: false, error: 'Failed to send SMS invitation' };
    }
  }

  /**
   * Send WhatsApp invitation
   */
  private static async sendWhatsAppInvitation(
    whatsappNumber: string, 
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // WhatsApp Business API integration would go here
      // For now, we'll create a WhatsApp share URL
      const encodedMessage = encodeURIComponent(message);
      const whatsappURL = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
      
      // Open WhatsApp in a new window/tab
      window.open(whatsappURL, '_blank');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error sending WhatsApp invitation:', error);
      return { success: false, error: 'Failed to send WhatsApp invitation' };
    }
  }

  /**
   * Get user's sent invitations
   */
  static async getSentInvitations(userUID: string): Promise<InvitationRequest[]> {
    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('senderUID', '==', userUID),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const invitationDocs = await getDocs(invitationsQuery);

      return invitationDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        sentAt: doc.data().sentAt?.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date()
      })) as InvitationRequest[];
    } catch (error) {
      console.error('Error getting sent invitations:', error);
      return [];
    }
  }

  /**
   * Get invitation by code
   */
  static async getInvitationByCode(inviteCode: string): Promise<InvitationLink | null> {
    try {
      const linkQuery = query(
        collection(db, 'invitationLinks'),
        where('inviteCode', '==', inviteCode),
        where('isUsed', '==', false),
        limit(1)
      );

      const linkDocs = await getDocs(linkQuery);

      if (linkDocs.empty) {
        return null;
      }

      const linkData = linkDocs.docs[0].data();
      return {
        ...linkData,
        expiresAt: linkData.expiresAt?.toDate() || new Date()
      } as InvitationLink;
    } catch (error) {
      console.error('Error getting invitation by code:', error);
      return null;
    }
  }

  /**
   * Accept invitation when user registers
   */
  static async acceptInvitation(inviteCode: string, newUserUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation link
      const invitationLink = await this.getInvitationByCode(inviteCode);
      
      if (!invitationLink) {
        return { success: false, error: 'Invalid or expired invitation' };
      }

      if (new Date() > invitationLink.expiresAt) {
        return { success: false, error: 'Invitation has expired' };
      }

      const batch = writeBatch(db);

      // Mark invitation link as used
      const linkQuery = query(
        collection(db, 'invitationLinks'),
        where('inviteCode', '==', inviteCode)
      );
      const linkDocs = await getDocs(linkQuery);
      
      if (!linkDocs.empty) {
        batch.update(linkDocs.docs[0].ref, {
          isUsed: true,
          usedByUID: newUserUID,
          usedAt: serverTimestamp()
        });
      }

      // Update invitation record
      const invitationQuery = query(
        collection(db, 'invitations'),
        where('inviteCode', '==', inviteCode)
      );
      const invitationDocs = await getDocs(invitationQuery);
      
      if (!invitationDocs.empty) {
        batch.update(invitationDocs.docs[0].ref, {
          status: 'accepted',
          registeredUserUID: newUserUID,
          acceptedAt: serverTimestamp()
        });
      }

      // Auto-add friendship between sender and new user
      batch.update(doc(db, 'users', invitationLink.senderUID), {
        friends: arrayUnion(newUserUID)
      });

      batch.update(doc(db, 'users', newUserUID), {
        friends: arrayUnion(invitationLink.senderUID)
      });

      // Create friendship document
      batch.set(doc(collection(db, 'friendships')), {
        user1UID: invitationLink.senderUID,
        user2UID: newUserUID,
        establishedAt: serverTimestamp(),
        lastInteraction: serverTimestamp(),
        establishedVia: 'invitation'
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(invitationId: string, userUID: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
      
      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitationData = invitationDoc.data();
      
      if (invitationData.senderUID !== userUID) {
        return { success: false, error: 'Unauthorized' };
      }

      await updateDoc(doc(db, 'invitations', invitationId), {
        status: 'cancelled'
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      return { success: false, error: 'Failed to cancel invitation' };
    }
  }

  /**
   * Get invitation statistics for user
   */
  static async getInvitationStats(userUID: string): Promise<InvitationStats> {
    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('senderUID', '==', userUID)
      );

      const invitationDocs = await getDocs(invitationsQuery);
      
      const stats: InvitationStats = {
        totalSent: 0,
        totalAccepted: 0,
        totalPending: 0,
        totalExpired: 0,
        invitesByMethod: {
          email: 0,
          sms: 0,
          whatsapp: 0
        }
      };

      const now = new Date();

      invitationDocs.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate() || new Date();
        
        stats.totalSent++;
        stats.invitesByMethod[data.inviteMethod as keyof typeof stats.invitesByMethod]++;
        
        if (data.status === 'accepted') {
          stats.totalAccepted++;
        } else if (data.status === 'pending') {
          if (now > expiresAt) {
            stats.totalExpired++;
          } else {
            stats.totalPending++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      return {
        totalSent: 0,
        totalAccepted: 0,
        totalPending: 0,
        totalExpired: 0,
        invitesByMethod: { email: 0, sms: 0, whatsapp: 0 }
      };
    }
  }

  /**
   * Clean up expired invitations
   */
  static async cleanupExpiredInvitations(): Promise<{ success: boolean; deleted: number }> {
    try {
      const now = new Date();
      const expiredQuery = query(
        collection(db, 'invitations'),
        where('expiresAt', '<', now),
        where('status', '==', 'pending'),
        limit(100)
      );

      const expiredDocs = await getDocs(expiredQuery);

      if (expiredDocs.empty) {
        return { success: true, deleted: 0 };
      }

      const batch = writeBatch(db);

      expiredDocs.forEach(doc => {
        batch.update(doc.ref, { status: 'expired' });
      });

      await batch.commit();

      return { success: true, deleted: expiredDocs.size };
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return { success: false, deleted: 0 };
    }
  }
} 