export interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  avatar?: string;
}

export interface ContactPickerResult {
  contacts: Contact[];
  error?: string;
}

export class ContactService {
  /**
   * Check if Contact Picker API is supported
   */
  static isContactPickerSupported(): boolean {
    return 'contacts' in navigator && 'ContactsManager' in window;
  }

  /**
   * Get detailed browser/device support information
   */
  static getDeviceSupport(): {
    isSupported: boolean;
    browserName: string;
    deviceType: string;
    supportMessage: string;
  } {
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edge/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

    let browserName = 'Unknown';
    let deviceType = 'Desktop';
    let supportMessage = '';

    // Determine browser
    if (isChrome) browserName = 'Chrome';
    else if (isSafari) browserName = 'Safari';
    else if (isFirefox) browserName = 'Firefox';

    // Determine device type
    if (isAndroid) deviceType = 'Android';
    else if (isIOS) deviceType = 'iOS';
    else if (isMobile) deviceType = 'Mobile';

    // Check actual API support
    const isSupported = this.isContactPickerSupported();

    // Generate support message
    if (isSupported) {
      supportMessage = `✅ Contact picker supported on ${browserName} ${deviceType}`;
    } else {
      if (isAndroid && isChrome) {
        supportMessage = `⚠️ Contact picker should work on Chrome Android, but API not detected`;
      } else if (isAndroid) {
        supportMessage = `❌ Contact picker only works on Chrome browser on Android devices`;
      } else if (isIOS) {
        supportMessage = `❌ Contact picker not supported on iOS devices. Try Chrome on Android`;
      } else {
        supportMessage = `❌ Contact picker only works on Chrome browser on Android devices`;
      }
    }

    return {
      isSupported,
      browserName,
      deviceType,
      supportMessage
    };
  }

  /**
   * Check if we're running in a mobile app context
   */
  static isMobileApp(): boolean {
    // Check for common mobile app indicators
    return /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) || 
           window.matchMedia('(max-width: 768px)').matches;
  }

  /**
   * Request contacts using the Contact Picker API (Chrome on Android)
   */
  static async pickContacts(): Promise<ContactPickerResult> {
    try {
      if (!this.isContactPickerSupported()) {
        return { 
          contacts: [], 
          error: 'Contact picker not supported on this device' 
        };
      }

      // Request contacts with email and phone permissions
      const contactsManager = (navigator as any).contacts;
      const properties = ['name', 'email', 'tel'];
      
      // Check if properties are supported
      const supportedProperties = await contactsManager.getProperties();
      const availableProperties = properties.filter(prop => 
        supportedProperties.includes(prop)
      );

      if (availableProperties.length === 0) {
        return { 
          contacts: [], 
          error: 'No supported contact properties available' 
        };
      }

      // Pick contacts
      const selectedContacts = await contactsManager.select(availableProperties, {
        multiple: true
      });

      // Transform to our Contact interface
      const contacts: Contact[] = selectedContacts.map((contact: any, index: number) => ({
        id: `contact_${index}`,
        name: contact.name?.[0] || 'Unknown Contact',
        emails: contact.email || [],
        phones: contact.tel || [],
        avatar: undefined // Contact API doesn't provide avatars
      }));

      return { contacts };
    } catch (error) {
      console.error('Error picking contacts:', error);
      
      // Handle user cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { contacts: [], error: 'Contact selection cancelled' };
      }
      
      return { 
        contacts: [], 
        error: 'Failed to access contacts. Please check permissions.' 
      };
    }
  }

  /**
   * Show contact selection modal as fallback
   */
  static async showContactFallback(): Promise<ContactPickerResult> {
    return new Promise((resolve) => {
      // Create a fallback UI that explains how to manually add contacts
      const message = `
        Contact picker is not available on this device.
        
        You can:
        1. Manually enter email addresses or phone numbers
        2. Copy contacts from your phone's address book
        3. Use the share button in your contacts app
        
        Would you like to continue with manual entry?
      `;
      
      const useManual = confirm(message);
      
      if (useManual) {
        resolve({ contacts: [] });
      } else {
        resolve({ contacts: [], error: 'Contact selection cancelled' });
      }
    });
  }

  /**
   * Main function to get contacts with fallback
   */
  static async getContacts(): Promise<ContactPickerResult> {
    if (this.isContactPickerSupported()) {
      return this.pickContacts();
    } else {
      return this.showContactFallback();
    }
  }

  /**
   * Extract email addresses from a contact
   */
  static getContactEmails(contact: Contact): string[] {
    return contact.emails.filter(email => email && email.includes('@'));
  }

  /**
   * Extract phone numbers from a contact
   */
  static getContactPhones(contact: Contact): string[] {
    return contact.phones.filter(phone => phone && phone.trim().length > 0);
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format US phone numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    // Return original if not US format
    return phone;
  }

  /**
   * Validate contact for invitation
   */
  static validateContactForInvitation(contact: Contact, method: 'email' | 'sms' | 'whatsapp'): {
    isValid: boolean;
    availableOptions: { value: string; label: string }[];
    error?: string;
  } {
    const availableOptions: { value: string; label: string }[] = [];
    
    if (method === 'email') {
      const emails = this.getContactEmails(contact);
      emails.forEach(email => {
        availableOptions.push({ value: email, label: email });
      });
      
      return {
        isValid: availableOptions.length > 0,
        availableOptions,
        error: availableOptions.length === 0 ? 'No email addresses found for this contact' : undefined
      };
    } else {
      const phones = this.getContactPhones(contact);
      phones.forEach(phone => {
        availableOptions.push({ 
          value: phone, 
          label: this.formatPhoneNumber(phone) 
        });
      });
      
      return {
        isValid: availableOptions.length > 0,
        availableOptions,
        error: availableOptions.length === 0 ? 'No phone numbers found for this contact' : undefined
      };
    }
  }

  /**
   * Create invitation data from contact
   */
  static createInvitationFromContact(
    contact: Contact, 
    method: 'email' | 'sms' | 'whatsapp',
    selectedValue: string
  ): { recipient: string; displayName: string } {
    return {
      recipient: selectedValue,
      displayName: contact.name
    };
  }
} 