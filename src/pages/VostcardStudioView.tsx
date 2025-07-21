import React from 'react';

const VostcardStudioView: React.FC = () => {
  console.log('🎬 VostcardStudioView component is rendering!');
  
  return (
    <div style={{
      backgroundColor: 'red', // Bright red so we can see it
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      color: 'white',
      fontWeight: 'bold'
    }}>
      VOSTCARD STUDIO - TEST VERSION
    </div>
  );
};

export default VostcardStudioView; 