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

const MAX_FILE_SIZE = Platform.OS === 'android' ? 8 * 1024 * 1024 : 20 * 1024 * 1024; // 8MB for Android, 20MB otherwise

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
        if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) type = 'video/mp4';
        else if (['pdf'].includes(extension)) type = 'application/pdf';
        else if (['jpg', 'jpeg'].includes(extension)) type = 'image/jpeg';
        else if (['png'].includes(extension)) type = 'image/png';
        else if (['gif'].includes(extension)) type = 'image/gif';
        else if (['webp'].includes(extension)) type = 'image/webp';

        const finalName = (fileName.toLowerCase().endsWith('.' + extension))
            ? fileName
            : `${fileName}.${extension}`;

        return {
            uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
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

            const response = await axios.post(CLOUDINARY_URL, formData, {
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(progress);
                    }
                },
            });

            return {
                success: true,
                url: response.data.secure_url,
                publicId: response.data.public_id,
                resourceType: response.data.resource_type,
            };
        } else {
            // Prepared for backend proxy (normalizing format)
            return {
                success: true,
                file: file, // Return normalized file object for local FormData construction
            };
        }
    } catch (error) {
        console.error('[CloudinaryService] Upload error:', error);
        return {
            success: false,
            message: error.message || 'Upload failed',
        };
    }
};

export default {
    uploadMedia,
    prepareFile,
};
