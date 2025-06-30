# Vostcard Web App - Multi-Provider Backup & Sync System

This document describes the comprehensive backup and sync functionality implemented in the Vostcard web app, providing users with multiple options for backing up and syncing their data.

## Overview

The backup and sync system allows users to:
- **Export locally** - Download data as a ZIP file to their device
- **Backup to cloud services** - Upload to iCloud Drive, Google Drive, or other cloud storage
- **Sync locally** - Transfer data between nearby devices on the same network
- **Import backups** - Restore data from any backup source
- **Cross-device sync** - Keep data synchronized across multiple devices

## Features

### ✅ Implemented Features

1. **Multi-Provider Backup Export**
   - **Local Download**: Direct ZIP file download to device
   - **iCloud Drive**: Native integration for Apple devices
   - **Google Drive**: Full API integration with authentication
   - **Local Network**: Peer-to-peer sync using WebRTC
   - **Custom Cloud**: Extensible framework for other services

2. **Smart Device Detection**
   - Automatically detects available cloud services
   - Platform-specific provider availability
   - Device name and ID management
   - Network device discovery

3. **Local Network Sync**
   - WebRTC-based peer-to-peer communication
   - Automatic device discovery on local network
   - Secure file transfer between devices
   - Real-time sync status updates

4. **Cloud Service Integration**
   - **Google Drive**: Full API integration with OAuth2
   - **iCloud Drive**: WebDAV integration for Apple ecosystem
   - **Extensible**: Easy to add new cloud providers

5. **User Interface**
   - Modern, responsive design with provider cards
   - Real-time status indicators
   - Progress tracking for all operations
   - Device discovery and management
   - Import/export confirmation dialogs

### 🔧 Technical Implementation

#### Dependencies Added
```json
{
  "jszip": "^3.10.1",
  "file-saver": "^2.0.5",
  "@types/file-saver": "^1.3.4",
  "gapi-script": "^1.2.0"
}
```

#### Key Components

1. **BackupService** (`src/services/backupService.ts`)
   - Core backup/restore logic
   - Multi-provider management
   - Local storage data gathering
   - ZIP file creation and extraction

2. **GoogleDriveService** (`src/services/googleDriveService.ts`)
   - Google Drive API integration
   - OAuth2 authentication
   - File upload/download operations
   - Backup file management

3. **LocalNetworkService** (`src/services/localNetworkService.ts`)
   - WebRTC peer-to-peer communication
   - Device discovery and management
   - Secure file transfer
   - Network status monitoring

4. **BackupRestoreComponent** (`src/components/BackupRestoreComponent.tsx`)
   - Multi-provider UI
   - Device discovery interface
   - Cloud service management
   - Sync status display

#### Provider Architecture

```typescript
interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  isAvailable: () => boolean;
  upload: (file: File, filename: string) => Promise<string>;
  download: (fileId: string) => Promise<File>;
  list: () => Promise<Array<{ id: string; name: string; date: string; size: number }>>;
}
```

#### Data Structure

**Backup ZIP Contents:**
```
vostcard-backup-YYYY-MM-DD.zip
├── metadata.json          # Backup version, device info, export date
├── data.json             # All local storage data
└── device-info.json      # Device identification and settings
```

**Metadata Structure:**
```json
{
  "version": "1.0.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "deviceName": "MacBook Pro",
  "deviceId": "device_1705312200000_abc123",
  "dataTypes": ["localData", "sessionStorage"],
  "fileSize": 1024
}
```

## Usage Instructions

### For Users

1. **Local Backup**
   - Navigate to Settings → Backup & Sync
   - Click "Download Backup"
   - File downloads to your device's default location

2. **Cloud Backup**
   - Select a cloud provider (iCloud Drive, Google Drive)
   - Click "Upload" next to the provider
   - Authenticate with the service
   - Backup uploads to your cloud storage

3. **Local Network Sync**
   - Click "Discover Devices"
   - Select a device from the list
   - Click "Sync" to transfer data
   - Both devices will have synchronized data

4. **Import Backup**
   - Click "Select Backup File"
   - Choose any backup file (local or cloud)
   - Review backup information
   - Confirm import to restore data

### For Developers

#### Adding New Cloud Providers

1. **Create Provider Service**
   ```typescript
   export class NewCloudService {
     static async uploadFile(file: File, filename: string): Promise<string> {
       // Implementation for your cloud service
     }
     
     static async downloadFile(fileId: string): Promise<File> {
       // Implementation for downloading
     }
     
     static async listFiles(): Promise<Array<{ id: string; name: string; date: string; size: number }>> {
       // Implementation for listing files
     }
   }
   ```

2. **Add Provider to BackupService**
   ```typescript
   private static createNewCloudProvider(): CloudProvider {
     return {
       id: 'new-cloud',
       name: 'New Cloud Service',
       icon: '☁️',
       description: 'Backup to New Cloud Service',
       isAvailable: () => NewCloudService.isAvailable(),
       upload: async (file: File, filename: string) => {
         const { NewCloudService } = await import('./newCloudService');
         return await NewCloudService.uploadFile(file, filename);
       },
       download: async (fileId: string) => {
         const { NewCloudService } = await import('./newCloudService');
         return await NewCloudService.downloadFile(fileId);
       },
       list: async () => {
         const { NewCloudService } = await import('./newCloudService');
         return await NewCloudService.listFiles();
       }
     };
   }
   ```

3. **Register Provider**
   ```typescript
   static getAvailableProviders(): CloudProvider[] {
     const providers: CloudProvider[] = [];
     
     // Add your new provider
     if (this.isNewCloudAvailable()) {
       providers.push(this.createNewCloudProvider());
     }
     
     return providers;
   }
   ```

#### Local Network Implementation

The local network sync uses WebRTC for peer-to-peer communication:

1. **Device Discovery**: Uses WebRTC signaling to discover nearby devices
2. **Connection Establishment**: Creates peer connections between devices
3. **File Transfer**: Sends backup files through RTCDataChannel
4. **Status Monitoring**: Tracks transfer progress and connection status

## Cloud Service Setup

### Google Drive Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Google Drive API

2. **Configure OAuth2**
   - Create OAuth2 credentials
   - Add authorized origins
   - Set up consent screen

3. **Update Configuration**
   ```typescript
   const GOOGLE_DRIVE_API_KEY = 'your-api-key';
   const GOOGLE_DRIVE_CLIENT_ID = 'your-client-id';
   ```

### iCloud Drive Setup

1. **WebDAV Configuration**
   - Configure WebDAV endpoint
   - Set up authentication
   - Handle Apple-specific requirements

2. **Platform Detection**
   - Automatically detect Apple devices
   - Enable iCloud Drive integration
   - Handle authentication flow

## Security Considerations

1. **Authentication**
   - OAuth2 for cloud services
   - Secure token management
   - Automatic token refresh

2. **Data Privacy**
   - Local data only (no Firebase for backups)
   - Encrypted file transfers
   - Secure peer-to-peer communication

3. **Network Security**
   - WebRTC encryption
   - Secure signaling servers
   - NAT traversal handling

## Performance Considerations

1. **Large Files**
   - Streaming uploads/downloads
   - Progress indicators
   - Chunked file transfers

2. **Network Optimization**
   - Local network prioritization
   - Bandwidth management
   - Connection pooling

3. **Memory Management**
   - Efficient file handling
   - Garbage collection
   - Resource cleanup

## Future Enhancements

1. **Additional Cloud Services**
   - Dropbox integration
   - OneDrive support
   - Amazon S3 compatibility

2. **Advanced Sync Features**
   - Incremental backups
   - Conflict resolution
   - Selective sync

3. **Enhanced Security**
   - End-to-end encryption
   - Password protection
   - Two-factor authentication

4. **Automation**
   - Scheduled backups
   - Auto-sync on changes
   - Background sync

## Troubleshooting

### Common Issues

1. **Cloud Service Authentication**
   - Check API keys and client IDs
   - Verify OAuth2 configuration
   - Clear browser cache and cookies

2. **Local Network Issues**
   - Ensure devices are on same network
   - Check firewall settings
   - Verify WebRTC support

3. **File Transfer Problems**
   - Check file size limits
   - Verify network connectivity
   - Monitor browser console for errors

### Debug Information

Enable debug logging for detailed operation tracking:
- Cloud service authentication flow
- Network device discovery
- File transfer progress
- Error details and stack traces

## Compliance with Implementation Guide

This implementation extends the original backup requirements with:

✅ **Multi-Provider Support**
- Local, cloud, and network backup options
- Extensible provider architecture
- Platform-specific optimizations

✅ **Advanced Sync Features**
- Real-time device discovery
- Peer-to-peer file transfer
- Cross-device synchronization

✅ **Enhanced User Experience**
- Provider-specific interfaces
- Real-time status updates
- Comprehensive error handling

✅ **Security & Privacy**
- Local data storage only
- Secure cloud authentication
- Encrypted network communication

The system provides a comprehensive backup and sync solution that gives users complete control over their data while maintaining security and privacy. 