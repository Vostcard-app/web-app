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
  FaExternalLinkAlt
} from 'react-icons/fa';

interface TipDropdownMenuProps {
  userProfile: any;
  isVisible: boolean;
  onClose: () => void;
  position: { top: number; left: number };
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
  onClose, 
  position 
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
      
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (option.id === 'venmo' && url.startsWith('@')) {
          finalUrl = `https://venmo.com/${url.substring(1)}`;
        } else if (option.id === 'cashapp' && url.startsWith('$')) {
          finalUrl = `https://cash.app/${url}`;
        } else if (option.id === 'bitcoin' || option.id === 'ethereum') {
          // For crypto, copy to clipboard instead of opening
          navigator.clipboard.writeText(url).then(() => {
            alert(`${option.name} address copied to clipboard: ${url}`);
          });
          onClose();
          return;
        } else {
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
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '1px solid #e0e0e0',
        zIndex: 1000,
        minWidth: '220px',
        maxWidth: '280px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#333',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <FaCoffee size={16} />
          Tip This Guide
        </div>
        <div style={{
          fontSize: '12px',
          color: '#666',
          textAlign: 'center',
          marginTop: '4px'
        }}>
          Choose your preferred method
        </div>
      </div>

      {/* Options List */}
      <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
        {availableOptions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleOptionClick(option)}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: 'none',
              borderBottom: index < availableOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: option.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: option.color === '#FFDD00' ? '#333' : 'white',
                flexShrink: 0
              }}
            >
              {option.icon}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                {option.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {option.description}
              </div>
            </div>
            <FaExternalLinkAlt size={12} color="#999" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TipDropdownMenu; 