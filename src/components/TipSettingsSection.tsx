import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  FaCoffee, 
  FaPaypal, 
  FaDollarSign, 
  FaApple, 
  FaGoogle, 
  FaBitcoin, 
  FaEthereum,
  FaPatreon,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';

interface TipSettingsSectionProps {
  profile: any;
  setProfile: (profile: any) => void;
  user: any;
}

interface TipService {
  id: string;
  name: string;
  icon: React.ReactNode;
  urlKey: string;
  color: string;
  placeholder: string;
  description: string;
  validation?: (url: string) => string | null;
}

const TipSettingsSection: React.FC<TipSettingsSectionProps> = ({ profile, setProfile, user }) => {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);

  const tipServices: TipService[] = [
    {
      id: 'buymeacoffee',
      name: 'Buy Me a Coffee',
      icon: <FaCoffee size={16} />,
      urlKey: 'buyMeACoffeeURL',
      color: '#FFDD00',
      placeholder: 'https://www.buymeacoffee.com/yourname',
      description: 'Popular donation platform for creators',
      validation: (url: string) => {
        if (url && !url.includes('buymeacoffee.com/')) {
          return 'Please enter a valid Buy Me a Coffee URL';
        }
        return null;
      }
    },
    {
      id: 'kofi',
      name: 'Ko-fi',
      icon: <FaCoffee size={16} />,
      urlKey: 'kofiURL',
      color: '#FF5E5B',
      placeholder: 'https://ko-fi.com/yourname',
      description: 'Simple donation platform with no fees',
      validation: (url: string) => {
        if (url && !url.includes('ko-fi.com/')) {
          return 'Please enter a valid Ko-fi URL';
        }
        return null;
      }
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <FaPaypal size={16} />,
      urlKey: 'paypalURL',
      color: '#0070BA',
      placeholder: 'https://paypal.me/yourname',
      description: 'PayPal.me link for direct payments',
      validation: (url: string) => {
        if (url && !url.includes('paypal.me/')) {
          return 'Please enter a valid PayPal.me URL';
        }
        return null;
      }
    },
    {
      id: 'venmo',
      name: 'Venmo',
      icon: <FaDollarSign size={16} />,
      urlKey: 'venmoURL',
      color: '#3D95CE',
      placeholder: '@yourvenmoname',
      description: 'Your Venmo username (include @ symbol)',
      validation: (url: string) => {
        if (url && !url.startsWith('@')) {
          return 'Venmo username should start with @';
        }
        return null;
      }
    },
    {
      id: 'cashapp',
      name: 'CashApp',
      icon: <FaDollarSign size={16} />,
      urlKey: 'cashappURL',
      color: '#00D632',
      placeholder: '$yourcashtag',
      description: 'Your CashApp tag (include $ symbol)',
      validation: (url: string) => {
        if (url && !url.startsWith('$')) {
          return 'CashApp tag should start with $';
        }
        return null;
      }
    },
    {
      id: 'zelle',
      name: 'Zelle',
      icon: <FaDollarSign size={16} />,
      urlKey: 'zelleURL',
      color: '#6C1C99',
      placeholder: 'your-email@example.com',
      description: 'Email or phone number linked to Zelle'
    },
    {
      id: 'applepay',
      name: 'Apple Pay',
      icon: <FaApple size={16} />,
      urlKey: 'applePayURL',
      color: '#000000',
      placeholder: 'your-email@example.com',
      description: 'Email or phone linked to Apple Pay'
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      icon: <FaGoogle size={16} />,
      urlKey: 'googlePayURL',
      color: '#4285F4',
      placeholder: 'your-email@example.com',
      description: 'Email or phone linked to Google Pay'
    },
    {
      id: 'patreon',
      name: 'Patreon',
      icon: <FaPatreon size={16} />,
      urlKey: 'patreonURL',
      color: '#FF424D',
      placeholder: 'https://www.patreon.com/yourname',
      description: 'Monthly subscription support platform',
      validation: (url: string) => {
        if (url && !url.includes('patreon.com/')) {
          return 'Please enter a valid Patreon URL';
        }
        return null;
      }
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      icon: <FaBitcoin size={16} />,
      urlKey: 'bitcoinURL',
      color: '#F7931A',
      placeholder: 'bc1qxy2kgdygjrsqtzq2n0yrf2439s...',
      description: 'Your Bitcoin wallet address'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      icon: <FaEthereum size={16} />,
      urlKey: 'ethereumURL',
      color: '#627EEA',
      placeholder: '0x742b8b8a0e5c6a9c6a2c8b9c...',
      description: 'Your Ethereum wallet address'
    }
  ];

  const handleSave = async (service: TipService) => {
    if (!profile || !user) return;
    
    const url = profile[service.urlKey]?.trim() || '';
    
    // Validate if validation function exists
    if (service.validation && url) {
      const error = service.validation(url);
      if (error) {
        alert(error);
        return;
      }
    }
    
    setSavingField(service.urlKey);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [service.urlKey]: url
      });
      
      setSavedField(service.urlKey);
      setTimeout(() => setSavedField(null), 2000);
    } catch (err) {
      console.error('Failed to save URL:', err);
      alert('Error saving URL. Please try again.');
    } finally {
      setSavingField(null);
    }
  };

  const handleInputChange = (service: TipService, value: string) => {
    setProfile((prev: any) => prev ? { ...prev, [service.urlKey]: value } : prev);
  };

  return (
    <div style={{ 
      marginBottom: 30,
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '12px',
      background: '#f9f9f9'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '20px' }}>
        💰 Tip Settings
      </h3>
      <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px', lineHeight: 1.5 }}>
        Configure your tip links to receive donations from viewers. Only filled-in services will appear in your tip dropdown menu.
      </p>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        {tipServices.map((service) => (
          <div key={service.id} style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
              gap: '8px'
            }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: service.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: service.color === '#FFDD00' ? '#333' : 'white'
                }}
              >
                {service.icon}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {service.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {service.description}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={profile?.[service.urlKey] || ''}
                onChange={(e) => handleInputChange(service, e.target.value)}
                placeholder={service.placeholder}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => handleSave(service)}
                disabled={savingField === service.urlKey}
                style={{
                  backgroundColor: savedField === service.urlKey ? '#28a745' : '#007aff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  cursor: savingField === service.urlKey ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '80px',
                  justifyContent: 'center'
                }}
              >
                {savingField === service.urlKey ? (
                  <FaSpinner className="fa-spin" size={12} />
                ) : savedField === service.urlKey ? (
                  <FaCheck size={12} />
                ) : null}
                {savingField === service.urlKey ? 'Saving...' : 
                 savedField === service.urlKey ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#e8f4fd',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#0066cc'
      }}>
        <strong>💡 Tip:</strong> Only services with URLs will appear in your tip dropdown. 
        Leave fields empty if you don't want to offer that payment method.
      </div>
    </div>
  );
};

export default TipSettingsSection; 