import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';

const HomeView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Menu>
      <MenuButton>
        {/* Hamburger icon or button here */}
      </MenuButton>
      <MenuList>
        <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>Settings</MenuItem>
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin-dashboard')}
            style={{ padding: '10px', width: '100%', textAlign: 'left' }}
          >
            Admin Dashboard
          </button>
        )}
      </MenuList>
    </Menu>
  );
};

export default HomeView;
