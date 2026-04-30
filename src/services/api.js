import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100/api/' : 'http://localhost:5100/api/';
const RENDER_URL = 'https://alloteme-e8fn.onrender.com/api/';
// Switch to LOCAL_URL for development, RENDER_URL for production
const API_BASE_URL = RENDER_URL;

export const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Prevent aggressive browser caching across logouts for GET requests
        // Using timestamp param instead of headers to avoid CORS preflight issues with remote backends
        if (config.method && config.method.toLowerCase() === 'get') {
            config.params = {
                ...config.params,
                _t: Date.now()
            };
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

export const authAPI = {
    login: (credentials) => api.post('auth/login', credentials),
    googleLogin: (data) => api.post('auth/google', data),
    signup: (userData) => api.post('auth/register', userData),
    register: (userData) => api.post('auth/register', userData), // Alias used by AuthContext
    sendSignupOtp: (email) => api.post('auth/send-signup-otp', { email }),
    verifyOnlyOtp: (email, otp) => api.post('auth/verify-only-otp', { email, otp }),
    verifySignupOtp: (data) => api.post('auth/verify-signup-otp', data),
    verifyOtp: (data) => api.post('auth/verify-otp', data),
    getProfile: () => api.get('auth/profile'),
    updateProfile: (data) => api.put('auth/profile', data),
    toggleSave: (collegeId) => api.post('auth/toggle-save', { collegeId }),
    toggleSavePrediction: (prediction) => api.post('auth/toggle-save-prediction', { prediction }),
    getStats: (category) => api.get('auth/stats', { params: { category } }),
    getAllUsers: () => api.get('auth/users'),
    getUserById: (id) => api.get(`auth/users/${id}`),
    updateUserRole: (id, data) => api.put(`auth/users/${id}`, data),
    deleteUser: (id) => api.delete(`auth/users/${id}`),
    updateAvatarPreference: (data) => api.post('auth/update-avatar', data),
    verifyPhone: (phone) => api.put('auth/verify-phone', { phone }),
    getAdmins: () => api.get('auth/admins'),
    deleteProfile: () => api.delete('auth/profile'),
    forgotPassword: (email) => api.post('auth/forgot-password', { email }),
    resetPassword: (data) => api.post('auth/reset-password', data),
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
    getAll: (category) => api.get('institutions', { params: { category } }),
    getFeatured: (category) => api.get('institutions/featured', { params: { category } }),
    getById: (id) => api.get(`institutions/${id}`),
    add: (data) => api.post('institutions', data),
    create: (data) => api.post('institutions', data), // Alias for consistency
    update: (id, data) => api.put(`institutions/${id}`, data),
    delete: (id) => api.delete(`institutions/${id}`),
    deleteBranch: (id, branchName) => api.delete(`institutions/${id}/branch`, { params: { branch: branchName } }),
    toggleFeature: (id) => api.put(`institutions/${id}/feature`),
    uploadImage: (formData) => api.post('upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    parse: (text) => api.post('institutions/parse', { text }),
};

export const cutoffAPI = {
    getAll: () => api.get('cutoffs'),
    predict: (data) => api.post('cutoffs/predict', data),
    estimateRank: (percentile, admissionPath) => api.get('cutoffs/estimate-rank', { params: { percentile, admissionPath } }),
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
    generateReview: (rating) => api.post('ai/generate-review', { rating }),
};

export const reviewAPI = {
    submit: (data) => api.post('reviews', data),
    getForInstitution: (id) => api.get(`reviews/institution/${id}`),
    getAllAdmin: () => api.get('reviews/admin'),
    getPublished: () => api.get('reviews'),
    togglePublish: (id) => api.patch(`reviews/publish/${id}`),
    delete: (id) => api.delete(`reviews/${id}`),
};

export const customFormsAPI = {
    create: (data) => api.post('forms', data),
    getAllAdmin: () => api.get('forms'),
    getById: (id) => api.get(`forms/${id}`),
    update: (id, data) => api.put(`forms/${id}`, data),
    delete: (id) => api.delete(`forms/${id}`),
    getResponses: (id) => api.get(`forms/${id}/responses`),
    deleteResponse: (id) => api.delete(`forms/response/${id}`),
};

export const systemAPI = {
    getSettings: () => api.get('system/settings'),
    updateSetting: (data) => api.post('system/settings', data),
    getCoupons: () => api.get('system/coupons'),
    createCoupon: (data) => api.post('system/coupons', data),
    toggleCoupon: (id) => api.put(`system/coupons/${id}/toggle`),
    deleteCoupon: (id) => api.delete(`system/coupons/${id}`),
    validateCoupon: (code) => api.post('system/coupons/validate', { code })
};

export const videoAPI = {
    getAll: (params) => api.get('videos', { params }),
    add: (data) => api.post('videos', data),
    delete: (id) => api.delete(`videos/${id}`)
};

export default {
    authAPI,
    institutionAPI,
    cutoffAPI,
    notificationsAPI,
    aiAPI,
    counselorAPI,
    uploadAPI,
    reviewAPI,
    customFormsAPI,
    systemAPI,
    videoAPI
};
