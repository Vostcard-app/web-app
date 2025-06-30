import { gapi } from 'gapi-script';

const GOOGLE_DRIVE_API_KEY = 'YOUR_GOOGLE_DRIVE_API_KEY'; // You'll need to get this from Google Cloud Console
const GOOGLE_DRIVE_CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID'; // You'll need to get this from Google Cloud Console

export class GoogleDriveService {
  private static isInitialized = false;
  private static isAuthenticated = false;

  /**
   * Initialize Google Drive API
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await gapi.load('client:auth2', async () => {
        await gapi.client.init({
          apiKey: GOOGLE_DRIVE_API_KEY,
          clientId: GOOGLE_DRIVE_CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: 'https://www.googleapis.com/auth/drive.file'
        });

        this.isInitialized = true;
        console.log('✅ Google Drive API initialized');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with Google Drive
   */
  static async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        await authInstance.signIn();
      }
      
      this.isAuthenticated = true;
      console.log('✅ Google Drive authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Google Drive authentication failed:', error);
      return false;
    }
  }

  /**
   * Upload file to Google Drive
   */
  static async uploadFile(file: File, filename: string): Promise<string> {
    if (!this.isAuthenticated) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Google Drive authentication required');
      }
    }

    try {
      const metadata = {
        name: filename,
        mimeType: file.type,
        parents: ['root'] // Upload to root folder
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await gapi.client.request({
        path: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary=foo_bar_baz'
        },
        body: form
      });

      const fileId = response.result.id;
      console.log('✅ File uploaded to Google Drive:', fileId);
      return fileId;
    } catch (error) {
      console.error('❌ Failed to upload file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Download file from Google Drive
   */
  static async downloadFile(fileId: string): Promise<File> {
    if (!this.isAuthenticated) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Google Drive authentication required');
      }
    }

    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      // Convert response to File object
      const blob = new Blob([response.body], { type: 'application/zip' });
      const file = new File([blob], 'vostcard-backup.zip', { type: 'application/zip' });
      
      console.log('✅ File downloaded from Google Drive');
      return file;
    } catch (error) {
      console.error('❌ Failed to download file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * List backup files in Google Drive
   */
  static async listBackupFiles(): Promise<Array<{ id: string; name: string; date: string; size: number }>> {
    if (!this.isAuthenticated) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Google Drive authentication required');
      }
    }

    try {
      const response = await gapi.client.drive.files.list({
        q: "name contains 'vostcard-backup' and mimeType='application/zip'",
        fields: 'files(id,name,createdTime,size)',
        orderBy: 'createdTime desc'
      });

      const files = response.result.files || [];
      return files.map((file: any) => ({
        id: file.id!,
        name: file.name!,
        date: file.createdTime!,
        size: parseInt(file.size || '0')
      }));
    } catch (error) {
      console.error('❌ Failed to list files from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Check if Google Drive is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 'gapi' in window;
  }

  /**
   * Sign out from Google Drive
   */
  static async signOut(): Promise<void> {
    if (this.isInitialized) {
      const authInstance = gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isAuthenticated = false;
      console.log('✅ Signed out from Google Drive');
    }
  }
} 