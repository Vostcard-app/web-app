import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const CreateVostcardStep2 = () => {
  const navigate = useNavigate();

  return (
    <div style={container}>
      {/* 🔵 Header */}
      <div style={header}>
        <h1 style={logo}>Vōstcard</h1>
        <FaArrowLeft
          size={24}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/create-step1')}
        />
      </div>

      {/* 🔲 Thumbnails */}
      <div style={thumbnailsContainer}>
        <div style={thumbnail}>
          <img
            src="/placeholder.png"
            alt="Distant"
            style={imageIcon}
          />
          <p style={label}>
            Distant
            <br />
            (Suggested)
          </p>
        </div>
        <div style={thumbnail}>
          <img
            src="/placeholder.png"
            alt="Near"
            style={imageIcon}
          />
          <p style={label}>
            Near
            <br />
            (Suggested)
          </p>
        </div>
      </div>

      {/* ✅ Save & Continue Button */}
      <div style={buttonContainer}>
        <button style={button} onClick={() => navigate('/create-step3')}>
          Save & Continue
        </button>
      </div>
    </div>
  );
};

/* 🎨 Styles */
const container = {
  height: '100vh',
  width: '100vw',
  backgroundColor: 'white',
  display: 'flex',
  flexDirection: 'column' as 'column',
  alignItems: 'center',
};

const header = {
  backgroundColor: '#002B4D',
  height: '70px',
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 20px',
  boxSizing: 'border-box' as 'border-box',
};

const logo = {
  color: 'white',
  fontSize: '28px',
  margin: 0,
};

const thumbnailsContainer = {
  display: 'flex',
  flexDirection: 'column' as 'column',
  gap: '30px',
  marginTop: '60px',
};

const thumbnail = {
  backgroundColor: '#F3F3F3',
  width: '280px',
  height: '280px',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column' as 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const imageIcon = {
  width: '60px',
  height: '60px',
  marginBottom: '10px',
};

const label = {
  color: '#002B4D',
  fontSize: '20px',
  textAlign: 'center' as 'center',
  margin: 0,
};

const buttonContainer = {
  marginTop: 'auto',
  marginBottom: '60px',
  width: '90%',
};

const button = {
  width: '100%',
  backgroundColor: '#002B4D',
  color: 'white',
  padding: '15px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
};

export default CreateVostcardStep2;