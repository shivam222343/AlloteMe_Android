import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100/api/' : 'http://localhost:5100/api/';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com/api/';
// Switch to LOCAL_URL for development, RENDER_URL for production
const API_BASE_URL = LOCAL_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const authAPI = {
    login: (credentials) => api.post('auth/login', credentials),
    signup: (userData) => api.post('auth/signup', userData),
    verifyOtp: (data) => api.post('auth/verify-otp', data),
    getProfile: () => api.get('auth/profile'),
    updateProfile: (data) => api.put('auth/profile', data),
    toggleSave: (collegeId) => api.post('auth/toggle-save', { collegeId }),
    getStats: () => api.get('auth/stats'),
    getAllUsers: () => api.get('auth/users'),
    updateUserRole: (id, data) => api.put(`auth/users/${id}`, data),
    deleteUser: (id) => api.delete(`auth/users/${id}`),
    updateAvatarPreference: (data) => api.post('auth/update-avatar', data),
    verifyPhone: (phone) => api.put('auth/verify-phone', { phone }),
};

export const counselorAPI = {
    getAll: () => api.get('counselors'),
    getById: (id) => api.get(`counselors/${id}`),
    add: (data) => api.post('counselors', data),
    update: (id, data) => api.put(`counselors/${id}`, data),
    delete: (id) => api.delete(`counselors/${id}`),
    logAction: (data) => api.post('counselors/log', data),
    getLogs: (id) => api.get(`counselors/${id}/logs`),
};

export const institutionAPI = {
    getAll: () => api.get('institutions'),
    getFeatured: () => api.get('institutions/featured'),
    getById: (id) => api.get(`institutions/${id}`),
    add: (data) => api.post('institutions', data),
    create: (data) => api.post('institutions', data), // Alias for consistency
    update: (id, data) => api.put(`institutions/${id}`, data),
    delete: (id) => api.delete(`institutions/${id}`),
    toggleFeature: (id) => api.put(`institutions/${id}/feature`),
    uploadImage: (formData) => api.post('upload/image', formData),
    parse: (text) => api.post('institutions/parse', { text }),
};

export const cutoffAPI = {
    getAll: () => api.get('cutoffs'),
    predict: (data) => api.post('cutoffs/predict', data),
    estimateRank: (percentile) => api.get('cutoffs/estimate-rank', { params: { percentile } }),
    getByInstitution: (id) => api.get(`cutoffs/${id}`),
    add: (data) => api.post('cutoffs', data),
    bulkAdd: (data) => api.post('cutoffs/bulk', data),
    delete: (institutionId, branch, params) => api.delete(`cutoffs/${institutionId}/branch`, { params: { branch, ...params } }),
    importExcel: (formData) => api.post('cutoffs/import', formData),
    parse: (text) => api.post('cutoffs/parse', { text }),
    parseBulk: (text) => api.post('cutoffs/parse-bulk', { text }),
};

export const uploadAPI = {
    upload: (formData) => api.post('upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const notificationsAPI = {
    getAll: () => api.get('notifications'),
    getUnreadCount: () => api.get('notifications/unread-count'),
    markAsRead: (id) => api.put(`notifications/${id}/read`),
    markAllRead: () => api.put('notifications/read-all'),
    deleteAll: () => api.delete('notifications/all'),
    sendAdminNotification: (data) => api.post('notifications/admin/send', data),
};

export const aiAPI = {
    counsel: (data) => api.post('ai/counsel', data),
    getChats: () => api.get('ai/chats'),
    saveChat: (data) => api.post('ai/chats', data),
    getFrequentQuestions: () => api.get('ai/frequent-questions'),
    trainAI: (data) => api.post('ai/train', data),
    setFrequentQuestion: (data) => api.post('ai/frequent-questions', data),
};

export default {
    authAPI,
    institutionAPI,
    cutoffAPI,
    notificationsAPI,
    aiAPI,
    counselorAPI,
    uploadAPI
};
