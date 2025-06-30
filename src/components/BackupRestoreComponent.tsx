import React, { useState, useRef, useEffect } from 'react';
import { BackupService } from '../services/backupService';
import type { CloudProvider, BackupInfo } from '../services/backupService';
import { FaDownload, FaUpload, FaInfoCircle, FaExclamationTriangle, FaCloud, FaNetworkWired, FaCog, FaSync } from 'react-icons/fa';
import './BackupRestoreComponent.css';

const BackupRestoreComponent: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<CloudProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [localDevices, setLocalDevices] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get available cloud providers
    const providers = BackupService.getAvailableProviders();
    setAvailableProviders(providers);
  }, []);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportMessage('');
    
    try {
      await BackupService.downloadBackup();
      setExportMessage('✅ Backup exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Export failed:', error);
      setExportMessage(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloudExport = async (provider: CloudProvider) => {
    setIsExporting(true);
    setExportMessage('');
    
    try {
      const file = await BackupService.exportBackup();
      const fileId = await provider.upload(file, file.name);
      setExportMessage(`✅ Backup uploaded to ${provider.name} successfully!`);
    } catch (error) {
      console.error('Cloud export failed:', error);
      setExportMessage(`❌ Upload to ${provider.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      setImportMessage('❌ Please select a valid ZIP file.');
      return;
    }

    try {
      // Get backup info first
      const info = await BackupService.getBackupInfo(file);
      setBackupInfo(info);
      setShowImportWarning(true);
    } catch (error) {
      setImportMessage(`❌ Invalid backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportBackup = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');
    
    try {
      await BackupService.importBackup(file);
      setImportMessage('✅ Backup imported successfully! Your data has been restored.');
      setBackupInfo(null);
      setShowImportWarning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportMessage(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setShowImportWarning(false);
    setBackupInfo(null);
    setImportMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDiscoverDevices = async () => {
    setIsDiscovering(true);
    try {
      const devices = await BackupService.discoverLocalDevices();
      setLocalDevices(devices);
    } catch (error) {
      console.error('Device discovery failed:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSyncWithDevice = async (deviceId: string) => {
    try {
      await BackupService.syncWithDevice(deviceId);
      setImportMessage('✅ Sync completed successfully!');
    } catch (error) {
      setImportMessage(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="backup-restore-container">
      <h2>Backup & Sync</h2>
      <p className="description">
        Export your Vostcard data to various cloud services or sync with nearby devices.
      </p>

      {/* Local Export Section */}
      <div className="section">
        <h3>Local Backup</h3>
        <p>Download your data as a ZIP file to your device.</p>
        
        <button 
          className="btn btn-export"
          onClick={handleExportBackup}
          disabled={isExporting}
        >
          <FaDownload />
          {isExporting ? 'Exporting...' : 'Download Backup'}
        </button>
        
        {exportMessage && (
          <div className={`message ${exportMessage.includes('✅') ? 'success' : 'error'}`}>
            {exportMessage}
          </div>
        )}
      </div>

      {/* Cloud Services Section */}
      <div className="section">
        <h3>Cloud Services</h3>
        <p>Backup your data to cloud storage services.</p>
        
        <div className="cloud-providers">
          {availableProviders.map((provider) => (
            <div key={provider.id} className="provider-card">
              <div className="provider-icon">{provider.icon}</div>
              <div className="provider-info">
                <h4>{provider.name}</h4>
                <p>{provider.description}</p>
              </div>
              <button 
                className="btn btn-cloud"
                onClick={() => handleCloudExport(provider)}
                disabled={isExporting || !provider.isAvailable()}
              >
                <FaCloud />
                {isExporting ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          ))}
        </div>

        {availableProviders.length === 0 && (
          <div className="no-providers">
            <p>No cloud services are currently available.</p>
          </div>
        )}
      </div>

      {/* Local Network Sync Section */}
      <div className="section">
        <h3>Local Network Sync</h3>
        <p>Sync with other devices on your local network.</p>
        
        <div className="network-sync">
          <button 
            className="btn btn-network"
            onClick={handleDiscoverDevices}
            disabled={isDiscovering}
          >
            <FaNetworkWired />
            {isDiscovering ? 'Discovering...' : 'Discover Devices'}
          </button>

          {localDevices.length > 0 && (
            <div className="device-list">
              <h4>Available Devices:</h4>
              {localDevices.map((device) => (
                <div key={device.id} className="device-item">
                  <div className="device-info">
                    <strong>{device.name}</strong>
                    <span>{device.address}</span>
                  </div>
                  <button 
                    className="btn btn-sync"
                    onClick={() => handleSyncWithDevice(device.id)}
                  >
                    <FaSync />
                    Sync
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Section */}
      <div className="section">
        <h3>Import Backup</h3>
        <p>Restore your data from a previously exported backup file.</p>
        
        <div className="import-warning">
          <FaExclamationTriangle />
          <strong>Warning:</strong> Importing a backup will replace all your current data.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <button 
          className="btn btn-import"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
        >
          <FaUpload />
          Select Backup File
        </button>

        {/* Backup Info Display */}
        {backupInfo && (
          <div className="backup-info">
            <h4>Backup Information</h4>
            <div className="info-grid">
              <div><strong>Version:</strong> {backupInfo.version}</div>
              <div><strong>Export Date:</strong> {new Date(backupInfo.exportDate).toLocaleString()}</div>
              <div><strong>Device:</strong> {backupInfo.deviceName}</div>
              <div><strong>Data Types:</strong> {backupInfo.dataTypes.join(', ')}</div>
              <div><strong>File Size:</strong> {(backupInfo.fileSize / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        )}

        {/* Import Confirmation */}
        {showImportWarning && (
          <div className="import-confirmation">
            <div className="warning-box">
              <FaExclamationTriangle />
              <h4>Confirm Import</h4>
              <p>This will replace all your current data with the backup data. This action cannot be undone.</p>
              <div className="confirmation-buttons">
                <button 
                  className="btn btn-danger"
                  onClick={handleImportBackup}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Yes, Import Backup'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={cancelImport}
                  disabled={isImporting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {importMessage && (
          <div className={`message ${importMessage.includes('✅') ? 'success' : 'error'}`}>
            {importMessage}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="section help-section">
        <h3>How it works</h3>
        <div className="help-content">
          <div className="help-item">
            <FaInfoCircle />
            <div>
              <strong>Local Backup:</strong> Downloads a ZIP file containing all your data to your device.
            </div>
          </div>
          <div className="help-item">
            <FaInfoCircle />
            <div>
              <strong>Cloud Services:</strong> Uploads your backup to iCloud Drive, Google Drive, or other cloud storage.
            </div>
          </div>
          <div className="help-item">
            <FaInfoCircle />
            <div>
              <strong>Local Network:</strong> Syncs with other devices on your network for quick data transfer.
            </div>
          </div>
          <div className="help-item">
            <FaInfoCircle />
            <div>
              <strong>Import:</strong> Restores your data from any backup file, replacing current data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreComponent; 