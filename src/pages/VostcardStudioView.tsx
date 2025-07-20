// Vostcard Studio - Professional content creation and management interface
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaHome, FaEdit, FaPlus, FaChartBar, FaImages, FaUsers, FaCog, 
  FaFileImport, FaFileExport, FaSearch, FaFilter, FaSort, FaBrush,
  FaPlay, FaEye, FaTrash, FaCopy, FaDownload, FaUpload, FaSave,
  FaLightbulb, FaRocket, FaPalette, FaVideo, FaLayerGroup
} from 'react-icons/fa';
import { useStudioAccess, useStudioAccessSummary } from '../hooks/useStudioAccess';
import { useAuth } from '../context/AuthContext';
import { useVostcard } from '../context/VostcardContext';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import AdvancedEditor from '../components/studio/AdvancedEditor';
import BatchOperations from '../components/studio/BatchOperations';
import type { Vostcard } from '../types/VostcardTypes';

type StudioView = 
  | 'dashboard' 
  | 'editor' 
  | 'batch' 
  | 'templates' 
  | 'analytics' 
  | 'media' 
  | 'settings';

interface StudioStats {
  totalVostcards: number;
  publishedVostcards: number;
  draftVostcards: number;
  totalViews: number;
  totalLikes: number;
  averageRating: number;
}

const VostcardStudioView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, upgradeMessage } = useStudioAccess();
  const studioSummary = useStudioAccessSummary();
  const { savedVostcards, postedVostcards, loadAllLocalVostcards, loadPostedVostcards } = useVostcard();

  const [currentView, setCurrentView] = useState<StudioView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StudioStats>({
    totalVostcards: 0,
    publishedVostcards: 0,
    draftVostcards: 0,
    totalViews: 0,
    totalLikes: 0,
    averageRating: 4.2
  });

  // Check access and redirect if needed
  useEffect(() => {
    if (!hasAccess) {
      // Don't redirect immediately, show access denied message
      setIsLoading(false);
      return;
    }
    
    // Load studio data
    loadStudioData();
  }, [hasAccess]);

  const loadStudioData = async () => {
    try {
      setIsLoading(true);
      
      // Load vostcard data
      await Promise.all([
        loadAllLocalVostcards(),
        loadPostedVostcards()
      ]);

      // Calculate stats
      const totalDrafts = savedVostcards.length;
      const totalPublished = postedVostcards.length;
      
      setStats({
        totalVostcards: totalDrafts + totalPublished,
        publishedVostcards: totalPublished,
        draftVostcards: totalDrafts,
        totalViews: Math.floor(Math.random() * 10000), // Mock data
        totalLikes: Math.floor(Math.random() * 1000),
        averageRating: 4.2 + (Math.random() - 0.5) * 0.6
      });

    } catch (error) {
      console.error('Failed to load studio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Access denied screen
  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <FaRocket size={48} color="#ff6b35" style={{ marginBottom: '20px' }} />
          <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
            Vostcard Studio Access Required
          </h2>
          <p style={{ color: '#666', marginBottom: '25px', lineHeight: 1.6 }}>
            {upgradeMessage}
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <strong>Your Status:</strong> {studioSummary.roleDisplay}
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading Vostcard Studio..." size="large" />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex'
    }}>
      {/* Studio Sidebar */}
      <StudioSidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        userRole={studioSummary.roleDisplay}
      />
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Studio Header */}
        <StudioHeader 
          currentView={currentView}
          stats={stats}
          onHomeClick={() => navigate('/home')}
        />
        
        {/* Content Area */}
        <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
          {currentView === 'dashboard' && <StudioDashboard stats={stats} />}
          {currentView === 'editor' && <StudioEditor />}
          {currentView === 'batch' && <StudioBatchOperations />}
          {currentView === 'templates' && <StudioTemplates />}
          {currentView === 'analytics' && <StudioAnalytics />}
          {currentView === 'media' && <StudioMediaManager />}
          {currentView === 'settings' && <StudioSettings />}
        </div>
      </div>
    </div>
  );
};

// Studio Sidebar Component
interface StudioSidebarProps {
  currentView: StudioView;
  onViewChange: (view: StudioView) => void;
  userRole: string;
}

const StudioSidebar: React.FC<StudioSidebarProps> = ({ currentView, onViewChange, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaChartBar, color: '#007bff' },
    { id: 'editor', label: 'Advanced Editor', icon: FaEdit, color: '#28a745' },
    { id: 'batch', label: 'Batch Operations', icon: FaLayerGroup, color: '#6f42c1' },
    { id: 'templates', label: 'Templates', icon: FaBrush, color: '#fd7e14' },
    { id: 'analytics', label: 'Analytics', icon: FaChartBar, color: '#20c997' },
    { id: 'media', label: 'Media Manager', icon: FaImages, color: '#e83e8c' },
    { id: 'settings', label: 'Studio Settings', icon: FaCog, color: '#6c757d' }
  ] as const;

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#2c3e50',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Studio Logo */}
      <div style={{
        padding: '25px 20px',
        borderBottom: '1px solid #34495e',
        textAlign: 'center'
      }}>
        <FaRocket size={32} color="#ff6b35" style={{ marginBottom: '10px' }} />
        <h2 style={{ 
          margin: 0, 
          fontSize: '22px',
          background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          Vostcard Studio
        </h2>
        <div style={{ 
          fontSize: '12px', 
          color: '#95a5a6', 
          marginTop: '5px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {userRole} Access
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: '20px 0' }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as StudioView)}
            style={{
              width: '100%',
              padding: '15px 25px',
              backgroundColor: currentView === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              borderLeft: currentView === item.id ? '4px solid #ff6b35' : '4px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (currentView !== item.id) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== item.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <item.icon size={18} color={item.color} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Studio Info */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #34495e',
        fontSize: '12px',
        color: '#95a5a6'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Studio Version:</strong> 2.0.0
        </div>
        <div>
          <strong>Last Updated:</strong> Today
        </div>
      </div>
    </div>
  );
};

// Studio Header Component
interface StudioHeaderProps {
  currentView: StudioView;
  stats: StudioStats;
  onHomeClick: () => void;
}

const StudioHeader: React.FC<StudioHeaderProps> = ({ currentView, stats, onHomeClick }) => {
  const viewTitles = {
    dashboard: 'Studio Dashboard',
    editor: 'Advanced Editor',
    batch: 'Batch Operations',
    templates: 'Template Manager',
    analytics: 'Analytics & Insights',
    media: 'Media Manager',
    settings: 'Studio Settings'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px 30px',
      borderBottom: '1px solid #dee2e6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div>
        <h1 style={{ 
          margin: '0 0 5px 0', 
          fontSize: '28px', 
          color: '#2c3e50',
          fontWeight: '600'
        }}>
          {viewTitles[currentView]}
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#6c757d', 
          fontSize: '14px' 
        }}>
          Professional content creation and management tools
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Quick Stats */}
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          fontSize: '14px' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#28a745' }}>
              {stats.publishedVostcards}
            </div>
            <div style={{ color: '#6c757d' }}>Published</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color: '#ffc107' }}>
              {stats.draftVostcards}
            </div>
            <div style={{ color: '#6c757d' }}>Drafts</div>
          </div>
        </div>

        {/* Home Button */}
        <button
          onClick={onHomeClick}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <FaHome size={16} />
          Exit Studio
        </button>
      </div>
    </div>
  );
};

// Studio Dashboard Component
interface StudioDashboardProps {
  stats: StudioStats;
}

const StudioDashboard: React.FC<StudioDashboardProps> = ({ stats }) => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Section */}
      <div style={{
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '32px' }}>
          Welcome to Vostcard Studio
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '18px', opacity: 0.9 }}>
          Professional tools for creating, managing, and analyzing your vostcard content
        </p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '12px 25px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <FaPlus style={{ marginRight: '8px' }} />
            Create New
          </button>
          <button style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '12px 25px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            <FaFileImport style={{ marginRight: '8px' }} />
            Import Content
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <StatsCard 
          title="Total Vostcards" 
          value={stats.totalVostcards.toString()} 
          icon={FaVideo} 
          color="#007bff"
          change="+12%" 
        />
        <StatsCard 
          title="Published" 
          value={stats.publishedVostcards.toString()} 
          icon={FaRocket} 
          color="#28a745"
          change="+8%" 
        />
        <StatsCard 
          title="Total Views" 
          value={stats.totalViews.toLocaleString()} 
          icon={FaEye} 
          color="#17a2b8"
          change="+23%" 
        />
        <StatsCard 
          title="Average Rating" 
          value={stats.averageRating.toFixed(1)} 
          icon={FaLightbulb} 
          color="#ffc107"
          change="+0.3" 
        />
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Quick Actions</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <QuickActionButton icon={FaEdit} title="Advanced Editor" description="Create with professional tools" />
          <QuickActionButton icon={FaBrush} title="Use Template" description="Start from a template" />
          <QuickActionButton icon={FaLayerGroup} title="Batch Edit" description="Edit multiple vostcards" />
          <QuickActionButton icon={FaChartBar} title="View Analytics" description="See performance insights" />
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  change?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, change }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid #f1f3f4'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
      <Icon size={24} color={color} />
      {change && (
        <span style={{ 
          color: change.startsWith('+') ? '#28a745' : '#dc3545',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {change}
        </span>
      )}
    </div>
    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
      {value}
    </div>
    <div style={{ color: '#6c757d', fontSize: '14px' }}>
      {title}
    </div>
  </div>
);

// Quick Action Button Component
interface QuickActionButtonProps {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, title, description }) => (
  <button style={{
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#e9ecef';
    e.currentTarget.style.borderColor = '#dee2e6';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#f8f9fa';
    e.currentTarget.style.borderColor = '#e9ecef';
  }}>
    <Icon size={20} />
    <div style={{ fontWeight: 'bold', margin: '10px 0 5px 0' }}>{title}</div>
    <div style={{ fontSize: '12px', color: '#6c757d' }}>{description}</div>
  </button>
);

// Advanced Editor component
const StudioEditor = () => <AdvancedEditor />;

const StudioBatchOperations = () => <BatchOperations />;

const StudioTemplates = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaBrush size={48} color="#fd7e14" />
    <h2>Template Manager</h2>
    <p>Template creation and management coming soon...</p>
  </div>
);

const StudioAnalytics = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaChartBar size={48} color="#20c997" />
    <h2>Analytics & Insights</h2>
    <p>Detailed performance analytics coming soon...</p>
  </div>
);

const StudioMediaManager = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaImages size={48} color="#e83e8c" />
    <h2>Media Manager</h2>
    <p>Advanced media management tools coming soon...</p>
  </div>
);

const StudioSettings = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <FaCog size={48} color="#6c757d" />
    <h2>Studio Settings</h2>
    <p>Studio configuration options coming soon...</p>
  </div>
);

export default VostcardStudioView; 