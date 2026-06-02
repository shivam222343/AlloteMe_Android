/**
 * useClipboardPaste
 *
 * Cross-platform clipboard image paste hook for Expo React Native + Web.
 *
 * Strategy per platform:
 *  - Web   : window 'paste' event (Ctrl+V) → reads image File from clipboardData
 *  - Native: hasImageAsync() → getImageAsync() → fallback: getStringAsync() (URL copy)
 *
 * Usage:
 *   const { pasteLoading, clipboardHasImage, handlePasteImage } = useClipboardPaste({
 *     onUpload: async (fd) => await uploadAPI.upload(fd),   // returns { data: { url } }
 *     onSuccess: (url) => addToGallery(url),
 *     disabled: gallery.length >= 5,
 *   });
 */

import { useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';

export function useClipboardPaste({ onUpload, onSuccess, disabled }) {
    const [pasteLoading, setPasteLoading] = useState(false);
    const [clipboardHasImage, setClipboardHasImage] = useState(false);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    // ─── Web: automatic Ctrl+V paste listener ────────────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const onPaste = async (e) => {
            if (disabledRef.current) return;
            const items = e.clipboardData?.items || [];
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) continue;
                    e.preventDefault();
                    await uploadFile(file);
                    return; // one image per paste event
                }
            }
        };

        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Native: poll clipboard state so button can show enabled/disabled ─────
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const check = async () => {
            try {
                const has = await ExpoClipboard.hasImageAsync();
                setClipboardHasImage(has);
            } catch (_) {
                // silently ignore
            }
        };

        check(); // run immediately on mount
        const interval = setInterval(check, 2000);
        return () => clearInterval(interval);
    }, []);

    // ─── Shared upload helper (web File object) ───────────────────────────────
    const uploadFile = async (file) => {
        setPasteLoading(true);
        try {
            const fd = new FormData();
            fd.append('image', file, file.name || `paste_${Date.now()}.jpg`);
            const res = await onUpload(fd);
            onSuccess(res.data.url);
        } catch (err) {
            console.error('Paste upload error:', err);
            Alert.alert('Upload Failed', 'Could not upload the pasted image.');
        } finally {
            setPasteLoading(false);
        }
    };

    // ─── Shared upload helper (native base64) ────────────────────────────────
    const uploadBase64 = async (base64) => {
        setPasteLoading(true);
        try {
            const fileName = `clipboard-${Date.now()}.jpg`;
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const fd = new FormData();
            fd.append('image', { uri: fileUri, name: fileName, type: 'image/jpeg' });
            const res = await onUpload(fd);
            onSuccess(res.data.url);
        } catch (err) {
            console.error('Paste upload error:', err);
            Alert.alert('Upload Failed', 'Could not upload the pasted image.');
        } finally {
            setPasteLoading(false);
        }
    };

    // ─── Shared upload helper (URL → fetch → upload) ─────────────────────────
    const uploadFromUrl = async (url) => {
        setPasteLoading(true);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('fetch failed');
            const blob = await response.blob();
            const fileName = `clipboard-${Date.now()}.jpg`;
            const fd = new FormData();
            fd.append('image', blob, fileName);
            const res = await onUpload(fd);
            onSuccess(res.data.url);
        } catch (err) {
            console.error('URL upload error:', err);
            Alert.alert('Upload Failed', 'Could not download and upload the image from that URL.');
        } finally {
            setPasteLoading(false);
        }
    };

    // ─── Native paste handler (called by button tap) ──────────────────────────
    const handlePasteImage = async () => {
        if (disabled) {
            Alert.alert('Limit Reached', 'Gallery already has 5 images.');
            return;
        }
        if (Platform.OS === 'web') {
            // On web the Ctrl+V listener handles it automatically.
            // This button is a fallback — instruct the user.
            Alert.alert(
                'Paste with Ctrl+V',
                'On web, simply press Ctrl+V (or Cmd+V on Mac) to paste an image directly.'
            );
            return;
        }

        // ── STEP 1: Try native clipboard image ──────────────────────────────
        try {
            const hasImage = await ExpoClipboard.hasImageAsync();
            console.log('[Paste] hasImageAsync:', hasImage);

            if (hasImage) {
                const result = await ExpoClipboard.getImageAsync({ format: 'jpeg' });
                console.log('[Paste] getImageAsync result keys:', result ? Object.keys(result) : null);
                const base64 = result?.data;
                if (base64) {
                    await uploadBase64(base64);
                    return;
                }
            }
        } catch (err) {
            console.warn('[Paste] native image read failed:', err);
        }

        // ── STEP 2: Fallback – check if clipboard has an image URL ──────────
        try {
            const text = await ExpoClipboard.getStringAsync();
            console.log('[Paste] clipboard text:', text?.slice(0, 100));
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(text)
                    || text.includes('googleusercontent')
                    || text.includes('cloudinary')
                    || text.includes('imgur')
                    || text.includes('unsplash');
                if (isImage) {
                    await uploadFromUrl(text);
                    return;
                }
            }
        } catch (err) {
            console.warn('[Paste] clipboard text read failed:', err);
        }

        // ── STEP 3: Nothing usable found ────────────────────────────────────
        Alert.alert(
            'No Image in Clipboard',
            'Copy an image first:\n• Long-press any image → "Copy"\n• Or copy an image URL\n\nThen tap Paste.'
        );
    };

    return { pasteLoading, clipboardHasImage, handlePasteImage };
}
