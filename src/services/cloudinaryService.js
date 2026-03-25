import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { API_CONFIG } from '../constants/theme';

/**
 * Cloudinary Configuration
 * NOTE: For production, these should ideally come from environment variables or a secure config.
 * Since this is a direct-to-Cloudinary upload, we use an unsigned preset.
 */
const CLOUDINARY_CLOUD_NAME = 'dmx7wqp5u'; // Placeholder - user should verify
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // Placeholder - user should verify
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for all platforms (Android can handle this easily now)

/**
 * Validates and prepares file for upload
 * @param {string|object} fileRef - Local file URI or File object (Web)
 * @returns {Promise<object>} - Prepared file info
 */
export const prepareFile = async (fileRef) => {
    try {
        if (Platform.OS === 'web') {
            // fileRef might be a File object, a Blob, or a blob: URI
            if (typeof fileRef === 'object' && (fileRef instanceof File || fileRef instanceof Blob)) {
                return fileRef;
            }

            const uri = typeof fileRef === 'object' ? fileRef.uri : fileRef;
            if (uri && (uri.startsWith('blob:') || uri.startsWith('data:'))) {
                const response = await fetch(uri);
                const blob = await response.blob();
                const extension = blob.type.split('/')[1] || 'jpg';
                const fileName = `upload_${Date.now()}.${extension}`;
                return new File([blob], fileName, { type: blob.type });
            }

            // Fallback for web URI strings
            return fileRef;
        }

        // Mobile logic
        const uri = fileRef;
        const fileInfo = await FileSystem.getInfoAsync(uri);

        if (!fileInfo.exists) {
            throw new Error('File does not exist');
        }

        if (fileInfo.size > MAX_FILE_SIZE) {
            throw new Error('File size exceeds 20MB limit');
        }

        const fileName = uri.split('/').pop();
        let extension = fileName.split('.').pop().toLowerCase();

        // If no extension found (file name matches extension), default to jpg
        if (extension === fileName.toLowerCase()) {
            extension = 'jpg';
        }

        let type = 'image/jpeg'; // Default
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', '3gp', 'webm'];
        const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];

        if (videoExts.includes(extension)) type = `video/${extension === 'mov' ? 'quicktime' : 'mp4'}`;
        else if (imageExts.includes(extension)) type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        else if (docExts.includes(extension)) type = extension === 'pdf' ? 'application/pdf' : 'application/octet-stream';
        else type = 'application/octet-stream';

        const finalName = (fileName.toLowerCase().endsWith('.' + extension))
            ? fileName
            : `${fileName}.${extension}`;

        // IMPORTANT FOR ANDROID: FormData REQUIRES 'file://' prefix to work correctly
        // Removing it causes the upload to fail on Android.
        const normalizedUri = Platform.OS === 'android' ? (uri.startsWith('file://') ? uri : `file://${uri}`) : uri;

        return {
            uri: normalizedUri,
            type,
            name: finalName,
        };
    } catch (error) {
        console.error('[CloudinaryService] Preparation error:', error);
        throw error;
    }
};

/**
 * Uploads media directly to Cloudinary or via backend proxy
 * @param {string} uri - Local URI
 * @param {boolean} direct - Whether to upload directly to Cloudinary
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} - Upload result
 */
export const uploadMedia = async (uri, direct = false, onProgress = null) => {
    try {
        const file = await prepareFile(uri);
        const formData = new FormData();

        if (direct) {
            // Direct to Cloudinary (Unsigned)
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('resource_type', 'auto');

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[CloudinaryService] API Error:', errorData);
                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const data = await response.json();

            return {
                success: true,
                url: data.secure_url,
                publicId: data.public_id,
                resourceType: data.resource_type,
            };
        } else {
            // BACKEND PROXY UPLOAD (Recommended for Android / Reliability)
            const formData = new FormData();
            formData.append('image', file);

            const { uploadAPI } = require('./api');
            const response = await uploadAPI.upload(formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(progress);
                    }
                },
            });

            if (response.data?.url) {
                return {
                    success: true,
                    url: response.data.url,
                    publicId: response.data.public_id,
                };
            } else {
                throw new Error('Backend upload failed');
            }
        }
    } catch (error) {
        console.error('[CloudinaryService] Upload error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Upload failed',
        };
    }
};

export default {
    uploadMedia,
    prepareFile,
};
