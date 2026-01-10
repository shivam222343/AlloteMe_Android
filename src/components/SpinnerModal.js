import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SpinnerModal = ({ visible, onClose, onCreate, members }) => {
    const [title, setTitle] = useState('Who decides?');
    const [items, setItems] = useState([]);
    const [customText, setCustomText] = useState('');
    const [activeTab, setActiveTab] = useState('members');

    const panY = React.useRef(new Animated.Value(0)).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (e, gs) => {
                if (gs.dy > 0) {
                    panY.setValue(gs.dy);
                }
            },
            onPanResponderRelease: (e, gs) => {
                if (gs.dy > 150 || gs.vy > 0.5) {
                    onClose();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    React.useEffect(() => {
        if (visible) {
            panY.setValue(0);
        }
    }, [visible]);

    const toggleMember = (member) => {
        const name = member.displayName;
        if (items.includes(name)) {
            setItems(items.filter(i => i !== name));
        } else {
            setItems([...items, name]);
        }
    };

    const addCustomItem = () => {
        if (customText.trim()) {
            setItems([...items, customText.trim()]);
            setCustomText('');
        }
    };

    const handleCreate = () => {
        if (items.length < 2) return alert('Please add at least 2 items to the spinner');

        onCreate({
            items,
            status: 'idle'
        });
        reset();
    };

    const reset = () => {
        setItems([]);
        setCustomText('');
        setActiveTab('members');
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ translateY: panY }] }
                    ]}
                >
                    <View {...panResponder.panHandlers}>
                        <View style={styles.handle} />
                    </View>
                    <View style={styles.header}>
                        <Text style={styles.title}>Random Spinner</Text>
                    </View>

                    <TextInput
                        style={styles.titleInput}
                        placeholder="Spinner Title (e.g. Winner gets lunch)"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
                            onPress={() => setActiveTab('members')}
                        >
                            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
                            onPress={() => setActiveTab('custom')}
                        >
                            <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>Custom Text</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.selectionArea}>
                        {activeTab === 'members' ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.memberGrid}>
                                    {members.map(member => (
                                        <TouchableOpacity
                                            key={member._id}
                                            style={[styles.memberChip, items.includes(member.displayName) && styles.memberChipActive]}
                                            onPress={() => toggleMember(member)}
                                        >
                                            {member.profilePicture?.url ? (
                                                <Image source={{ uri: member.profilePicture.url }} style={styles.avatar} />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarLetter}>{member.displayName[0]}</Text>
                                                </View>
                                            )}
                                            <Text
                                                style={[styles.memberName, items.includes(member.displayName) && styles.memberNameActive]}
                                                numberOfLines={1}
                                            >
                                                {member.displayName}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.optionInput}
                                        placeholder="Add word/text..."
                                        value={customText}
                                        onChangeText={setCustomText}
                                        onSubmitEditing={addCustomItem}
                                    />
                                    <TouchableOpacity style={styles.addBtn} onPress={addCustomItem}>
                                        <Ionicons name="add" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal style={styles.customTags} showsHorizontalScrollIndicator={false}>
                                    {items.filter(i => !members.find(m => m.displayName === i)).map((item, idx) => (
                                        <View key={idx} style={styles.itemTag}>
                                            <Text style={styles.itemTagText}>{item}</Text>
                                            <TouchableOpacity onPress={() => setItems(items.filter(it => it !== item))}>
                                                <Ionicons name="close-circle" size={16} color="#6B7280" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={styles.summary}>
                        <Text style={styles.summaryText}>{items.length} items added</Text>
                        <View style={styles.selectedList}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {items.map((it, idx) => (
                                    <Text key={idx} style={styles.miniTag}>{it}</Text>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                        <Text style={styles.createBtnText}>Setup Spinner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bottomCloseBtn}
                        onPress={onClose}
                    >
                        <Text style={styles.bottomCloseText}>Close</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '85%',
        height: 600,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
    },
    titleInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#0A66C2',
    },
    selectionArea: {
        flex: 1,
        marginBottom: 15,
    },
    memberGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    memberChip: {
        width: '31%',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    memberChipActive: {
        backgroundColor: '#E8F2FF',
        borderColor: '#0A66C2',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 6,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0A66C2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatarLetter: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    memberName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        textAlign: 'center',
    },
    memberNameActive: {
        color: '#0A66C2',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    optionInput: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
    },
    addBtn: {
        backgroundColor: '#0A66C2',
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customTags: {
        flexDirection: 'row',
    },
    itemTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        gap: 6,
    },
    itemTagText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    summary: {
        marginBottom: 20,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    selectedList: {
        flexDirection: 'row',
    },
    miniTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#0A66C2',
        color: '#FFF',
        fontSize: 11,
        borderRadius: 10,
        marginRight: 6,
        fontWeight: '600',
    },
    createBtn: {
        backgroundColor: '#0A66C2',
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    createBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
    },
    bottomCloseBtn: {
        marginTop: 15,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 15,
        alignItems: 'center',
    },
    bottomCloseText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    }
});

export default SpinnerModal;
