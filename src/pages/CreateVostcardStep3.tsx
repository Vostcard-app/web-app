import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVostcard } from '../context/VostcardContext';
import { FaArrowLeft } from 'react-icons/fa';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const CreateVostcardStep3: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentVostcard,
    updateVostcard,
    saveLocalVostcard,
    postVostcard,
    clearVostcard,
  } = useVostcard();
  const { title = '', description = '', categories = [], photos = [] } = currentVostcard || {};

  const [customCategory, setCustomCategory] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const availableCategories = ['Nature', 'History', 'Food', 'Culture', 'Landmark'];

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      updateVostcard({ categories: categories.filter((c) => c !== category) });
    } else {
      updateVostcard({ categories: [...categories, category] });
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim() !== '') {
      updateVostcard({ categories: [...categories, customCategory.trim()] });
      setCustomCategory('');
    }
  };

  const handleSaveChanges = () => {
    saveLocalVostcard();
    navigate('/home');
  };

  const handlePost = async () => {
    try {
      await postVostcard();
      clearVostcard();
      navigate('/home');
    } catch (error) {
      console.error('Error posting:', error);
      alert('Failed to post. Try again.');
    }
  };

  const isPostEnabled =
    title.trim() !== '' &&
    description.trim() !== '' &&
    categories.length > 0 &&
    photos.length >= 2;

  return (
    <div style={{ backgroundColor: 'white', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🔵 Header */}
      <div style={{
        backgroundColor: '#002B4D',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}>
        <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>Vōstcard</div>
        <FaArrowLeft
          size={28}
          color="white"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
      </div>

      {/* 📝 Form */}
      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input
            value={title}
            onChange={(e) => updateVostcard({ title: e.target.value })}
            placeholder="Enter Title"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => updateVostcard({ description: e.target.value })}
            placeholder="Enter Description"
            rows={4}
            style={textareaStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Categories</label>
          <div
            onClick={() => setIsCategoryModalOpen(true)}
            style={categorySelectStyle}
          >
            Select Categories
          </div>

          {categories.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {categories.map((cat) => (
                <div key={cat} style={{ backgroundColor: '#eee', padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>
                  {cat}
                </div>
              ))}
            </div>
          )}

          <input
            placeholder="Add Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          />
          <button
            onClick={handleAddCustomCategory}
            style={addButtonStyle}
          >
            +
          </button>
        </div>

        <div>
          <label style={labelStyle}>Photos</label>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {currentVostcard.photo1Preview ? (
              <img
                src={currentVostcard.photo1Preview}
                alt="Photo 1"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: 120, height: 120, backgroundColor: '#eee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No Photo 1
              </div>
            )}
            {currentVostcard.photo2Preview ? (
              <img
                src={currentVostcard.photo2Preview}
                alt="Photo 2"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: 120, height: 120, backgroundColor: '#eee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No Photo 2
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔘 Buttons */}
      <div style={{ padding: 16 }}>
        <button
          onClick={handleSaveChanges}
          style={saveButtonStyle}
        >
          Save Changes
        </button>

        {!isPostEnabled && (
          <div style={missingTextStyle}>
            Missing: Title, Description, Photos, or Categories
          </div>
        )}

        <button
          onClick={handlePost}
          disabled={!isPostEnabled}
          style={{
            ...postButtonStyle,
            backgroundColor: isPostEnabled ? '#002B4D' : '#aaa'
          }}
        >
          Post to Map
        </button>
      </div>

      {/* ✅ Category Modal */}
      {isCategoryModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Select Categories</h3>
            {availableCategories.map((cat) => (
              <div
                key={cat}
                style={categoryItemStyle}
                onClick={() => handleCategoryToggle(cat)}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  readOnly
                />
                <span style={{ marginLeft: 8 }}>{cat}</span>
              </div>
            ))}
            <button
              style={doneButtonStyle}
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 4
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  marginBottom: 16
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 100
};

const categorySelectStyle: React.CSSProperties = {
  backgroundColor: '#eee',
  padding: '12px',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 8
};

const addButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 12px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#002B4D',
  color: 'white',
  cursor: 'pointer'
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  cursor: 'pointer'
};

const postButtonStyle: React.CSSProperties = {
  color: 'white',
  border: 'none',
  width: '100%',
  padding: '14px',
  borderRadius: 8,
  fontSize: 18,
  marginTop: 10,
  cursor: 'pointer'
};

const missingTextStyle: React.CSSProperties = {
  color: 'orange',
  marginTop: 8,
  textAlign: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 12,
  width: '80%',
  maxWidth: 400,
};

const categoryItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 10,
  cursor: 'pointer',
};

const doneButtonStyle: React.CSSProperties = {
  marginTop: 20,
  backgroundColor: '#002B4D',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  cursor: 'pointer',
};

export default CreateVostcardStep3;