import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';

const CreateVostcardStep2: React.FC = () => {
  const navigate = useNavigate();
  const { photo1, setPhoto1, photo2, setPhoto2 } = useVostcard();

  useEffect(() => {
    // Clear thumbnails when entering Step 2
    setPhoto1(null);
    setPhoto2(null);
  }, []);

  const handleSaveAndContinue = () => {
    navigate('/create-step3');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Step 2: Add Photos</h2>

      {/* Photo thumbnails */}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 150, height: 150, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo1 ? <img src={photo1} alt="Photo 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No Photo 1'}
        </div>
        <div style={{ width: 150, height: 150, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo2 ? <img src={photo2} alt="Photo 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No Photo 2'}
        </div>
      </div>

      {/* Save & Continue Button */}
      <button
        style={{ marginTop: 20, padding: '10px 20px', backgroundColor: '#002B4D', color: 'white', border: 'none', borderRadius: 8 }}
        onClick={handleSaveAndContinue}
      >
        Save & Continue
      </button>
    </div>
  );
};

export default CreateVostcardStep2;