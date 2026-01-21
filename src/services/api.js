import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/theme';

// Create axios instance
const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
        'Accept': 'application/json',
    }
});

console.log('[API] Initialized with BASE_URL:', API_CONFIG.BASE_URL);

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
    async (config) => {
        try {
            // Debug reachable URL
            if (__DEV__ && Platform.OS !== 'web') {
                const url = config.url || '';
                const baseURL = config.baseURL || '';
                const fullURL = url.startsWith('http') ? url : baseURL + url;
                if (fullURL.includes('localhost') || fullURL.includes('127.0.0.1')) {
                    console.warn(`[API] WARNING: Using localhost/127.0.0.1 on ${Platform.OS}. This WILL fail on real devices. Use your local IP instead.`);
                }
            }

            const token = await AsyncStorage.getItem('backendToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Handle FormData specifically - more robust check for RN
            const isFormData = config.data && (config.data instanceof FormData || typeof config.data.append === 'function');
            if (isFormData) {
                // In React Native + Axios, deleting Content-Type is the most 
                // reliable way to let the system generate the boundary.
                if (config.headers.delete) {
                    config.headers.delete('Content-Type');
                    config.headers.delete('content-type');
                } else {
                    delete config.headers['Content-Type'];
                    delete config.headers['content-type'];
                }
                console.log(`[API] Processing FormData request to: ${config.url}`);
            } else if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json';
            }
        } catch (error) {
            console.error('Error in request interceptor:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        console.log('API Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });

        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;
            console.log(`[API] Server Error (${status}):`, data);

            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                await AsyncStorage.removeItem('backendToken');
            }

            if (status === 413) {
                return Promise.reject({
                    success: false,
                    message: "File is too large. Please upload a smaller file (Max 200MB for video, 20MB for images)."
                });
            }

            // Handle non-JSON responses (HTML often sent by Nginx/proxies on error)
            if (typeof data === 'string' && data.startsWith('<')) {
                return Promise.reject({
                    success: false,
                    message: `Server Error (${status}). Please try again later.`
                });
            }

            // Return the server's error data or message
            return Promise.reject(data || { success: false, message: 'Unknown server error' });
        } else if (error.request) {
            // Request made but no response - THIS IS THE "NETWORK ERROR" CASE
            console.log('[API] Network Error Details:', {
                message: error.message,
                code: error.code,
                config_url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                // On native, error.request is a XMLHttpRequest
                readyState: error.request?._readyState,
                status: error.request?._status,
            });

            let message = 'Network error. Please check your connection.';
            if (error.code === 'ECONNABORTED') message = 'Request timed out. Please try again.';
            if (error.message === 'Network Error') message = 'Network error. This might be due to a local server not being reachable or CORS issues.';

            return Promise.reject({
                success: false,
                message: message,
                originalError: error.message,
                code: error.code,
                config: error.config,
                url: error.config?.url
            });
        } else {
            // Something else happened
            return Promise.reject({
                success: false,
                message: error.message || 'An unexpected error occurred',
                config: error.config,
                url: error.config?.url
            });
        }
    }
);

// Authentication API
export const authAPI = {
    signup: (data) => api.post('/auth/signup', data),
    signin: (data) => api.post('/auth/signin', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/update-profile', data),
    uploadProfilePicture: (data) => api.post('/auth/upload-profile-picture', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    updateFCMToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken }),
    getDashboard: () => api.get('/auth/dashboard'),
};

// Clubs API
export const clubsAPI = {
    getAll: () => api.get('/clubs'),
    getById: (id) => api.get(`/clubs/${id}`),
    create: (data) => api.post('/clubs', data),
    update: (id, data) => api.put(`/clubs/${id}`, data),
    updateLogoBase64: (id, data) => api.put(`/clubs/${id}/logo-base64`, data, {
        timeout: 600000,
        headers: { 'Content-Type': 'application/json' }
    }),
    delete: (id, superKey) => api.delete(`/clubs/${id}`, { data: { superKey } }),
    join: (accessKey) => api.post('/clubs/join', { accessKey }),
    addMember: (clubId, maverickId) => api.post('/clubs/add-member', { clubId, maverickId }),
    getMembers: (clubId) => api.get(`/clubs/${clubId}/members`),
    getAttendanceWarnings: (clubId) => api.get(`/clubs/${clubId}/members-warnings`),
    removeMember: (clubId, userId) => api.post('/clubs/remove-member', { clubId, userId }),
    generateKey: (clubId, data) => api.post(`/clubs/${clubId}/generate-key`, data),
};

// Meetings API
// Meetings API
export const meetingsAPI = {
    getClubMeetings: (clubId) => api.get(`/meetings/club/${clubId}`),
    getById: (id) => api.get(`/meetings/${id}`),
    create: (data) => api.post('/meetings', data),
    update: (id, data) => api.put(`/meetings/${id}`, data),
    updateStatus: (id, status) => api.put(`/meetings/${id}/status`, { status }),
    delete: (id) => api.delete(`/meetings/${id}`),
    startAttendance: (id) => api.post(`/meetings/${id}/attendance-start`),
    markAttendance: (id, code) => api.post(`/meetings/${id}/attendance`, { code }),
    manualAttendance: (id, userIds, status) => api.post(`/meetings/${id}/manual-attendance`, { userIds, status }),
    requestAbsence: (id, data) => api.post(`/meetings/${id}/absence`, data),
    reviewAbsence: (meetingId, absenceId, data) =>
        api.put(`/meetings/${meetingId}/absence/${absenceId}`, data),
};

// Members API
export const membersAPI = {
    getAll: (clubId) => api.get(`/members/${clubId}`),
    add: (clubId, data) => api.post(`/members/${clubId}`, data),
    remove: (clubId, userId) => api.delete(`/members/${clubId}/${userId}`),
    changeRole: (clubId, userId, role) =>
        api.put(`/members/${clubId}/${userId}/role`, { role }),
};

// Tasks API
export const tasksAPI = {
    getAll: (clubId) => api.get('/tasks', { params: { clubId } }),
    getById: (id) => api.get(`/tasks/${id}`),
    create: (data) => api.post('/tasks', data),
    update: (id, data) => api.put(`/tasks/${id}`, data),
    updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
    delete: (id) => api.delete(`/tasks/${id}`),
};

// Analytics API
export const analyticsAPI = {
    getPersonal: () => api.get('/analytics/personal'),
};

// Notifications API
export const notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
    clearAll: () => api.delete('/notifications/clear-all'),
};

// Messages API
export const messagesAPI = {
    getConversations: () => api.get('/messages/conversations/list'),
    getMessages: (userId) => api.get(`/messages/${userId}`),
    send: (data, file) => {
        if (file) {
            const formData = new FormData();
            formData.append('receiverId', data.receiverId);
            formData.append('content', data.content || '');
            formData.append('type', data.type || 'text');
            if (data.replyTo) formData.append('replyTo', data.replyTo);
            if (data.mentionAI) formData.append('mentionAI', 'true');
            if (data.isForwarded) formData.append('isForwarded', 'true');
            formData.append('file', file);
            return api.post('/messages', formData);
        }
        // Support for web-uploaded files
        if (data.fileUrl) {
            return api.post('/messages', data);
        }
        return api.post('/messages', data);
    },
    sendBase64: (data, onProgress) => api.post('/messages/upload-base64', data, {
        timeout: 600000,
        headers: { 'Content-Type': 'application/json' },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),

    markAsRead: (userId) => api.put(`/messages/${userId}/read`),
    addReaction: (messageId, data) => api.post(`/messages/${messageId}/reaction`, data),
    deleteMessage: (messageId, type) => api.delete(`/messages/${messageId}`, { params: { type } }),
};

// Snaps API
export const snapsAPI = {
    upload: (data, onProgress) => {
        // If data is FormData, proceed as usual
        if (data instanceof FormData) {
            return api.post('/snaps', data, {
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percentCompleted);
                    }
                }
            });
        }
        // If data is plain object (web upload result), send as JSON
        return api.post('/snaps', data);
    },
    uploadBase64: (data, onProgress) => api.post('/snaps/upload-base64', data, {
        timeout: 600000,
        headers: { 'Content-Type': 'application/json' },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),

    getClubSnaps: (clubId) => api.get(`/snaps/club/${clubId}`),
    getMySnaps: () => api.get('/snaps/my-clubs'),
    view: (snapId) => api.post(`/snaps/${snapId}/view`),
    delete: (snapId) => api.delete(`/snaps/${snapId}`),
    getViewers: (snapId) => api.get(`/snaps/${snapId}/viewers`),
    updateCaption: (snapId, caption) => api.put(`/snaps/${snapId}/caption`, { caption }),
    toggleLike: (snapId) => api.post(`/snaps/${snapId}/like`),
};

// Gallery API
export const galleryAPI = {
    getImages: (params) => api.get('/gallery', { params }),
    upload: (formData, onProgress) => api.post('/gallery', formData, {
        timeout: 600000, // 10 minutes for large uploads on mobile
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
                console.log(`Upload progress: ${percentCompleted}%`);
            }
        }
    }),
    uploadBase64: (data, onProgress) => api.post('/gallery/upload-base64', data, {
        timeout: 600000, // 10 minutes for large uploads
        headers: {
            'Content-Type': 'application/json',
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),
    updateStatus: (id, status) => api.put(`/gallery/${id}/status`, { status }),
    toggleLike: (id) => api.post(`/gallery/${id}/like`),
    addComment: (id, text) => api.post(`/gallery/${id}/comment`, { text }),
    getLikes: (id) => api.get(`/gallery/${id}/likes`),
    update: (id, data) => api.put(`/gallery/${id}`, data),
    delete: (id) => api.delete(`/gallery/${id}`),
};

// Admin API
export const adminAPI = {
    getStats: () => api.get('/admin/stats'),
    getAllUsers: () => api.get('/admin/users'),
    changeUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
    generateReports: (params) => api.get('/admin/reports', { params }),
    getClubAttendanceReport: (clubId, months) => api.get(`/admin/attendance-report/${clubId}`, { params: { months } }),
    sendNotification: (data) => api.post('/admin/send-notification', data),
    getGames: () => api.get('/admin/games'),
    updateGameConfig: (data) => api.post('/admin/games', data),
};

// Group Chat API
export const groupChatAPI = {
    getGroupChat: (clubId, params) => api.get(`/group-chat/${clubId}`, { params }),
    sendMessage: (clubId, data, file) => {
        if (file) {
            const formData = new FormData();
            formData.append('content', data.content || '');

            // Validate type before sending
            const validTypes = ['text', 'image', 'video', 'document', 'media', 'file'];
            const type = (data.type && validTypes.includes(data.type)) ? data.type : 'media';
            formData.append('type', type);

            if (data.replyTo) formData.append('replyTo', data.replyTo);
            formData.append('file', file);
            return api.post(`/group-chat/${clubId}/messages`, formData);
        }
        // Support for web-uploaded files
        if (data.fileUrl) {
            return api.post(`/group-chat/${clubId}/messages`, data);
        }
        return api.post(`/group-chat/${clubId}/messages`, data);
    },
    sendBase64Message: (clubId, data, onProgress) => api.post(`/group-chat/${clubId}/messages-base64`, data, {
        timeout: 600000,
        headers: { 'Content-Type': 'application/json' },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),

    markAsRead: (clubId) => api.put(`/group-chat/${clubId}/read`),
    deleteMessage: (clubId, messageId, type) => api.delete(`/group-chat/${clubId}/messages/${messageId}`, { params: { type } }),
    addReaction: (clubId, messageId, data) => api.post(`/group-chat/${clubId}/messages/${messageId}/reaction`, data),
    getUnreadCount: (clubId) => api.get(`/group-chat/${clubId}/unread-count`),
    votePoll: (clubId, messageId, data) => api.post(`/group-chat/${clubId}/messages/${messageId}/vote`, data),
    updateSpinner: (clubId, messageId, data) => api.put(`/group-chat/${clubId}/messages/${messageId}/spin`, data),
    getMessageViewers: (clubId, messageId) => api.get(`/group-chat/${clubId}/messages/${messageId}/viewers`),
    getPollVoters: (clubId, messageId, optionIndex) => api.get(`/group-chat/${clubId}/messages/${messageId}/votes/${optionIndex}`),
};

// Media/Generic Upload API
export const mediaAPI = {
    upload: (formData, onProgress) => api.post('/web-upload', formData, {
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),
    uploadBase64: (data, onProgress) => api.post('/web-upload/base64', data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    })
};

// Live Notes API
export const notesAPI = {
    getAll: (clubId) => api.get('/notes', { params: { clubId } }),
    getById: (id) => api.get(`/notes/${id}`),
    create: (data) => api.post('/notes', data),
    update: (id, data) => api.put(`/notes/${id}`, data),
    delete: (id) => api.delete(`/notes/${id}`),
};

// Events API
export const eventsAPI = {
    getAll: () => api.get('/events'),
    getById: (id) => api.get(`/events/${id}`),
    create: (data) => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    delete: (id) => api.delete(`/events/${id}`),
};

// Resources API
export const resourcesAPI = {
    getByEventId: (eventId) => api.get(`/resources/event/${eventId}`),
    addLink: (data) => api.post('/resources/link', data),
    uploadFile: (data, onProgress) => api.post('/resources/upload', data, {
        timeout: 600000,
        headers: { 'Content-Type': 'application/json' },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    }),
    update: (id, data) => api.put(`/resources/${id}`, data),
    delete: (id) => api.delete(`/resources/${id}`),
};

export default api;
