import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/theme';

/**
 * Hook to handle Web-based media upload fallback
 */
export const useWebUpload = () => {
    const startWebUpload = async (options = {}) => {
        const { type = 'media', clubId = '', messageType = '' } = options;

        try {
            const token = await AsyncStorage.getItem('backendToken');
            if (!token) {
                throw new Error('User not authenticated');
            }

            // Construct the web upload URL with token and context
            const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
            const redirectUrl = encodeURIComponent(Linking.createURL('upload-success'));
            const uploadUrl = `${baseUrl}/api/web-upload?token=${token}&type=${type}&clubId=${clubId}&messageType=${messageType}&redirectUrl=${redirectUrl}`;

            console.log('[WebUpload] Opening browser for:', uploadUrl);
            console.log('[WebUpload] Expecting redirect to:', decodeURIComponent(redirectUrl));

            // Use WebBrowser to open the upload page
            // We use openAuthSessionAsync because it handles the redirect back to the app better
            const result = await WebBrowser.openAuthSessionAsync(
                uploadUrl,
                Linking.createURL('upload-success')
            );

            console.log('[WebUpload] Browser result:', result);

            if (result.type === 'success' && result.url) {
                // Parse the URL to get the uploaded media info
                const { queryParams } = Linking.parse(result.url);

                if (queryParams && queryParams.url) {
                    return {
                        success: true,
                        url: decodeURIComponent(queryParams.url),
                        publicId: queryParams.publicId ? decodeURIComponent(queryParams.publicId) : ''
                    };
                }

                if (queryParams && queryParams.error) {
                    return {
                        success: false,
                        message: decodeURIComponent(queryParams.error)
                    };
                }

                if (queryParams && queryParams.status === 'cancelled') {
                    return {
                        success: false,
                        message: 'Upload cancelled'
                    };
                }
            }

            return { success: false, message: 'Upload cancelled or failed' };
        } catch (error) {
            console.error('[WebUpload] Error:', error);
            return { success: false, message: error.message };
        }
    };

    return { startWebUpload };
};
