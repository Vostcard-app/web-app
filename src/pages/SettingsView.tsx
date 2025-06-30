import { useVostcard } from '../context/VostcardContext';
import React, { useState } from 'react';
import { gapi } from 'gapi-script';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHome } from 'react-icons/fa';

const SettingsView = () => {
  const navigate = useNavigate();
  const [isBackupEnabled, setIsBackupEnabled] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const { savedVostcards, setSavedVostcards } = useVostcard();

  React.useEffect(() => {
    function start() {
      gapi.client.init({
        apiKey: process.env.VITE_GOOGLE_API_KEY,
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.appdata'
      });
    }
    gapi.load('client:auth2', start);
  }, []);

  const handleToggleBackup = () => {
    const newValue = !isBackupEnabled;
    setIsBackupEnabled(newValue);
    if (newValue) {
      console.log('Cloud backup enabled');
      // Call uploadBackup here if desired
    } else {
      console.log('Cloud backup disabled');
    }
  };

  const uploadBackup = async () => {
    try {
      const fileContent = JSON.stringify({ message: 'This is your Vostcard backup!' });
      const blob = new Blob([fileContent], { type: 'application/json' });

      const accessToken = gapi.auth.getToken().access_token;
      const metadata = {
        name: 'vostcards.json',
        mimeType: 'application/json',
        parents: ['appDataFolder'],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
        body: form,
      });

      const now = new Date().toLocaleString();
      setLastSynced(now);
      console.log('Backup uploaded successfully');
    } catch (error) {
      console.error('Error uploading backup:', error);
    }
  };

  const downloadBackup = async () => {
    try {
      const res = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name)',
        q: "name = 'vostcards.json'",
      });

      const file = res.result.files?.[0];
      if (!file) {
        console.log('No backup found.');
        return;
      }

      const fileId = file.id;
      const fileRes = await gapi.client.drive.files.get({
        fileId,
        alt: 'media',
      });

      console.log('Backup data:', fileRes.body);
      alert('Backup restored: Check console for data.');

    } catch (error) {
      console.error('Error downloading backup:', error);
    }
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        backgroundColor: '#002B4D', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '8px' 
      }}>
        <FaArrowLeft 
          size={24} 
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate(-1)} 
        />
        <h1 style={{ flex: 1, textAlign: 'center', margin: 0 }}>Settings</h1>
        <FaHome 
          size={24} 
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate('/')} 
        />
      </div>
      <div style={{ padding: '20px' }}>
        <section style={{ marginBottom: '20px' }}>
          <h2>Cloud Backup</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={isBackupEnabled}
              onChange={handleToggleBackup}
            />
            Enable Cloud Backup
          </label>
          {isBackupEnabled && (
            <div style={{ marginTop: '10px' }}>
              <p>
                <strong>Last synced:</strong>{' '}
                {lastSynced ? lastSynced : 'Never'}
              </p>
              <button onClick={uploadBackup} style={{ marginRight: '10px' }}>
                Sync Now
              </button>
              <button onClick={downloadBackup}>Restore from Backup</button>
              <p><em>iCloud integration for iOS coming soon...</em></p>
            </div>
          )}
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2>Manual Backup (iCloud Drive / Local)</h2>
          <div>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const content = event.target?.result as string;
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                      setSavedVostcards(parsed);
                      console.log('✅ Backup loaded into app state:', parsed);
                      alert('Backup restored successfully!');
                    } else {
                      console.error('❌ Invalid backup format');
                      alert('Invalid backup file format.');
                    }
                  } catch (error) {
                    console.error('❌ Error parsing backup:', error);
                    alert('Failed to load backup.');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(savedVostcards, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vostcards.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Backup
            </button>
          </div>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h2>Account</h2>
          <button style={{ marginRight: '10px' }}>Change Username</button>
          <button style={{ marginRight: '10px' }}>Change Password</button>
          <button style={{ marginRight: '10px' }} onClick={() => gapi.auth2.getAuthInstance().signIn()}>Google Login</button>
          <button style={{ marginRight: '10px' }} onClick={() => gapi.auth2.getAuthInstance().signOut()}>Google Logout</button>
          <button>Logout</button>
        </section>

        <section>
          <h2>Other</h2>
          <button style={{ marginRight: '10px' }}>Suggestion Box</button>
          <button>Report a Bug</button>
        </section>
      </div>
    </>
  );
};

export default SettingsView;