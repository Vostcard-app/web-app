import React, { useState, useRef, useEffect } from 'react';
import { 
  FaCoffee, 
  FaPaypal, 
  FaDollarSign, 
  FaApple, 
  FaGoogle, 
  FaBitcoin, 
  FaEthereum,
  FaPatreon,
  FaChevronDown,
  FaExternalLinkAlt,
  FaTimes
} from 'react-icons/fa';
import RevolutIcon from './RevolutIcon';

interface TipDropdownMenuProps {
  userProfile: any;
  isVisible: boolean;
  onClose: () => void;
  position?: { top: number; left: number }; // Optional since modal doesn't need positioning
}

interface TipOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  urlKey: string;
  color: string;
  description: string;
}

const TipDropdownMenu: React.FC<TipDropdownMenuProps> = ({ 
  userProfile, 
  isVisible, 
  onClose 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, onClose]);

  const tipOptions: TipOption[] = [
    // Reordered as requested: Apple Pay, Google Pay, Venmo, Zelle, Buy Me a Coffee, Ko-fi
    {
      id: 'applepay',
      name: 'Apple Pay',
      icon: <FaApple size={16} />,
      urlKey: 'applePayURL',
      color: '#000000',
      description: 'Apple Pay Cash'
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      icon: <FaGoogle size={16} />,
      urlKey: 'googlePayURL',
      color: '#4285F4',
      description: 'Google Pay send'
    },
    {
      id: 'venmo',
      name: 'Venmo',
      icon: <FaDollarSign size={16} />,
      urlKey: 'venmoURL',
      color: '#3D95CE',
      description: '@username handle'
    },
    {
      id: 'zelle',
      name: 'Zelle',
      icon: <FaDollarSign size={16} />,
      urlKey: 'zelleURL',
      color: '#6C1C99',
      description: 'Quick bank transfer'
    },
    {
      id: 'revolut',
      name: 'Revolut',
      icon: <RevolutIcon size={16} />,
      urlKey: 'revolutURL',
      color: '#0075EB',
      description: 'Instant transfers'
    },
    {
      id: 'buymeacoffee',
      name: 'Buy Me a Coffee',
      icon: <FaCoffee size={16} />,
      urlKey: 'buyMeACoffeeURL',
      color: '#FFDD00',
      description: 'Support with a coffee'
    },
    {
      id: 'kofi',
      name: 'Ko-fi',
      icon: <FaCoffee size={16} />,
      urlKey: 'kofiURL',
      color: '#FF5E5B',
      description: 'One-time donations'
    },
    // Other options below the requested ones
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <FaPaypal size={16} />,
      urlKey: 'paypalURL',
      color: '#0070BA',
      description: 'PayPal.me link'
    },
    {
      id: 'cashapp',
      name: 'CashApp',
      icon: <FaDollarSign size={16} />,
      urlKey: 'cashappURL',
      color: '#00D632',
      description: '$username handle'
    },
    {
      id: 'patreon',
      name: 'Patreon',
      icon: <FaPatreon size={16} />,
      urlKey: 'patreonURL',
      color: '#FF424D',
      description: 'Monthly support'
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      icon: <FaBitcoin size={16} />,
      urlKey: 'bitcoinURL',
      color: '#F7931A',
      description: 'BTC wallet address'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      icon: <FaEthereum size={16} />,
      urlKey: 'ethereumURL',
      color: '#627EEA',
      description: 'ETH wallet address'
    }
  ];

  // Filter options that have URLs configured
  const availableOptions = tipOptions.filter(option => 
    userProfile?.[option.urlKey] && userProfile[option.urlKey].trim() !== ''
  );

  const handleOptionClick = (option: TipOption) => {
    const url = userProfile[option.urlKey];
    if (url) {
      // Handle different URL formats
      let finalUrl = url;
      
      // Handle special cases for different payment services
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        if (option.id === 'venmo' && url.startsWith('@')) {
          finalUrl = `https://venmo.com/${url.substring(1)}`;
        } else if (option.id === 'cashapp' && url.startsWith('$')) {
          finalUrl = `https://cash.app/${url}`;
        } else if (option.id === 'zelle') {
          // Zelle uses email or phone - create a mailto link or show info
          if (url.includes('@')) {
            // Email address - create mailto link
            finalUrl = `mailto:${url}?subject=Zelle Payment&body=Hi! I'd like to send you a tip via Zelle.`;
          } else {
            // Phone number or other - copy to clipboard and show instructions
            navigator.clipboard.writeText(url).then(() => {
              alert(`Zelle info copied to clipboard: ${url}\n\nTo send a payment:\n1. Open your banking app\n2. Go to Zelle\n3. Use this email/phone number`);
            }).catch(() => {
              alert(`Zelle info: ${url}\n\nTo send a payment:\n1. Open your banking app\n2. Go to Zelle\n3. Use this email/phone number`);
            });
            onClose();
            return;
          }
        } else if (option.id === 'applepay') {
          // Apple Pay - copy to clipboard with instructions
          navigator.clipboard.writeText(url).then(() => {
            alert(`Apple Pay info copied: ${url}\n\nTo send a payment:\n1. Open Messages or Apple Pay\n2. Use this email/phone number`);
          }).catch(() => {
            alert(`Apple Pay info: ${url}\n\nTo send a payment:\n1. Open Messages or Apple Pay\n2. Use this email/phone number`);
          });
          onClose();
          return;
        } else if (option.id === 'googlepay') {
          // Google Pay - copy to clipboard with instructions
          navigator.clipboard.writeText(url).then(() => {
            alert(`Google Pay info copied: ${url}\n\nTo send a payment:\n1. Open Google Pay app\n2. Use this email/phone number`);
          }).catch(() => {
            alert(`Google Pay info: ${url}\n\nTo send a payment:\n1. Open Google Pay app\n2. Use this email/phone number`);
          });
          onClose();
          return;
        } else if (option.id === 'bitcoin' || option.id === 'ethereum') {
          // For crypto, copy to clipboard instead of opening
          navigator.clipboard.writeText(url).then(() => {
            alert(`${option.name} address copied to clipboard: ${url}`);
          });
          onClose();
          return;
        } else {
          // Default case - add https protocol
          finalUrl = `https://${url}`;
        }
      }
      
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  if (!isVisible || availableOptions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          ref={modalRef}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Close Button */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#f8f9fa',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <FaCoffee size={18} />
              Tip This Guide
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              marginTop: '4px'
            }}>
              Choose your preferred payment method
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Options Grid */}
          <div style={{ 
            padding: '20px',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {availableOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option)}
                  style={{
                    padding: '12px',
                    border: '2px solid #f0f0f0',
                    borderRadius: '12px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: '#333',
                    transition: 'all 0.2s ease',
                    minHeight: '80px',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Logo in upper left corner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: option.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: option.color === '#FFDD00' ? '#333' : 'white',
                      fontSize: '12px'
                    }}
                  >
                    {React.cloneElement(option.icon as React.ReactElement, { size: 12 })}
                  </div>
                  
                  {/* Centered service title */}
                  <div style={{ 
                    textAlign: 'center',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <div style={{ fontWeight: '600' }}>
                      {option.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TipDropdownMenu; 