import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Offer {
  id: string;
  title: string;
  businessName: string;
  distance: number; // distance in meters
}

const OffersListView: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("OffersListView mounted"); // Debug log
    // Placeholder: fetch offers from backend or context
    const mockOffers: Offer[] = [
      { id: '1', title: '50% Off Coffee', businessName: 'Cafe Aroma', distance: 150 },
      { id: '2', title: 'Free Dessert', businessName: 'Sweet Treats', distance: 350 },
    ];
    setOffers(mockOffers);
  }, []);

  const handleOfferClick = (offerId: string) => {
    console.log(`Navigating to offer ${offerId}`); // Debug log
    navigate(`/offer/${offerId}`);
  };

  return (
    <>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Nearby Offers</h1>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {offers.map((offer) => (
            <li
              key={offer.id}
              onClick={() => handleOfferClick(offer.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <h2 style={{ margin: '0 0 4px 0' }}>{offer.title}</h2>
              <p style={{ margin: '0 0 4px 0', color: '#555' }}>{offer.businessName}</p>
              <p style={{ margin: 0, color: '#888' }}>
                {offer.distance} meters away
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default OffersListView;