// Studio Access Control Hook - Manages access to Vostcard Studio features
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface StudioPermissions {
  canAccess: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManageTemplates: boolean;
  canViewAnalytics: boolean;
  canBatchEdit: boolean;
  canAccessAdvancedTools: boolean;
  role: 'none' | 'guide' | 'admin' | 'user';
  restrictions: string[];
}

export interface StudioAccessInfo {
  hasAccess: boolean;
  permissions: StudioPermissions;
  userRole: string | null;
  accessReason: string;
  upgradeMessage?: string;
}

const STUDIO_ROLES = ['admin', 'guide', 'user'] as const;
type StudioRole = typeof STUDIO_ROLES[number];

export const useStudioAccess = (): StudioAccessInfo => {
  const { user, userRole } = useAuth();

  const accessInfo = useMemo<StudioAccessInfo>(() => {
    // No user logged in
    if (!user) {
      return {
        hasAccess: false,
        permissions: getDefaultPermissions(),
        userRole: null,
        accessReason: 'User not authenticated',
        upgradeMessage: 'Please log in to access Vostcard Studio'
      };
    }

    // All authenticated users have studio access now
    // Map userRole to studio role, defaulting to 'user' for regular users
    let studioRole: StudioRole;
    if (userRole === 'admin') {
      studioRole = 'admin';
    } else if (userRole === 'guide') {
      studioRole = 'guide';
    } else {
      studioRole = 'user'; // Default for all other authenticated users
    }

    // Grant access with role-specific permissions
    const permissions = getRolePermissions(studioRole);
    
    return {
      hasAccess: true,
      permissions,
      userRole: userRole,
      accessReason: `Access granted for role: ${userRole}`
    };
  }, [user, userRole]);

  return accessInfo;
};

/**
 * Get default (no access) permissions
 */
function getDefaultPermissions(): StudioPermissions {
  return {
    canAccess: false,
    canEdit: false,
    canDelete: false,
    canPublish: false,
    canManageTemplates: false,
    canViewAnalytics: false,
    canBatchEdit: false,
    canAccessAdvancedTools: false,
    role: 'none',
    restrictions: ['No studio access']
  };
}

/**
 * Get role-specific permissions for studio access
 */
function getRolePermissions(role: StudioRole): StudioPermissions {
  const basePermissions = {
    canAccess: true,
    restrictions: [] as string[]
  };

  switch (role) {
    case 'admin':
      return {
        ...basePermissions,
        canEdit: true,
        canDelete: true,
        canPublish: true,
        canManageTemplates: true,
        canViewAnalytics: true,
        canBatchEdit: true,
        canAccessAdvancedTools: true,
        role: 'admin'
      };

    case 'guide':
      return {
        ...basePermissions,
        canEdit: true,
        canDelete: false, // Guides cannot delete others' content
        canPublish: true,
        canManageTemplates: true,
        canViewAnalytics: true,
        canBatchEdit: true,
        canAccessAdvancedTools: true,
        role: 'guide',
        restrictions: ['Cannot delete vostcards created by others']
      };

    case 'user':
      return {
        ...basePermissions,
        canEdit: true,
        canDelete: false, // Regular users cannot delete others' content
        canPublish: true,
        canManageTemplates: false, // Regular users cannot manage templates
        canViewAnalytics: false, // Regular users cannot view analytics
        canBatchEdit: true,
        canAccessAdvancedTools: false, // Regular users have limited advanced tools
        role: 'user',
        restrictions: [
          'Cannot delete vostcards created by others',
          'Cannot manage templates',
          'Cannot view analytics',
          'Limited advanced tools access'
        ]
      };

    default:
      return getDefaultPermissions();
  }
}

/**
 * Hook to check specific studio permission
 */
export const useStudioPermission = (permission: keyof Omit<StudioPermissions, 'role' | 'restrictions'>) => {
  const { permissions } = useStudioAccess();
  return permissions[permission];
};

/**
 * Hook to get user's studio role
 */
export const useStudioRole = () => {
  const { permissions } = useStudioAccess();
  return permissions.role;
};

/**
 * Check if current user can perform action on specific vostcard
 */
export const useCanEditVostcard = (vostcardUserId?: string) => {
  const { user } = useAuth();
  const { permissions } = useStudioAccess();

  return useMemo(() => {
    if (!permissions.canEdit) return false;
    if (permissions.role === 'admin') return true; // Admins can edit anything
    if (!vostcardUserId || !user?.uid) return false;
    
    // Guides can edit their own content or if no specific user
    return vostcardUserId === user.uid;
  }, [permissions, vostcardUserId, user?.uid]);
};

/**
 * Check if current user can delete specific vostcard
 */
export const useCanDeleteVostcard = (vostcardUserId?: string) => {
  const { user } = useAuth();
  const { permissions } = useStudioAccess();

  return useMemo(() => {
    if (!permissions.canDelete) return false;
    if (permissions.role === 'admin') return true; // Admins can delete anything
    if (!vostcardUserId || !user?.uid) return false;
    
    // Only delete own content for non-admins
    return vostcardUserId === user.uid;
  }, [permissions, vostcardUserId, user?.uid]);
};

/**
 * Get studio access summary for UI display
 */
export const useStudioAccessSummary = () => {
  const accessInfo = useStudioAccess();
  
  return useMemo(() => {
    const { hasAccess, permissions, userRole } = accessInfo;
    
    if (!hasAccess) {
      return {
        status: 'denied' as const,
        message: accessInfo.upgradeMessage || accessInfo.accessReason,
        roleDisplay: userRole || 'None',
        capabilitiesCount: 0
      };
    }

    const capabilities = Object.entries(permissions)
      .filter(([key, value]) => 
        key.startsWith('can') && value === true
      ).length;

    return {
      status: 'granted' as const,
      message: `Full studio access with ${permissions.role} privileges`,
      roleDisplay: permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1),
      capabilitiesCount: capabilities,
      restrictions: permissions.restrictions
    };
  }, [accessInfo]);
}; 