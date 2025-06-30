import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface BackupData {
  metadata: {
    version: string;
    timestamp: string;
    deviceId: string;
    deviceName: string;
  };
  vostcards: any[];
  userProfile: any;
  settings: any;
  localData: any;
}

export interface BackupInfo {
  version: string;
  exportDate: string;
  deviceName: string;
  dataTypes: string[];
  fileSize: number;
}

export interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  isAvailable: () => boolean;
  upload: (file: File, filename: string) => Promise<string>;
  download: (fileId: string) => Promise<File>;
  list: () => Promise<Array<{ id: string; name: string; date: string; size: number }>>;
}

export class BackupService {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly DEVICE_ID_KEY = 'vostcard_device_id';
  private static readonly DEVICE_NAME_KEY = 'vostcard_device_name';

  /**
   * Get or create device ID
   */
  private static getDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Get or create device name
   */
  private static getDeviceName(): string {
    let deviceName = localStorage.getItem(this.DEVICE_NAME_KEY);
    if (!deviceName) {
      deviceName = navigator.platform || 'Unknown Device';
      localStorage.setItem(this.DEVICE_NAME_KEY, deviceName);
    }
    return deviceName;
  }

  /**
   * Create backup data from local storage and app state
   */
  static async createBackupData(): Promise<BackupData> {
    console.log('🔄 Creating backup data...');

    const backupData: BackupData = {
      metadata: {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        deviceId: this.getDeviceId(),
        deviceName: this.getDeviceName()
      },
      vostcards: [],
      userProfile: null,
      settings: null,
      localData: {}
    };

    // Gather data from localStorage
    const localStorageData: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vostcard_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageData[key] = JSON.parse(value);
          }
        } catch (error) {
          console.warn(`Failed to parse localStorage key ${key}:`, error);
        }
      }
    }
    backupData.localData = localStorageData;

    // Gather data from sessionStorage
    const sessionStorageData: any = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('vostcard_')) {
        try {
          const value = sessionStorage.getItem(key);
          if (value) {
            sessionStorageData[key] = JSON.parse(value);
          }
        } catch (error) {
          console.warn(`Failed to parse sessionStorage key ${key}:`, error);
        }
      }
    }
    backupData.localData.sessionStorage = sessionStorageData;

    console.log('✅ Backup data created:', backupData);
    return backupData;
  }

  /**
   * Create and download backup ZIP file
   */
  static async exportBackup(): Promise<File> {
    try {
      console.log('🔄 Starting backup export...');

      // Create ZIP file
      const zip = new JSZip();
      
      // Fetch all local data
      const backupData = await this.createBackupData();
      
      // Add data.json to ZIP
      zip.file('data.json', JSON.stringify(backupData, null, 2));
      
      // Add metadata.json
      zip.file('metadata.json', JSON.stringify({
        version: this.BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        deviceName: this.getDeviceName(),
        dataTypes: Object.keys(backupData).filter(key => key !== 'metadata'),
        fileSize: 0 // Will be updated after creation
      }, null, 2));

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = `vostcard-backup-${new Date().toISOString().split('T')[0]}.zip`;
      
      // Create File object
      const file = new File([zipBlob], fileName, { type: 'application/zip' });

      console.log('✅ Backup exported successfully');
      return file;
    } catch (error) {
      console.error('❌ Backup export failed:', error);
      throw error;
    }
  }

  /**
   * Import backup from ZIP file
   */
  static async importBackup(file: File): Promise<void> {
    try {
      console.log('🔄 Starting backup import...');

      // Read and extract ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Read metadata
      const metadataFile = zipContent.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid backup file: missing metadata.json');
      }
      
      const metadata = JSON.parse(await metadataFile.async('text'));
      console.log('📋 Backup metadata:', metadata);

      // Read data.json
      const dataFile = zipContent.file('data.json');
      if (!dataFile) {
        throw new Error('Invalid backup file: missing data.json');
      }
      
      const backupData: BackupData = JSON.parse(await dataFile.async('text'));
      
      // Validate backup data
      if (!backupData.metadata) {
        throw new Error('Invalid backup data structure');
      }

      // Restore data to local storage
      await this.restoreLocalData(backupData);

      console.log('✅ Backup imported successfully');
    } catch (error) {
      console.error('❌ Backup import failed:', error);
      throw error;
    }
  }

  /**
   * Restore data to local storage
   */
  private static async restoreLocalData(backupData: BackupData): Promise<void> {
    console.log('🔄 Restoring local data...');

    // Clear existing vostcard data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vostcard_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Restore localStorage data
    if (backupData.localData) {
      Object.entries(backupData.localData).forEach(([key, value]) => {
        if (key !== 'sessionStorage') {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (error) {
            console.warn(`Failed to restore localStorage key ${key}:`, error);
          }
        }
      });

      // Restore sessionStorage data
      if (backupData.localData.sessionStorage) {
        Object.entries(backupData.localData.sessionStorage).forEach(([key, value]) => {
          try {
            sessionStorage.setItem(key, JSON.stringify(value));
          } catch (error) {
            console.warn(`Failed to restore sessionStorage key ${key}:`, error);
          }
        });
      }
    }

    console.log('✅ Local data restored');
  }

  /**
   * Get backup file info without importing
   */
  static async getBackupInfo(file: File): Promise<BackupInfo> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const metadataFile = zipContent.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid backup file: missing metadata.json');
      }
      
      const metadata = JSON.parse(await metadataFile.async('text'));
      return {
        ...metadata,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Failed to read backup info:', error);
      throw error;
    }
  }

  /**
   * Download backup file to device
   */
  static async downloadBackup(): Promise<void> {
    const file = await this.exportBackup();
    saveAs(file, file.name);
  }

  /**
   * Get available cloud providers
   */
  static getAvailableProviders(): CloudProvider[] {
    const providers: CloudProvider[] = [];

    // iCloud Drive (WebDAV)
    if (this.isICloudAvailable()) {
      providers.push(this.createICloudProvider());
    }

    // Google Drive
    if (this.isGoogleDriveAvailable()) {
      providers.push(this.createGoogleDriveProvider());
    }

    // Local Network Sync
    providers.push(this.createLocalNetworkProvider());

    return providers;
  }

  /**
   * Check if iCloud Drive is available
   */
  private static isICloudAvailable(): boolean {
    return navigator.platform.includes('Mac') || navigator.platform.includes('iPhone') || navigator.platform.includes('iPad');
  }

  /**
   * Check if Google Drive is available
   */
  private static isGoogleDriveAvailable(): boolean {
    return typeof window !== 'undefined' && 'gapi' in window;
  }

  /**
   * Create iCloud Drive provider
   */
  private static createICloudProvider(): CloudProvider {
    return {
      id: 'icloud',
      name: 'iCloud Drive',
      icon: '☁️',
      description: 'Backup to your iCloud Drive',
      isAvailable: () => this.isICloudAvailable(),
      upload: async (file: File, filename: string) => {
        // Implementation for iCloud WebDAV
        throw new Error('iCloud Drive integration not yet implemented');
      },
      download: async (fileId: string) => {
        throw new Error('iCloud Drive integration not yet implemented');
      },
      list: async () => {
        throw new Error('iCloud Drive integration not yet implemented');
      }
    };
  }

  /**
   * Create Google Drive provider
   */
  private static createGoogleDriveProvider(): CloudProvider {
    return {
      id: 'google-drive',
      name: 'Google Drive',
      icon: '📁',
      description: 'Backup to your Google Drive',
      isAvailable: () => this.isGoogleDriveAvailable(),
      upload: async (file: File, filename: string) => {
        // Import GoogleDriveService dynamically to avoid circular dependencies
        const { GoogleDriveService } = await import('./googleDriveService');
        return await GoogleDriveService.uploadFile(file, filename);
      },
      download: async (fileId: string) => {
        const { GoogleDriveService } = await import('./googleDriveService');
        return await GoogleDriveService.downloadFile(fileId);
      },
      list: async () => {
        const { GoogleDriveService } = await import('./googleDriveService');
        return await GoogleDriveService.listBackupFiles();
      }
    };
  }

  /**
   * Create local network provider
   */
  private static createLocalNetworkProvider(): CloudProvider {
    return {
      id: 'local-network',
      name: 'Local Network',
      icon: '🌐',
      description: 'Sync with nearby devices on your network',
      isAvailable: () => true,
      upload: async (file: File, filename: string) => {
        // For local network, we don't actually upload to a cloud service
        // Instead, we return a mock file ID
        return 'local_' + Date.now();
      },
      download: async (fileId: string) => {
        throw new Error('Local network download not implemented');
      },
      list: async () => {
        // Return empty list for local network
        return [];
      }
    };
  }

  /**
   * Get local network devices
   */
  static async discoverLocalDevices(): Promise<Array<{ id: string; name: string; address: string }>> {
    try {
      const { LocalNetworkService } = await import('./localNetworkService');
      await LocalNetworkService.initialize();
      const devices = await LocalNetworkService.discoverDevices();
      return devices.map(device => ({
        id: device.id,
        name: device.name,
        address: device.address
      }));
    } catch (error) {
      console.error('Failed to discover local devices:', error);
      return [];
    }
  }

  /**
   * Sync with a specific local device
   */
  static async syncWithDevice(deviceId: string): Promise<void> {
    try {
      const { LocalNetworkService } = await import('./localNetworkService');
      const backupFile = await this.exportBackup();
      await LocalNetworkService.syncWithDevice(deviceId, backupFile);
    } catch (error) {
      console.error('Failed to sync with device:', error);
      throw error;
    }
  }
} 