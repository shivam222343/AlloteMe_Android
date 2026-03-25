import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCAL_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5100/api/' : 'http://localhost:5100/api/';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com/api/';
const API_BASE_URL = RENDER_URL;

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
    (error) => {
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (credentials) => api.post('auth/login', credentials),
    register: (userData) => api.post('auth/register', userData),
    getProfile: () => api.get('auth/profile'),
    updateProfile: (userData) => api.put('auth/profile', userData),
    changePassword: (data) => api.post('auth/change-password', data),
    toggleSave: (collegeId) => api.post('auth/toggle-save', { collegeId }),
};

export const institutionAPI = {
    getAll: () => api.get('institutions'),
    getById: (id) => api.get(`institutions/${id}`),
    create: (data) => api.post('institutions', data),
    update: (id, data) => api.put(`institutions/${id}`, data),
    delete: (id) => api.delete(`institutions/${id}`),
    deleteBranch: (id, name) => api.delete(`institutions/${id}/branches/${encodeURIComponent(name)}`),
    getFeatured: () => api.get('institutions/featured'),
    toggleFeature: (id) => api.put(`institutions/${id}/feature`),
    parse: (text) => api.post('institutions/parse', { text }),
};

export const cutoffAPI = {
    add: (data) => api.post('cutoffs', data),
    bulkAdd: (data) => api.post('cutoffs/bulk', data),
    getByInstitution: (id) => api.get(`cutoffs/${id}`),
    predict: (params) => api.get('cutoffs/predict', { params }),
    parse: (text) => api.post('cutoffs/parse', { text }),
    parseBulk: (text) => api.post('cutoffs/parse-bulk', { text }),
    delete: (id, branch, params) => api.delete(`cutoffs/${id}/branch/${branch}`, { params }),
    estimateRank: (percentile) => api.get('cutoffs/estimate-rank', { params: { percentile } }),
};

export const aiAPI = {
    counsel: (payload) => api.post('ai/counsel', payload),
    getChats: () => api.get('ai/chats'),
    saveChat: (data) => api.post('ai/chats', data),
    trainAI: (data) => api.post('ai/train', data),
    getFrequentQuestions: () => api.get('ai/frequent-questions'),
    setFrequentQuestion: (data) => api.post('ai/frequent-questions', data),
};

export const notificationAPI = {
    getAll: () => api.get('notifications'),
    markAllRead: () => api.put('notifications/read-all'),
    deleteAll: () => api.delete('notifications/all'),
};

export const uploadAPI = {
    upload: (formData, config = {}) => api.post('upload', formData, config),
};

export default api;
