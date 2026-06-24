import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';

const RENDER_URL = 'https://alloteme-android-cqdu.onrender.com/api/';

// Simple unauthenticated fetch — no interceptors, no token
const fetchVersionConfig = async () => {
    const response = await axios.get(`${RENDER_URL}system/settings`, { timeout: 8000 });
    return response.data;
};

/**
 * Compares installed app version against admin-set latestAppVersion.
 * Returns { updateRequired: bool, latestVersion: string, isChecking: bool }
 *
 * Logic: if latestAppVersion is set AND currentVersion !== latestAppVersion → updateRequired = true
 */
export default function useAppVersion() {
    const [isChecking, setIsChecking] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);

    // On native apps, use the actual native version; on web skip the check
    const currentVersion = Platform.OS !== 'web'
        ? (Constants.expoConfig?.version || '0.0.0')
        : null;

    useEffect(() => {
        // Skip version check on web
        if (Platform.OS === 'web') {
            setIsChecking(false);
            return;
        }

        let cancelled = false;

        const check = async () => {
            try {
                const settings = await fetchVersionConfig();
                const serverLatest = settings?.latestAppVersion;

                if (!cancelled && serverLatest && typeof serverLatest === 'string') {
                    setLatestVersion(serverLatest);
                    // Exact match check — admin sets the exact latest version string
                    if (currentVersion !== serverLatest.trim()) {
                        setUpdateRequired(true);
                    }
                }
            } catch (err) {
                // Network error or backend down → fail open, don't block the user
                console.log('[useAppVersion] Version check skipped:', err.message);
            } finally {
                if (!cancelled) setIsChecking(false);
            }
        };

        check();
        return () => { cancelled = true; };
    }, []);

    return { updateRequired, latestVersion, currentVersion, isChecking };
}
