import React from 'react';
import { useResponsive } from '../hooks/useResponsive';

const ExampleView: React.FC = () => {
  const { isContainerized, containerWidth } = useResponsive();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      // Remove any existing desktop-specific styling since ResponsiveContainer handles it
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', // Use sticky instead of fixed for better container behavior
        top: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        padding: '16px',
        borderBottom: '1px solid #eee'
      }}>
        <h1>Example View</h1>
      </div>

      {/* Content */}
      <div style={{ 