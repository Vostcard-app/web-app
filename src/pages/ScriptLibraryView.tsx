import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';

const ScriptLibraryView: React.FC = () => {
  console.log('🔍 ScriptLibraryView component starting...');
  
  const navigate = useNavigate();
  console.log('🔍 navigate hook loaded');
  
  const { scripts, loadScripts } = useVostcard();
  console.log('🔍 useVostcard hook loaded, scripts:', scripts);

  useEffect(() => {
    console.log('🔍 ScriptLibraryView useEffect triggered');
    if (loadScripts) {
      loadScripts().then(() => {
        console.log('✅ Scripts loaded successfully');
      }).catch((err: any) => {
        console.error('⚠️ Failed to fetch scripts from Firebase:', err);
      });
    } else {
      console.error('❌ loadScripts is not available');
    }
  }, [loadScripts]);

  console.log('🔍 ScriptLibraryView about to render');

  return (
    <div style={{ 
      width: '100vw',
      height: '100vh',
      backgroundColor: 'red',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '24px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>SCRIPT LIBRARY TEST</h1>
        <p>Scripts count: {scripts?.length || 0}</p>
        <button 
          onClick={() => {
            console.log('🔍 Home button clicked');
            navigate('/home');
          }} 
          style={{ 
            padding: 10, 
            fontSize: 16, 
            backgroundColor: 'white', 
            color: 'black',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default ScriptLibraryView;