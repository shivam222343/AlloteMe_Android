import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_URL = 'http://192.168.1.29:5100/api';
const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com/api';
const API_BASE_URL = RENDER_URL; // Update with your local IP for dev when testing locally

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
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
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/profile'),
};

export const institutionAPI = {
    getAll: () => api.get('/institutions'),
    getById: (id) => api.get(`/institutions/${id}`),
    create: (data) => api.post('/institutions', data),
    parse: (text) => api.post('/institutions/parse', { text }),
};

export const cutoffAPI = {
    add: (data) => api.post('/cutoffs', data),
    getByInstitution: (id) => api.get(`/cutoffs/${id}`),
    predict: (params) => api.get('/cutoffs/predict', { params }),
};

export const aiAPI = {
    counsel: (message, context) => api.post('/ai/counsel', { message, context }),
};

export default api;
