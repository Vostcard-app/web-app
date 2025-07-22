import { v4 as uuidv4 } from 'uuid';

export interface ImportedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: 'google' | 'native' | 'manual';
}

export class ContactImportService {
  // Google Contacts API integration
  static async importFromGoogle(): Promise<ImportedContact[]> {
    try {
      // Check if credentials are available
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!apiKey || !clientId) {
        throw new Error('Google API credentials not configured. Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in your .env file.');
      }
      
      // Initialize Google API if not already done
      await this.initializeGoogleAPI();
      
      // Request authorization
      const token = await this.requestGoogleAuth();
      
      // Fetch contacts
      const response = await gapi.client.people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 500,
        personFields: 'names,emailAddresses,phoneNumbers'
      });
      
      const connections = response.result.connections || [];
      
      return connections.map(contact => ({
        id: uuidv4(),
        name: contact.names?.[0]?.displayName || 'Unknown Contact',
        email: contact.emailAddresses?.[0]?.value,
        phone: contact.phoneNumbers?.[0]?.value,
        source: 'google' as const
      })).filter(contact => contact.email || contact.phone);
      
    } catch (error) {
      console.error('Google contacts import failed:', error);
      throw error;
    }
  }
  
  // Native Contact Picker API (existing functionality)
  static async importFromNative(): Promise<ImportedContact[]> {
    try {
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel'], { multiple: true });
        
        return contacts.map((contact: any) => ({
          id: uuidv4(),
          name: contact.name?.[0] || 'Unknown Contact',
          email: contact.email?.[0],
          phone: contact.tel?.[0],
          source: 'native' as const
        })).filter((contact: ImportedContact) => contact.email || contact.phone);
      } else {
        throw new Error('Contact Picker not supported in this browser');
      }
    } catch (error) {
      console.error('Native contact picker failed:', error);
      throw error;
    }
  }
  
  // Google API initialization
  private static async initializeGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi && gapi.client) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      script.onload = async () => {
        try {
          gapi.load('client', async () => {
            try {
              await gapi.client.init({
                apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/people/v1/rest']
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      };
      document.head.appendChild(script);
    });
  }
  
  private static async requestGoogleAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        reject(new Error('Google Client ID not configured'));
        return;
      }
      
      // Load Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      script.onload = () => {
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/contacts.readonly',
            callback: (response: any) => {
              if (response.error) {
                reject(new Error(`Google auth failed: ${response.error}`));
              } else {
                resolve(response.access_token);
              }
            }
          });
          
          tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
          reject(error);
        }
      };
      document.head.appendChild(script);
    });
  }
} 