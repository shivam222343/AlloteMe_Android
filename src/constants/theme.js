/**
 * Mavericks App Theme
 * LinkedIn-inspired professional design system
 */

export const Colors = {
    // Primary Colors (LinkedIn Blue)
    primary: {
        50: '#E8F2FF',
        100: '#D1E5FF',
        200: '#A3CBFF',
        300: '#75B1FF',
        400: '#4797FF',
        500: '#0A66C2', // Main LinkedIn Blue
        600: '#0E76A8',
        700: '#0C5A8C',
        800: '#0A4D7A',
        900: '#084068',
    },

    // Secondary Colors (Neutral Grays)
    secondary: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
    },

    // Success Colors (Green)
    success: {
        50: '#F0FDF4',
        100: '#DCFCE7',
        200: '#BBF7D0',
        300: '#86EFAC',
        400: '#4ADE80',
        500: '#22C55E',
        600: '#16A34A',
        700: '#15803D',
        800: '#166534',
        900: '#14532D',
    },

    // Warning Colors (Amber)
    warning: {
        50: '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#F59E0B',
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
    },

    // Error Colors (Red)
    error: {
        50: '#FEF2F2',
        100: '#FEE2E2',
        200: '#FECACA',
        300: '#FCA5A5',
        400: '#F87171',
        500: '#EF4444',
        600: '#DC2626',
        700: '#B91C1C',
        800: '#991B1B',
        900: '#7F1D1D',
    },

    // Info Colors (Blue)
    info: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        200: '#BFDBFE',
        300: '#93C5FD',
        400: '#60A5FA',
        500: '#3B82F6',
        600: '#2563EB',
        700: '#1D4ED8',
        800: '#1E40AF',
        900: '#1E3A8A',
    },

    // Light Mode
    light: {
        background: '#FFFFFF',
        surface: '#F9FAFB',
        card: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        divider: '#F3F4F6',
        shadow: 'rgba(0, 0, 0, 0.1)',
    },

    // Dark Mode
    dark: {
        background: '#111827',
        surface: '#1F2937',
        card: '#374151',
        text: '#F9FAFB',
        textSecondary: '#D1D5DB',
        border: '#4B5563',
        divider: '#374151',
        shadow: 'rgba(0, 0, 0, 0.5)',
    },
};

export const Typography = {
    fontFamily: {
        regular: 'System',
        medium: 'System',
        semibold: 'System',
        bold: 'System',
    },
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },
    fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
    },
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
    '4xl': 64,
};

export const BorderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const Animation = {
    duration: {
        fast: 150,
        normal: 300,
        slow: 500,
    },
    easing: {
        linear: 'linear',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
    },
};

export const Layout = {
    containerPadding: Spacing.md,
    maxWidth: 1200,
    headerHeight: 60,
    tabBarHeight: 60,
};

// Meeting Types
export const MeetingTypes = {
    GENERAL: 'General',
    TECHNICAL: 'Technical',
    WORKSHOP: 'Workshop',
    SOCIAL: 'Social',
    EMERGENCY: 'Emergency',
};

// Meeting Status
export const MeetingStatus = {
    UPCOMING: 'upcoming',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Task Status
export const TaskStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
};

// Task Priority
export const TaskPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};

// User Roles
export const UserRoles = {
    ADMIN: 'admin',
    ALUMNI: 'alumni',
    MEMBER: 'member',
};

// Notification Types
export const NotificationTypes = {
    TASK_ASSIGNED: 'task_assigned',
    TASK_REMINDER: 'task_reminder',
    TASK_COMPLETED: 'task_completed',
    MEETING_CREATED: 'meeting_created',
    MEETING_UPDATED: 'meeting_updated',
    MEETING_CANCELLED: 'meeting_cancelled',
    MEETING_REMINDER: 'meeting_reminder',
    ATTENDANCE_WARNING: 'attendance_warning',
    ABSENCE_APPROVED: 'absence_approved',
    ABSENCE_REJECTED: 'absence_rejected',
    ROLE_CHANGED: 'role_changed',
    CLUB_ANNOUNCEMENT: 'club_announcement',
    NEW_MESSAGE: 'new_message',
    MEMBER_JOINED: 'member_joined',
    MEMBER_REMOVED: 'member_removed',
};

// API Configuration
export const API_CONFIG = {
    BASE_URL: 'https://mavericks-android-backend-1.onrender.com/api',
    SOCKET_URL: 'https://mavericks-android-backend-1.onrender.com',
    TIMEOUT: 120000,
};

export default {
    Colors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Animation,
    Layout,
    MeetingTypes,
    MeetingStatus,
    TaskStatus,
    TaskPriority,
    UserRoles,
    NotificationTypes,
    API_CONFIG,
};
