import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    FlatList,
    Image,
    Share,
    BackHandler,
    Animated,
    Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { notesAPI, meetingsAPI } from '../services/api';
import MainLayout from '../components/MainLayout';
import * as Animatable from 'react-native-animatable';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import RichEditor from 'react-native-pell-rich-editor/src/RichEditor';
import { actions } from 'react-native-pell-rich-editor/src/const';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

// HTML Helpers for cross-platform sync
const htmlToPlain = (html) => {
    if (!html) return '';
    // Strip tags but preserve line breaks from <div> and <p>
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div><div>/gi, '\n')
        .replace(/<div>/gi, '')
        .replace(/<\/div>/gi, '\n')
        .replace(/<p>/gi, '')
        .replace(/<\/p>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]*>?/gm, '') // Final tag strip
        .replace(/\n\s*\n/g, '\n') // Remove double newlines
        .trim();
};

const plainToHtml = (str) => {
    if (!str) return '';
    // Avoid double wrapping if someone manually typed a tag or content is already HTML
    if (str.includes('<div>') || str.includes('<p>')) return str;
    return str.split('\n').map(line => `<div>${line || '<br>'}</div>`).join('');
};

// Premium Color Palette
const COLOR_PALETTE = [
    { label: 'Default', value: '#1F2937' },
    { label: 'Blue', value: '#0A66C2' },
    { label: 'Red', value: '#EF4444' },
    { label: 'Green', value: '#22C55E' },
    { label: 'Purple', value: '#8B5CF6' },
    { label: 'Orange', value: '#F59E0B' },
    { label: 'Pink', value: '#EC4899' },
    { label: 'Gray', value: '#6B7280' },
    { label: 'Bright Blue', value: '#3B82F6' },
    { label: 'Bright Green', value: '#10B981' },
    { label: 'Bright Red', value: '#F87171' },
    { label: 'Yellow', value: '#FBBF24' },
];

const FONT_SIZES = [
    { label: 'Small', value: '1', size: 12 },
    { label: 'Normal', value: '3', size: 16 },
    { label: 'Medium', value: '4', size: 18 },
    { label: 'Large', value: '5', size: 24 },
    { label: 'Huge', value: '7', size: 36 },
];

const FONT_FAMILIES = [
    { label: 'System', value: '-apple-system, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Cursive', value: 'cursive' },
];

const LINE_SPACINGS = [
    { label: '1.0', value: '1' },
    { label: '1.15', value: '1.15' },
    { label: '1.5', value: '1.5' },
    { label: '2.0', value: '2' },
];

const LiveNotesScreen = ({ navigation }) => {
    const { user, socket, selectedClubId } = useAuth();
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Remote states
    const [noteCollaborators, setNoteCollaborators] = useState([]);
    const [typingCollaborators, setTypingCollaborators] = useState({});
    const [showCollabModal, setShowCollabModal] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showFontSizePicker, setShowFontSizePicker] = useState(false);
    const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
    const [showLineSpacingPicker, setShowLineSpacingPicker] = useState(false);
    const [showHeadingPicker, setShowHeadingPicker] = useState(false);

    const [editorState, setEditorState] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        align: 'left',
        bullet: false,
        ordered: false,
        color: '#1F2937',
        highlight: 'transparent',
        fontSize: '3',
        fontFamily: 'System',
        heading: '0'
    });

    // Meeting Selection for Sharing
    const [meetings, setMeetings] = useState([]);
    const [showMeetingSelector, setShowMeetingSelector] = useState(false);
    const [loadingMeetings, setLoadingMeetings] = useState(false);
    const [selectedSharingClub, setSelectedSharingClub] = useState(null);

    // Export Menu
    const [showExportMenu, setShowExportMenu] = useState(false);
    const editorViewRef = useRef();

    // Editor Refs & States
    const richText = useRef();
    const [noteTitle, setNoteTitle] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const lastContentRef = useRef('');
    const typingTimeout = useRef(null);
    const saveTimeout = useRef(null);
    const isUndoRedoAction = useRef(false);

    const [webContent, setWebContent] = useState('');
    const [showClubPicker, setShowClubPicker] = useState(false);
    const [noteClubId, setNoteClubId] = useState(null);

    // Web-only undo/redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Load initial list
    useEffect(() => {
        loadNotes();

        if (socket) {
            socket.on('note:list_update', (data) => {
                if (data.type === 'create') {
                    setNotes(prev => [data.note, ...prev.filter(n => n._id !== data.note._id)]);
                } else if (data.type === 'delete') {
                    setNotes(prev => prev.filter(n => n._id !== data.noteId));
                    if (activeNote?._id === data.noteId) {
                        Alert.alert('Note Deleted', 'This note has been deleted by the owner.');
                        setActiveNote(null);
                    }
                } else if (data.type === 'update') {
                    setNotes(prev => prev.map(n => n._id === data.noteId ? { ...n, title: data.title, content: data.content, updatedAt: data.updatedAt } : n));
                }
            });
        }

        return () => {
            if (socket) socket.off('note:list_update');
        };
    }, [socket, activeNote?._id, selectedClubId]);

    // Handle back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (activeNote) {
                closeNote();
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [activeNote]);

    // Socket listeners for active note
    useEffect(() => {
        if (socket && activeNote) {
            socket.emit('note:join', activeNote._id);

            socket.on('note:change', (data) => {
                if (data.updatedBy !== user._id) {
                    if (data.title !== undefined) setNoteTitle(data.title);
                    if (data.isPublic !== undefined) setIsPublic(data.isPublic);
                    if (data.clubId !== undefined) setNoteClubId(data.clubId);

                    if (data.content !== undefined && data.content !== lastContentRef.current) {
                        isUndoRedoAction.current = true; // Prevent remote changes from being added to undo stack
                        lastContentRef.current = data.content;
                        if (Platform.OS === 'web') {
                            setWebContent(htmlToPlain(data.content));
                        } else if (richText.current) {
                            richText.current.setContentHTML(data.content);
                        }
                    }
                }
            });

            socket.on('note:op_received', (data) => {
                if (data.updatedBy !== user._id && activeNote?._id === data.noteId) {
                    const { delta } = data;
                    if (delta.type === 'content_change' && delta.html !== lastContentRef.current) {
                        isUndoRedoAction.current = true; // Prevent remote ops from being added to undo stack
                        lastContentRef.current = delta.html;
                        if (Platform.OS === 'web') {
                            setWebContent(htmlToPlain(delta.html));
                        } else if (richText.current) {
                            richText.current.setContentHTML(delta.html);
                        }
                    } else if (delta.type === 'format') {
                        // Apply formatting ops if possible (pell doesn't apply remote format actions easily without selection sync)
                        // For now we rely on the subsequent content_change or full update to sync formatting
                    }
                }
            });

            socket.on('note:presence', (data) => {
                if (data.noteId === activeNote._id) {
                    setNoteCollaborators(data.collaborators);
                }
            });

            socket.on('note:typing_update', (data) => {
                setTypingCollaborators(prev => ({
                    ...prev,
                    [data.userId]: { ...data.user, isTyping: data.isTyping }
                }));
            });

            return () => {
                socket.emit('note:leave', activeNote._id);
                socket.off('note:change');
                socket.off('note:presence');
                socket.off('note:typing_update');
            };
        }
    }, [socket, activeNote]);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const res = await notesAPI.getAll(selectedClubId);
            if (res.success) {
                setNotes(res.data);
            }
        } catch (error) {
            console.error('Load notes error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async () => {
        try {
            const res = await notesAPI.create({
                title: 'New Note',
                content: '',
                isPublic: false,
                clubId: selectedClubId !== 'all' ? selectedClubId : null
            });
            if (res.success) {
                setNotes([res.data, ...notes]);
                openNote(res.data);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not create note');
        }
    };

    const openNote = (note) => {
        setActiveNote(note);
        setNoteTitle(note.title);
        setIsPublic(note.isPublic);
        setNoteClubId(note.clubId?._id || note.clubId);
        lastContentRef.current = note.content || '';
        if (Platform.OS === 'web') setWebContent(htmlToPlain(note.content || ''));
    };

    const closeNote = () => {
        setActiveNote(null);
        setNoteTitle('');
        setNoteClubId(null);
        setNoteCollaborators([]);
        setTypingCollaborators({});
        loadNotes();
    };

    const handleRemoteUpdate = useCallback((changes) => {
        if (!socket || !activeNote) return;
        socket.emit('note:update', {
            noteId: activeNote._id,
            clubId: activeNote.clubId,
            ...changes
        });
    }, [socket, activeNote]);

    // Web undo/redo handlers
    const handleUndo = useCallback(() => {
        if (Platform.OS !== 'web' || undoStack.length === 0) return;

        isUndoRedoAction.current = true;
        const previousContent = undoStack[undoStack.length - 1];
        setRedoStack(prev => [webContent, ...prev].slice(0, 50));
        setUndoStack(prev => prev.slice(0, -1));
        setWebContent(htmlToPlain(previousContent));
        onEditorChange(htmlToPlain(previousContent));
    }, [undoStack, webContent]);

    const handleRedo = useCallback(() => {
        if (Platform.OS !== 'web' || redoStack.length === 0) return;

        isUndoRedoAction.current = true;
        const nextContent = redoStack[0];
        setUndoStack(prev => [...prev, plainToHtml(webContent)].slice(-50));
        setRedoStack(prev => prev.slice(1));
        setWebContent(htmlToPlain(nextContent));
        onEditorChange(htmlToPlain(nextContent));
    }, [redoStack, webContent]);

    // Web formatting handler
    const handleWebFormatting = useCallback((format, value) => {
        if (Platform.OS !== 'web') return;

        const textarea = document.activeElement;
        if (!textarea || textarea.tagName !== 'TEXTAREA') return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = webContent.substring(start, end);

        if (!selectedText && !['bullet', 'numbered'].includes(format)) return;

        let formattedText = selectedText;

        switch (format) {
            case 'bold':
                formattedText = `<b>${selectedText}</b>`;
                break;
            case 'italic':
                formattedText = `<i>${selectedText}</i>`;
                break;
            case 'underline':
                formattedText = `<u>${selectedText}</u>`;
                break;
            case 'strikethrough':
                formattedText = `<s>${selectedText}</s>`;
                break;
            case 'color':
                formattedText = `<span style="color: ${value}">${selectedText}</span>`;
                setShowColorPicker(false);
                break;
            case 'highlight':
                formattedText = `<span style="background-color: ${value}">${selectedText}</span>`;
                setShowHighlightPicker(false);
                break;
            case 'bullet':
                const lines = webContent.split('\n');
                const lineIndex = webContent.substring(0, start).split('\n').length - 1;
                lines[lineIndex] = '• ' + lines[lineIndex];
                const newContent = lines.join('\n');
                setWebContent(newContent);
                onEditorChange(newContent);
                return;
            case 'numbered':
                const numLines = webContent.split('\n');
                const numLineIndex = webContent.substring(0, start).split('\n').length - 1;
                numLines[numLineIndex] = '1. ' + numLines[numLineIndex];
                const numContent = numLines.join('\n');
                setWebContent(numContent);
                onEditorChange(numContent);
                return;
            default:
                return;
        }

        const newContent = webContent.substring(0, start) + formattedText + webContent.substring(end);
        setWebContent(newContent);
        onEditorChange(newContent);

        // Restore cursor position
        setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + formattedText.length;
        }, 0);
    }, [webContent]);

    // Keyboard shortcuts for web undo/redo
    useEffect(() => {
        if (Platform.OS !== 'web' || !activeNote) return;

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeNote, handleUndo, handleRedo]);

    const onEditorChange = (content) => {
        let html = typeof content === 'string' ? content : (content?.nativeEvent?.text || lastContentRef.current);

        if (Platform.OS === 'web') {
            html = plainToHtml(html);

            // Add to undo stack only if this is a user-initiated change (not undo/redo or remote)
            if (!isUndoRedoAction.current && html !== lastContentRef.current) {
                setUndoStack(prev => [...prev, lastContentRef.current].slice(-50));
                setRedoStack([]);
            }
            isUndoRedoAction.current = false;
        }

        if (html === lastContentRef.current) return;
        lastContentRef.current = html;

        if (socket && activeNote) {
            socket.emit('note:typing', { noteId: activeNote._id, isTyping: true });

            // Operational Broadcast
            socket.emit('note:op', {
                noteId: activeNote._id,
                delta: { type: 'content_change', html },
                title: noteTitle,
                isPublic: isPublic,
                clubId: noteClubId,
                plainTextSnippet: htmlToPlain(html).substring(0, 100)
            });

            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('note:typing', { noteId: activeNote._id, isTyping: false });
            }, 2000);
        }

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                await notesAPI.update(activeNote._id, {
                    title: noteTitle,
                    content: html,
                    isPublic: isPublic,
                    clubId: noteClubId
                });
            } catch (error) {
                console.error('Auto-save error:', error);
            }
        }, 5000);
    };

    const handleTitleChange = (val) => {
        setNoteTitle(val);
        handleRemoteUpdate({ title: val });

        // Also trigger an auto-save for the title
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                await notesAPI.update(activeNote._id, {
                    title: val,
                    content: lastContentRef.current,
                    isPublic: isPublic
                });
                if (__DEV__) console.log('[Title] Auto-saved:', val);
            } catch (error) {
                console.error('Title auto-save error:', error);
            }
        }, 3000);
    };

    const togglePublic = async () => {
        const isOwner = activeNote && String(activeNote.userId?._id || activeNote.userId) === String(user?._id);
        if (!isOwner) {
            Alert.alert('Permission Denied', 'Only the note owner can change privacy settings.');
            return;
        }

        const newVal = !isPublic;
        setIsPublic(newVal);

        // If making public and no club is selected, suggest selecting one
        if (newVal && !noteClubId && selectedClubId && selectedClubId !== 'all') {
            setNoteClubId(selectedClubId);
            handleRemoteUpdate({ isPublic: newVal, clubId: selectedClubId });
        } else {
            handleRemoteUpdate({ isPublic: newVal });
        }

        try {
            await notesAPI.update(activeNote._id, {
                title: noteTitle,
                content: lastContentRef.current,
                isPublic: newVal,
                clubId: newVal && !noteClubId && selectedClubId !== 'all' ? selectedClubId : noteClubId
            });
        } catch (error) {
            console.error('Toggle public error:', error);
            setIsPublic(!newVal); // Rollback
        }
    };

    const handleClubSelect = async (clubId) => {
        const isOwner = activeNote && String(activeNote.userId?._id || activeNote.userId) === String(user?._id);
        if (!isOwner) return;

        setNoteClubId(clubId);
        setShowClubPicker(false);
        handleRemoteUpdate({ clubId });

        try {
            await notesAPI.update(activeNote._id, {
                title: noteTitle,
                content: lastContentRef.current,
                clubId: clubId,
                isPublic: isPublic
            });
        } catch (error) {
            console.error('Club update error:', error);
        }
    };

    const handleAction = (action, value) => {
        const isOwner = activeNote && String(activeNote.userId?._id || activeNote.userId) === String(user?._id);
        const canEdit = isOwner || isPublic;
        if (!canEdit) return;

        if (Platform.OS === 'web') return;
        if (!richText.current) return;

        try {
            // Apply operational feedback to UI immediately
            if (action === 'color') {
                richText.current.sendAction(actions.foreColor, value);
                setEditorState(prev => ({ ...prev, color: value }));
                setShowColorPicker(false);
            } else if (action === 'fontSize') {
                richText.current.sendAction(actions.fontSize, value);
                setEditorState(prev => ({ ...prev, fontSize: value }));
                setShowFontSizePicker(false);
            } else if (action === 'fontName') {
                richText.current.sendAction(actions.fontName, value);
                setEditorState(prev => ({ ...prev, fontFamily: value }));
                setShowFontFamilyPicker(false);
            } else if (action === 'highlight') {
                richText.current.sendAction(actions.hiliteColor, value);
                setEditorState(prev => ({ ...prev, highlight: value }));
                setShowHighlightPicker(false);
            } else if (action === 'link') {
                if (value) {
                    richText.current.insertLink(value);
                    setLinkUrl('');
                    setShowLinkModal(false);
                } else {
                    setShowLinkModal(true);
                }
            } else if (action === actions.undo) {
                richText.current.sendAction(actions.undo);
            } else if (action === actions.redo) {
                richText.current.sendAction(actions.redo);
            } else if (action === 'heading') {
                richText.current.sendAction(actions.heading1 + (parseInt(value) - 1), '');
                setShowHeadingPicker(false);
            } else if (action === 'strikethrough') {
                richText.current.sendAction(actions.setStrikethrough);
            } else if (action === 'indent') {
                richText.current.sendAction(actions.indent);
            } else if (action === 'outdent') {
                richText.current.sendAction(actions.outdent);
            } else if (action === 'clearFormatting') {
                richText.current.sendAction(actions.removeFormat);
            } else if (action === 'lineHeight') {
                // Custom CSS injection via HTML wrapper (requires JS bridge or content wrapping)
                richText.current.insertHTML(`<div style="line-height: ${value}">${lastContentRef.current}</div>`);
                setShowLineSpacingPicker(false);
            } else if (action === 'quote') {
                richText.current.sendAction(actions.blockquote);
            } else if (action === 'code') {
                richText.current.sendAction(actions.code);
            } else if (action === 'checkbox') {
                richText.current.insertHTML('<input type="checkbox" /> ');
            } else {
                richText.current.sendAction(action, value);
            }

            // CRITICAL: Capture and broadcast the updated HTML after formatting
            // Small delay to allow the editor to update its internal state
            setTimeout(async () => {
                try {
                    const html = await richText.current?.getContentHtml();
                    if (html && html !== lastContentRef.current) {
                        lastContentRef.current = html;

                        // Broadcast the formatted content to other collaborators
                        if (socket && activeNote) {
                            socket.emit('note:op', {
                                noteId: activeNote._id,
                                delta: { type: 'content_change', html },
                                title: noteTitle,
                                isPublic: isPublic,
                                clubId: noteClubId,
                                plainTextSnippet: htmlToPlain(html).substring(0, 100),
                                updatedBy: user._id
                            });
                        }
                    }
                } catch (err) {
                    console.error('[Toolbar] Failed to get content after formatting:', err);
                }
            }, 150);

        } catch (error) {
            console.error('[Toolbar] Action error:', error);
        }
    };

    const handleStatusChange = (status) => {
        if (!status) return;
        const lowStatus = Array.isArray(status) ? status.map(s => String(s).toLowerCase().trim()) : [String(status).toLowerCase()];

        setEditorState(prev => ({
            ...prev,
            bold: lowStatus.includes('bold'),
            italic: lowStatus.includes('italic'),
            underline: lowStatus.includes('underline'),
            strikethrough: lowStatus.includes('strikethrough'),
            bullet: lowStatus.includes('unorderedlist'),
            ordered: lowStatus.includes('orderedlist'),
            align: lowStatus.find(s => s.startsWith('justify'))?.replace('justify', '').toLowerCase() || 'left',
            heading: lowStatus.find(s => s.startsWith('h'))?.charAt(1) || '0'
        }));
    };

    const handleShare = async () => {
        // First step: Just show the modal
        setSelectedSharingClub(null);
        setMeetings([]);
        setShowMeetingSelector(true);
    };

    const fetchMeetingsForClub = async (club) => {
        try {
            setSelectedSharingClub(club);
            setLoadingMeetings(true);
            const clubId = club.clubId?._id || club.clubId;
            const res = await meetingsAPI.getClubMeetings(clubId);
            if (res.success && res.data) {
                // Backend returns categorized meetings: { upcoming, past, canceled }
                const allMeetings = [
                    ...(res.data.upcoming || []),
                    ...(res.data.past || []),
                    ...(res.data.canceled || [])
                ];
                setMeetings(allMeetings);
            }
        } catch (error) {
            console.error('Fetch meetings error:', error);
            Alert.alert('Error', 'Could not fetch meetings for this club.');
        } finally {
            setLoadingMeetings(false);
        }
    };

    const shareContent = async (meeting = null) => {
        // CLOSE the modal first
        setShowMeetingSelector(false);

        // DELAY: Android crashes if you try to open a Share sheet while a Modal is still mid-animation
        setTimeout(async () => {
            try {
                const contentStr = String(lastContentRef.current || '');
                const plainText = htmlToPlain(contentStr);
                let meetingInfo = '';

                if (meeting) {
                    try {
                        const dateObj = new Date(meeting.date);
                        const meetingDate = isNaN(dateObj.getTime())
                            ? 'N/A'
                            : dateObj.toLocaleDateString(undefined, {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                            });
                        meetingInfo = `📌 *Meeting:* ${meeting.name}\n📅 *Date:* ${meetingDate}\n📍 *Type:* ${meeting.type || 'Standard'}\n---------------------------\n\n`;
                    } catch (e) {
                        meetingInfo = `📌 *Meeting:* ${meeting.name}\n---------------------------\n\n`;
                    }
                }

                const message = `${meetingInfo}📝 *${noteTitle || 'Untitled Note'}*\n\n${plainText}\n\nShared via Mavericks App 🚀`;

                await Share.share({
                    message,
                    title: noteTitle || 'Note Share'
                });
            } catch (error) {
                console.error('Share error:', error);
                Alert.alert('Sharing Failed', 'An unexpected error occurred while trying to share.');
            }
        }, 400); // 400ms ensures the modal is fully gone
    };

    const exportToPDF = async () => {
        setShowExportMenu(false);

        // Add a small delay to ensure modal is fully closed
        setTimeout(async () => {
            try {
                const contentStr = String(lastContentRef.current || '');
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                padding: 40px; 
                                line-height: 1.6; 
                                color: #1F2937; 
                                background: white;
                            }
                            h1 { 
                                color: #0A66C2; 
                                margin-bottom: 20px; 
                                font-size: 28px; 
                                font-weight: 700;
                            }
                            .content { 
                                font-size: 14px; 
                            }
                            .content p { margin: 10px 0; }
                            .content div { margin: 5px 0; }
                        </style>
                    </head>
                    <body>
                        <h1>${noteTitle || 'Untitled Note'}</h1>
                        <div class="content">${contentStr}</div>
                    </body>
                    </html>
                `;

                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            } catch (error) {
                console.error('PDF export error:', error);
                Alert.alert('Export Failed', 'Could not export to PDF.');
            }
        }, 300);
    };

    const exportToPNG = async () => {
        setShowExportMenu(false);

        // Add a small delay to ensure modal is fully closed
        setTimeout(async () => {
            try {
                const contentStr = String(lastContentRef.current || '');
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                padding: 40px; 
                                line-height: 1.6; 
                                color: #1F2937; 
                                background: white;
                                margin: 0;
                            }
                            h1 { 
                                color: #0A66C2; 
                                margin-bottom: 20px; 
                                font-size: 28px; 
                                font-weight: 700;
                            }
                            .content { 
                                font-size: 14px; 
                            }
                            .content p { margin: 10px 0; }
                            .content div { margin: 5px 0; }
                        </style>
                    </head>
                    <body>
                        <h1>${noteTitle || 'Untitled Note'}</h1>
                        <div class="content">${contentStr}</div>
                    </body>
                    </html>
                `;

                // Use Print API to generate file from HTML (exports only content, no UI)
                const { uri } = await Print.printToFileAsync({
                    html,
                    base64: false
                });

                // Share the generated file
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Export Note'
                });
            } catch (error) {
                console.error('Export error:', error);
                Alert.alert('Export Failed', 'Could not export note.');
            }
        }, 300);
    };

    const deleteNote = async (id) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await notesAPI.delete(id);
                            if (res.success) {
                                setNotes(notes.filter(n => n._id !== id));
                                if (activeNote?._id === id) setActiveNote(null);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Could not delete note');
                        }
                    }
                }
            ]
        );
    };

    const renderNoteItem = ({ item }) => {
        const isOwner = item.userId?._id === user._id || item.userId === user._id;
        const snippet = item.content ? item.content.replace(/<[^>]*>?/gm, '') : 'Empty note...';

        return (
            <Swipeable
                renderRightActions={(prog, drag) => (
                    <TouchableOpacity onPress={() => deleteNote(item._id)} style={styles.swipeDeleteAction}>
                        <Animated.View style={{ alignItems: 'center' }}>
                            <Ionicons name="trash-outline" size={24} color="#FFF" />
                            <Text style={styles.swipeDeleteText}>Delete</Text>
                        </Animated.View>
                    </TouchableOpacity>
                )}
                enabled={isOwner}
            >
                <TouchableOpacity style={styles.noteCard} onPress={() => openNote(item)} activeOpacity={0.7}>
                    <View style={styles.noteIconContainer}>
                        <View style={[styles.noteIcon, { backgroundColor: item.isPublic ? '#E0F2FE' : '#F3F4F6' }]}>
                            <Ionicons name={item.isPublic ? "people" : "document-text"} size={24} color={item.isPublic ? "#0A66C2" : "#6B7280"} />
                        </View>
                        {!item.isPublic && (
                            <View style={styles.lockBadge}><Ionicons name="lock-closed" size={10} color="#FFFFFF" /></View>
                        )}
                    </View>
                    <View style={styles.noteInfo}>
                        <View style={styles.noteHeader}>
                            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.noteDate}>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                        </View>
                        <View style={styles.noteMeta}>
                            <Text style={styles.noteAuthor} numberOfLines={1}>By {item.userId?.displayName || 'Me'}</Text>
                            <View style={styles.dot} />
                            <Text style={styles.noteSnippet} numberOfLines={1}>{snippet}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#E5E7EB" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const ToolbarButton = ({ action, icon, library = Ionicons, size = 22, value }) => {
        let isActive = false;
        if (action === actions.setBold) isActive = editorState.bold;
        if (action === actions.setItalic) isActive = editorState.italic;
        if (action === actions.setUnderline) isActive = editorState.underline;
        if (action === actions.insertBulletsList) isActive = editorState.bullet;
        if (action === actions.insertOrderedList) isActive = editorState.ordered;
        if (action === actions.alignLeft && editorState.align === 'left') isActive = true;
        if (action === actions.alignCenter && editorState.align === 'center') isActive = true;
        if (action === actions.alignRight && editorState.align === 'right') isActive = true;
        if (action === actions.alignFull && editorState.align === 'justify') isActive = true;

        return (
            <TouchableOpacity
                onPress={() => handleAction(action, value)}
                activeOpacity={0.6}
                style={[styles.toolbarBtn, isActive && styles.toolbarBtnActive]}
            >
                {library === Ionicons && <Ionicons name={icon} size={size} color={isActive ? "#0A66C2" : "#4B5563"} />}
                {library === MaterialIcons && <MaterialIcons name={icon} size={size} color={isActive ? "#0A66C2" : "#4B5563"} />}
                {library === MaterialCommunityIcons && <MaterialCommunityIcons name={icon} size={size} color={isActive ? "#0A66C2" : "#4B5563"} />}
            </TouchableOpacity>
        );
    };

    const CustomToolbar = () => {
        return (
            <View style={styles.customToolbarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
                    <ToolbarButton action={actions.undo} icon="undo" library={MaterialIcons} />
                    <ToolbarButton action={actions.redo} icon="redo" library={MaterialIcons} />
                    <View style={styles.toolbarDivider} />

                    <TouchableOpacity onPress={() => setShowHeadingPicker(true)} style={styles.toolbarBtn}>
                        <MaterialCommunityIcons name="format-header-pound" size={22} color={editorState.heading !== '0' ? "#0A66C2" : "#4B5563"} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowFontSizePicker(true)} style={styles.toolbarBtn}>
                        <MaterialCommunityIcons name="format-size" size={22} color="#4B5563" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowFontFamilyPicker(true)} style={styles.toolbarBtn}>
                        <MaterialIcons name="font-download" size={22} color="#4B5563" />
                    </TouchableOpacity>

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action={actions.setBold} icon="format-bold" library={MaterialIcons} />
                    <ToolbarButton action={actions.setItalic} icon="format-italic" library={MaterialIcons} />
                    <ToolbarButton action={actions.setUnderline} icon="format-underlined" library={MaterialIcons} />
                    <ToolbarButton action="strikethrough" icon="format-strikethrough" library={MaterialIcons} />

                    <TouchableOpacity onPress={() => setShowColorPicker(true)} style={styles.toolbarBtn}>
                        <MaterialIcons name="format-color-text" size={22} color={editorState.color} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowHighlightPicker(true)} style={styles.toolbarBtn}>
                        <MaterialIcons name="format-color-fill" size={22} color={editorState.highlight !== 'transparent' ? editorState.highlight : "#4B5563"} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleAction('link')} style={styles.toolbarBtn}>
                        <MaterialIcons name="link" size={22} color="#4B5563" />
                    </TouchableOpacity>

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action={actions.insertBulletsList} icon="format-list-bulleted" library={MaterialIcons} />
                    <ToolbarButton action={actions.insertOrderedList} icon="format-list-numbered" library={MaterialIcons} />
                    <ToolbarButton action="checkbox" icon="checkbox-marked-outline" library={MaterialCommunityIcons} />

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action="outdent" icon="format-indent-decrease" library={MaterialIcons} />
                    <ToolbarButton action="indent" icon="format-indent-increase" library={MaterialIcons} />

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action={actions.alignLeft} icon="format-align-left" library={MaterialIcons} />
                    <ToolbarButton action={actions.alignCenter} icon="format-align-center" library={MaterialIcons} />
                    <ToolbarButton action={actions.alignRight} icon="format-align-right" library={MaterialIcons} />

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action="quote" icon="format-quote-close" library={MaterialCommunityIcons} />
                    <ToolbarButton action="code" icon="code-braces" library={MaterialCommunityIcons} />
                    <TouchableOpacity onPress={() => setShowLineSpacingPicker(true)} style={styles.toolbarBtn}>
                        <MaterialCommunityIcons name="format-line-spacing" size={22} color="#4B5563" />
                    </TouchableOpacity>

                    <View style={styles.toolbarDivider} />
                    <ToolbarButton action="clearFormatting" icon="format-clear" library={MaterialIcons} />
                </ScrollView>
            </View>
        );
    };

    const renderEditor = () => {
        const isOwner = activeNote && String(activeNote.userId?._id || activeNote.userId) === String(user._id);
        const canEdit = isOwner || isPublic;

        const typingList = Object.values(typingCollaborators).filter(c => c.isTyping && c._id !== user._id);
        const displayedCollabs = noteCollaborators.filter(c => c._id !== user._id).slice(0, 5);
        const extraCollabs = Math.max(0, noteCollaborators.length - 1 - 5);

        return (
            <View style={styles.editorContainer}>
                <View style={styles.editorHeader}>
                    <TouchableOpacity onPress={closeNote} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
                    <View style={styles.presenceBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                            {displayedCollabs.map(c => (
                                <TouchableOpacity key={c._id} style={styles.avatarWrapper} onPress={() => setShowCollabModal(true)}>
                                    <View style={[styles.avatarContainer, typingCollaborators[c._id]?.isTyping && styles.avatarTyping]}>
                                        {c.profilePicture ? <Image source={{ uri: c.profilePicture }} style={styles.tinyAvatar} /> : (
                                            <View style={[styles.tinyAvatar, { backgroundColor: '#0A66C2', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={styles.tinyAvatarText}>{c.displayName?.charAt(0)}</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {extraCollabs > 0 && (
                                <TouchableOpacity style={styles.extraBadge} onPress={() => setShowCollabModal(true)}>
                                    <Text style={styles.extraText}>+{extraCollabs}</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                    <TouchableOpacity onPress={() => setShowExportMenu(true)} style={styles.shareBtn}>
                        <Ionicons name="document-text-outline" size={22} color="#0A66C2" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.shareBtn}><Ionicons name="share-social-outline" size={22} color="#0A66C2" /></TouchableOpacity>
                </View>

                {Platform.OS !== 'web' && <CustomToolbar />}
                {Platform.OS === 'web' && (
                    <View style={styles.customToolbarContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
                            <TouchableOpacity
                                onPress={handleUndo}
                                disabled={undoStack.length === 0}
                                style={[styles.toolbarBtn, undoStack.length === 0 && { opacity: 0.3 }]}
                            >
                                <MaterialIcons name="undo" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleRedo}
                                disabled={redoStack.length === 0}
                                style={[styles.toolbarBtn, redoStack.length === 0 && { opacity: 0.3 }]}
                            >
                                <MaterialIcons name="redo" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <View style={styles.toolbarDivider} />

                            <TouchableOpacity onPress={() => handleWebFormatting('bold')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-bold" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWebFormatting('italic')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-italic" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWebFormatting('underline')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-underlined" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWebFormatting('strikethrough')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-strikethrough" size={22} color="#4B5563" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowColorPicker(true)} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-color-text" size={22} color="#4B5563" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowHighlightPicker(true)} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-color-fill" size={22} color="#4B5563" />
                            </TouchableOpacity>

                            <View style={styles.toolbarDivider} />
                            <TouchableOpacity onPress={() => handleWebFormatting('bullet')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-list-bulleted" size={22} color="#4B5563" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleWebFormatting('numbered')} style={styles.toolbarBtn}>
                                <MaterialIcons name="format-list-numbered" size={22} color="#4B5563" />
                            </TouchableOpacity>

                            <View style={styles.toolbarDivider} />
                            <TouchableOpacity onPress={() => setShowLinkModal(true)} style={styles.toolbarBtn}>
                                <MaterialIcons name="link" size={22} color="#4B5563" />
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View ref={editorViewRef} collapsable={false} style={styles.editorInner}>
                        <View style={styles.titleRow}>
                            <TextInput
                                style={styles.contentTitleInput}
                                value={noteTitle}
                                onChangeText={handleTitleChange}
                                placeholder="Note Title"
                                placeholderTextColor="#9CA3AF"
                                editable={canEdit}
                            />
                            <TouchableOpacity
                                onPress={togglePublic}
                                disabled={!isOwner}
                                style={[styles.statusBadge, isPublic ? styles.publicBadge : styles.privateBadge, !isOwner && { opacity: 0.7 }]}
                            >
                                <Ionicons name={isPublic ? 'people' : 'lock-closed'} size={12} color="#FFF" />
                                <Text style={styles.statusBadgeText}>{isPublic ? 'Public' : 'Personal'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => isOwner && setShowClubPicker(true)}
                                style={[styles.statusBadge, { backgroundColor: '#E0F2FE', marginLeft: 8 }]}
                            >
                                <Ionicons name="business" size={12} color="#0A66C2" />
                                <Text style={[styles.statusBadgeText, { color: '#0A66C2' }]}>
                                    {noteClubId ? (user?.clubsJoined?.find(c => (c.clubId?._id || c.clubId) === noteClubId)?.clubId?.name || 'Club') : 'Select Club'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.titleSeparator} />

                        <View style={styles.editorWrapper}>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    multiline
                                    style={styles.webInput}
                                    value={webContent}
                                    onChangeText={(val) => {
                                        setWebContent(val);
                                        onEditorChange(val);
                                    }}
                                    placeholder="Write something brilliant..."
                                    placeholderTextColor="#9CA3AF"
                                    editable={canEdit}
                                />
                            ) : (
                                <RichEditor
                                    ref={richText}
                                    initialContentHTML={lastContentRef.current}
                                    onChange={onEditorChange}
                                    onStatusChange={handleStatusChange}
                                    placeholder={'Write something brilliant...'}
                                    style={styles.richEditor}
                                    initialHeight={height * 0.7}
                                    useContainer={false}
                                    disabled={!canEdit}
                                    editorInitializedCallback={() => {
                                        richText.current?.setContentHTML(lastContentRef.current);
                                    }}
                                />
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>

                {/* Club Picker Modal */}
                <Modal visible={showClubPicker} transparent animationType="slide" onRequestClose={() => setShowClubPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowClubPicker(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Sharing Club</Text>
                                <TouchableOpacity onPress={() => setShowClubPicker(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                            </View>
                            <FlatList
                                data={user?.clubsJoined || []}
                                keyExtractor={item => (item.clubId?._id || item.clubId).toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.clubSelectItem, noteClubId === (item.clubId?._id || item.clubId) && { borderColor: '#0A66C2', backgroundColor: '#F0F9FF' }]}
                                        onPress={() => handleClubSelect(item.clubId?._id || item.clubId)}
                                    >
                                        <View style={styles.clubSelectIcon}>
                                            <Ionicons name="business" size={20} color="#0A66C2" />
                                        </View>
                                        <Text style={styles.clubItemName}>{item.clubId?.name || 'Unnamed Club'}</Text>
                                        {noteClubId === (item.clubId?._id || item.clubId) && <Ionicons name="checkmark-circle" size={20} color="#0A66C2" />}
                                    </TouchableOpacity>
                                )}
                                ListHeaderComponent={
                                    <TouchableOpacity style={styles.skipBtn} onPress={() => handleClubSelect(null)}>
                                        <Text style={styles.skipBtnText}>Remove Club (Make Private)</Text>
                                    </TouchableOpacity>
                                }
                                contentContainerStyle={{ padding: 20 }}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Modals moved inside renderEditor for correct scoping */}
                <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => setShowColorPicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowColorPicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Select Text Color</Text>
                            <View style={styles.colorGrid}>
                                {COLOR_PALETTE.map(c => (
                                    <TouchableOpacity
                                        key={c.value}
                                        style={[styles.colorOption, { backgroundColor: c.value }]}
                                        onPress={() => Platform.OS === 'web' ? handleWebFormatting('color', c.value) : handleAction('color', c.value)}
                                    >
                                        {editorState.color === c.value && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity onPress={() => setShowColorPicker(false)} style={styles.colorPickerClose}>
                                <Text style={styles.colorPickerCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Highlight Picker */}
                <Modal visible={showHighlightPicker} transparent animationType="fade" onRequestClose={() => setShowHighlightPicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowHighlightPicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Highlight Color</Text>
                            <View style={styles.colorGrid}>
                                <TouchableOpacity
                                    style={[styles.colorOption, { backgroundColor: '#FFF' }]}
                                    onPress={() => Platform.OS === 'web' ? handleWebFormatting('highlight', 'transparent') : handleAction('highlight', 'transparent')}
                                >
                                    <Ionicons name="close" size={16} color="#6B7280" />
                                </TouchableOpacity>
                                {COLOR_PALETTE.slice(1).map(c => (
                                    <TouchableOpacity
                                        key={c.value}
                                        style={[styles.colorOption, { backgroundColor: c.value }]}
                                        onPress={() => Platform.OS === 'web' ? handleWebFormatting('highlight', c.value) : handleAction('highlight', c.value)}
                                    >
                                        {editorState.highlight === c.value && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Link Modal */}
                <Modal visible={showLinkModal} transparent animationType="slide" onRequestClose={() => setShowLinkModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowLinkModal(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Insert Hyperlink</Text>
                                <TouchableOpacity onPress={() => setShowLinkModal(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                            </View>
                            <View style={{ padding: 20 }}>
                                <TextInput
                                    style={[styles.searchInput, { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20, marginHorizontal: 0, color: '#0A66C2' }]}
                                    value={linkUrl}
                                    onChangeText={setLinkUrl}
                                    placeholder="https://example.com"
                                    placeholderTextColor="#9CA3AF"
                                    autoFocus
                                />
                                <TouchableOpacity style={styles.skipBtn} onPress={() => handleAction('link', linkUrl)}>
                                    <Text style={styles.skipBtnText}>Insert Link</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal visible={showFontSizePicker} transparent animationType="fade" onRequestClose={() => setShowFontSizePicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowFontSizePicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Font Size</Text>
                            {FONT_SIZES.map(f => (
                                <TouchableOpacity key={f.value} style={styles.pickerItem} onPress={() => handleAction('fontSize', f.value)}>
                                    <Text style={{ fontSize: f.size }}>{f.label}</Text>
                                    {editorState.fontSize === f.value && <Ionicons name="checkmark" size={18} color="#0A66C2" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>

                {/* Font Family Picker */}
                <Modal visible={showFontFamilyPicker} transparent animationType="fade" onRequestClose={() => setShowFontFamilyPicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowFontFamilyPicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Font Family</Text>
                            {FONT_FAMILIES.map(f => (
                                <TouchableOpacity key={f.value} style={styles.pickerItem} onPress={() => handleAction('fontName', f.value)}>
                                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'System' : f.label }}>{f.label}</Text>
                                    {editorState.fontFamily === f.value && <Ionicons name="checkmark" size={18} color="#0A66C2" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>

                {/* Heading Picker */}
                <Modal visible={showHeadingPicker} transparent animationType="fade" onRequestClose={() => setShowHeadingPicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowHeadingPicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Text Style</Text>
                            {['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6'].map((h, i) => (
                                <TouchableOpacity key={h} style={styles.pickerItem} onPress={() => handleAction('heading', i)}>
                                    <Text style={{ fontSize: i === 0 ? 16 : 24 - i, fontWeight: i === 0 ? 'normal' : 'bold' }}>{h}</Text>
                                    {((parseInt(editorState.heading) === i)) && <Ionicons name="checkmark" size={18} color="#0A66C2" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>

                {/* Line Spacing Picker */}
                <Modal visible={showLineSpacingPicker} transparent animationType="fade" onRequestClose={() => setShowLineSpacingPicker(false)}>
                    <View style={styles.colorPickerOverlay}>
                        <TouchableOpacity style={styles.colorPickerBackdrop} onPress={() => setShowLineSpacingPicker(false)} />
                        <View style={styles.colorPickerCard}>
                            <Text style={styles.colorPickerTitle}>Line Spacing</Text>
                            {LINE_SPACINGS.map(l => (
                                <TouchableOpacity key={l.value} style={styles.pickerItem} onPress={() => handleAction('lineHeight', l.value)}>
                                    <Text>{l.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Modal>

                <Modal visible={showCollabModal} transparent animationType="slide" onRequestClose={() => setShowCollabModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowCollabModal(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Active Collaborators</Text>
                                <TouchableOpacity onPress={() => setShowCollabModal(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                            </View>
                            <FlatList
                                data={noteCollaborators}
                                keyExtractor={item => item._id}
                                renderItem={({ item }) => (
                                    <View style={styles.collabListItem}>
                                        {item.profilePicture ? <Image source={{ uri: item.profilePicture }} style={styles.collabAvatar} /> : (
                                            <View style={[styles.collabAvatar, { backgroundColor: '#0A66C2', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={styles.collabAvatarText}>{item.displayName?.charAt(0)}</Text>
                                            </View>
                                        )}
                                        <View style={styles.collabInfo}>
                                            <Text style={styles.collabName}>{item.displayName} {item._id === user._id && '(You)'}</Text>
                                            {typingCollaborators[item._id]?.isTyping && <Text style={styles.isTypingText}>Typing...</Text>}
                                        </View>
                                        {item._id !== user._id && <View style={[styles.onlineDot, { backgroundColor: '#22C55E' }]} />}
                                    </View>
                                )}
                                contentContainerStyle={{ padding: 20 }}
                                ListEmptyComponent={<Text style={styles.emptyText}>No other collaborators</Text>}
                            />
                        </View>
                    </View>
                </Modal>

                {/* Export Menu Modal */}
                <Modal visible={showExportMenu} transparent animationType="fade" onRequestClose={() => setShowExportMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowExportMenu(false)} />
                        <View style={styles.exportMenuContainer}>
                            <Text style={styles.exportMenuTitle}>Export Note</Text>
                            <TouchableOpacity style={styles.exportMenuItem} onPress={exportToPDF}>
                                <Ionicons name="document-text-outline" size={24} color="#0A66C2" />
                                <View style={styles.exportMenuItemText}>
                                    <Text style={styles.exportMenuItemTitle}>Export as PDF</Text>
                                    <Text style={styles.exportMenuItemDesc}>Save as a PDF document</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.exportMenuItem} onPress={exportToPNG}>
                                <Ionicons name="document-outline" size={24} color="#0A66C2" />
                                <View style={styles.exportMenuItemText}>
                                    <Text style={styles.exportMenuItemTitle}>Export as PDF (Text Only)</Text>
                                    <Text style={styles.exportMenuItemDesc}>Clean text without formatting</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Meeting Selector Modal */}
                <Modal visible={showMeetingSelector} transparent animationType="slide" onRequestClose={() => setShowMeetingSelector(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowMeetingSelector(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {!selectedSharingClub ? 'Select Club' : `Meetings: ${selectedSharingClub.clubId?.name || 'Club'}`}
                                </Text>
                                <TouchableOpacity onPress={() => setShowMeetingSelector(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                            </View>

                            {!selectedSharingClub ? (
                                <FlatList
                                    data={user?.clubsJoined || []}
                                    keyExtractor={item => (item.clubId?._id || item.clubId).toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.clubSelectItem} onPress={() => fetchMeetingsForClub(item)}>
                                            <View style={styles.clubSelectIcon}>
                                                <Ionicons name="business" size={20} color="#0A66C2" />
                                            </View>
                                            <Text style={styles.clubItemName}>{item.clubId?.name || 'Unnamed Club'}</Text>
                                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                    ListHeaderComponent={
                                        <TouchableOpacity style={styles.skipBtn} onPress={() => shareContent()}>
                                            <Text style={styles.skipBtnText}>Share without Meeting Context</Text>
                                        </TouchableOpacity>
                                    }
                                    ListEmptyComponent={
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={styles.emptyText}>You haven't joined any clubs.</Text>
                                            <TouchableOpacity style={styles.skipBtn} onPress={() => shareContent()}>
                                                <Text style={styles.skipBtnText}>Share Plain Note Anyway</Text>
                                            </TouchableOpacity>
                                        </View>
                                    }
                                    contentContainerStyle={{ padding: 20 }}
                                />
                            ) : (
                                <>
                                    {loadingMeetings ? (
                                        <View style={{ padding: 40, alignItems: 'center' }}>
                                            <ActivityIndicator size="large" color="#0A66C2" />
                                            <Text style={[styles.emptyText, { marginTop: 15 }]}>Fetching meetings...</Text>
                                        </View>
                                    ) : (
                                        <FlatList
                                            data={meetings}
                                            keyExtractor={item => item._id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity style={styles.meetingItem} onPress={() => shareContent(item)}>
                                                    <View style={styles.meetingCard}>
                                                        <View style={styles.meetingBadge}>
                                                            <Text style={styles.meetingBadgeText}>{item.type}</Text>
                                                        </View>
                                                        <Text style={styles.meetingItemTitle}>{item.name}</Text>
                                                        <View style={styles.meetingMetaRow}>
                                                            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                                                            <Text style={styles.meetingItemDate}>
                                                                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                            ListHeaderComponent={
                                                <TouchableOpacity style={styles.backToClubs} onPress={() => setSelectedSharingClub(null)}>
                                                    <Ionicons name="arrow-back" size={16} color="#0A66C2" />
                                                    <Text style={styles.backToClubsText}>Back to Club Selection</Text>
                                                </TouchableOpacity>
                                            }
                                            ListEmptyComponent={
                                                <View style={{ padding: 20, alignItems: 'center' }}>
                                                    <Text style={styles.emptyText}>No meetings found for this club.</Text>
                                                    <TouchableOpacity style={styles.skipBtn} onPress={() => shareContent()}>
                                                        <Text style={styles.skipBtnText}>Skip - Share Plain Note</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            }
                                            contentContainerStyle={{ paddingBottom: 30 }}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        );
    };

    return (
        <MainLayout title="Live Notes" navigation={navigation} currentRoute="LiveNotes">
            <View style={styles.container}>
                {!activeNote ? (
                    <>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.welcomeText}>Live Collaboration</Text>
                                <Text style={styles.subtitle}>Personal & Club notes in real-time</Text>
                            </View>
                        </View>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#9CA3AF" />
                            <TextInput style={styles.searchInput} placeholder="Search notes..." value={searchQuery} onChangeText={setSearchQuery} />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#0A66C2" style={{ marginTop: 50 }} />
                        ) : (
                            <GestureHandlerRootView style={{ flex: 1 }}>
                                <FlatList
                                    data={notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase())))}
                                    renderItem={renderNoteItem}
                                    keyExtractor={item => item._id}
                                    contentContainerStyle={styles.noteList}
                                    ListEmptyComponent={
                                        <View style={styles.emptyBox}>
                                            <Ionicons name="document-text-outline" size={64} color="#E5E7EB" />
                                            <Text style={styles.emptyText}>No notes found. Create your first live note!</Text>
                                        </View>
                                    }
                                />
                            </GestureHandlerRootView>
                        )}

                        <Animatable.View animation="bounceIn" duration={800} delay={400} style={styles.fabContainer}>
                            <TouchableOpacity style={styles.fab} onPress={handleCreateNote} activeOpacity={0.8}>
                                <LinearGradient colors={['#0A66C2', '#1e88e5']} style={styles.fabGradient}><Ionicons name="add" size={32} color="#FFF" /></LinearGradient>
                            </TouchableOpacity>
                        </Animatable.View>
                    </>
                ) : renderEditor()}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    welcomeText: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
    subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    fabContainer: { position: 'absolute', bottom: 30, right: 25, zIndex: 100, elevation: 10, shadowColor: '#0A66C2', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
    fab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
    fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, paddingHorizontal: 15, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1F2937' },
    noteList: { paddingBottom: 100 },
    noteCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    noteIconContainer: { position: 'relative' },
    noteIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    lockBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#6B7280', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    noteInfo: { flex: 1, marginLeft: 16 },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    noteTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', maxWidth: '80%' },
    noteDate: { fontSize: 12, color: '#9CA3AF' },
    noteMeta: { flexDirection: 'row', alignItems: 'center' },
    noteAuthor: { fontSize: 13, color: '#0A66C2', fontWeight: '600' },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB', marginHorizontal: 8 },
    noteSnippet: { flex: 1, fontSize: 13, color: '#6B7280' },
    swipeDeleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' },
    swipeDeleteText: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 4 },
    emptyBox: { alignItems: 'center', marginTop: 100, padding: 40 },
    emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 16 },

    // Editor Styles
    editorContainer: { flex: 1, backgroundColor: '#FFF' },
    editorHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF' },
    backBtn: { padding: 8 },
    presenceBar: { flex: 1, paddingHorizontal: 10 },
    avatarScroll: { flexDirection: 'row' },
    avatarWrapper: { position: 'relative', marginRight: -8 },
    avatarContainer: { borderRadius: 18, padding: 2, backgroundColor: 'transparent' },
    avatarTyping: { borderWidth: 2, borderRadius: 50, borderColor: '#0A66C2', backgroundColor: '#FFF' },
    tinyAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#FFF' },
    tinyAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    extraBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginLeft: 12, borderWidth: 2, borderColor: '#FFF' },
    extraText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
    shareBtn: { padding: 8 },

    // Custom Toolbar
    customToolbarContainer: { backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 5, zIndex: 1000, elevation: 5 },
    toolbarContent: { paddingHorizontal: 10, alignItems: 'center' },
    toolbarBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
    toolbarBtnActive: { backgroundColor: '#E0F2FE' },
    toolbarDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 6 },

    richEditor: { backgroundColor: '#FFF' },
    editorWrapper: { flex: 1, minHeight: height * 0.7, paddingHorizontal: 20 },
    webInput: { fontSize: 16, color: '#1F2937', minHeight: 400, textAlignVertical: 'top', paddingTop: 10 },
    editorInner: { flex: 1, backgroundColor: '#FFF' },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
    contentTitleInput: { flex: 1, fontSize: 24, fontWeight: '800', color: '#111827', padding: 0 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginLeft: 15 },
    privateBadge: { backgroundColor: '#6B7280' },
    publicBadge: { backgroundColor: '#0A66C2' },
    statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', marginLeft: 4 },
    titleSeparator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20, marginBottom: 15 },

    // Meeting Selector
    clubSelectItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    clubSelectIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    clubItemName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1F2937' },
    meetingItem: { paddingHorizontal: 20, marginBottom: 15 },
    meetingCard: { padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    meetingBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6', marginBottom: 8 },
    meetingBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
    meetingItemTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    meetingMetaRow: { flexDirection: 'row', alignItems: 'center' },
    meetingItemDate: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
    skipBtn: { marginBottom: 15, padding: 15, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
    skipBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 14 },
    backToClubs: { flexDirection: 'row', alignItems: 'center', padding: 15, marginLeft: 5 },
    backToClubsText: { fontSize: 14, fontWeight: '600', color: '#0A66C2', marginLeft: 8 },

    // Export Menu
    exportMenuContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    exportMenuTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 20,
    },
    exportMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        marginBottom: 12,
    },
    exportMenuItemText: {
        flex: 1,
        marginLeft: 16,
    },
    exportMenuItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    exportMenuItemDesc: {
        fontSize: 13,
        color: '#6B7280',
    },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: height * 0.5, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    collabListItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    collabAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    collabAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    collabInfo: { flex: 1, marginLeft: 15 },
    collabName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    isTypingText: { fontSize: 12, color: '#22C55E', marginTop: 2 },
    onlineDot: { width: 10, height: 10, borderRadius: 5 },

    // Color Picker
    colorPickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    colorPickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    colorPickerCard: { width: width * 0.8, backgroundColor: '#FFF', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
    colorPickerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 20 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
    colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F3F4F6' },
    colorPickerClose: { marginTop: 30, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, backgroundColor: '#F3F4F6' },
    colorPickerCloseText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
    pickerItem: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    webToolbarHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginLeft: 10, alignSelf: 'center' }
});

export default LiveNotesScreen;
