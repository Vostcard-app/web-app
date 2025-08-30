import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaUserCircle, FaChevronDown } from 'react-icons/fa';

interface VostcardHeaderProps {
  vostcard: any;
  userProfile: any;
  user: any;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  showTipDropdown: boolean;
  tipDropdownPosition: { top: number; left: number };
  onTipButtonClick: () => void;
  tipButtonRef: React.RefObject<HTMLButtonElement>;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
}

const VostcardHeader: React.FC<VostcardHeaderProps> = ({
  vostcard,
  userProfile,
  user,
  canGoToPrevious,
  canGoToNext,
  showTipDropdown,
  tipDropdownPosition,
  onTipButtonClick,
  tipButtonRef,
  setUserProfile
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <div style={{ 
        background: '#07345c', 
        padding: '15px 16px 9px 16px',
        position: 'relative', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '2.5rem' }}>
          Vōstcard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }} 
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft color="#fff" size={24} />
          </button>
          <button 
            style={{ 
              background: 'rgba(0,0,0,0.10)', 
              border: 'none', 
              borderRadius: '50%', 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              marginRight: '15px'
            }} 
            onClick={() => navigate('/home')}
          >
            <FaHome color="#fff" size={40} />
          </button>
        </div>
      </div>

      {/* Guide label removed from upper right corner - now shown under username */}

      {/* Swipe navigation indicators */}
      {(canGoToPrevious || canGoToNext) && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          zIndex: 10,
          opacity: 0.4,
          pointerEvents: 'none'
        }}>
          {canGoToPrevious && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
          <div style={{
            width: '4px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '50%'
          }} />
          {canGoToNext && (
            <div style={{
              width: '2px',
              height: '20px',
              backgroundColor: '#333',
              borderRadius: '1px'
            }} />
          )}
        </div>
      )}

      {/* User Info + Map View button on right */}
      <div style={{ 
        padding: '15px 20px 5px 20px',
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16 }}>
            <div 
              style={{ 
                width: 50, 
                height: 50, 
                borderRadius: '50%', 
                overflow: 'hidden', 
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (vostcard?.userID) {
                  navigate(`/user-profile/${vostcard.userID}`);
                }
              }}
            >
              {userProfile?.avatarURL ? (
                <img 
                  src={userProfile.avatarURL} 
                  alt="User Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={() => setUserProfile((prev: any) => ({ ...prev, avatarURL: null }))}
                />
              ) : (
                <FaUserCircle size={50} color="#ccc" />
              )}
            </div>
            {/* Guide label moved to under username */}
          </div>
          <div 
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={() => {
              if (vostcard?.userID) {
                navigate(`/user-profile/${vostcard.userID}`);
              }
            }}
          >
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#333'
            }}>
              {userProfile?.username || vostcard.username || 'Anonymous'}
            </div>
            {(userProfile?.userRole === 'guide' || vostcard?.userRole === 'guide') && (
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#333'
              }}>
                Guide
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* ☕ Tip Button for Guides */}
          {userProfile?.userRole === 'guide' && user?.uid !== vostcard.userID && (
            <button
              ref={tipButtonRef}
              onClick={onTipButtonClick}
              style={{
                backgroundColor: '#002B4D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                transition: 'transform 0.1s ease',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1',
                gap: '4px'
              }}
            >
              Leave a Tip
              <FaChevronDown size={8} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 20px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '22px', 
          fontWeight: 'bold', 
          color: '#333',
          textAlign: 'center'
        }}>
          {vostcard.title || 'Untitled Vōstcard'}
        </h1>
      </div>
    </>
  );
};

export default VostcardHeader;
