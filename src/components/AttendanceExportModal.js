import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { adminAPI, clubsAPI } from '../services/api';

const AttendanceExportModal = ({ visible, onClose, clubs = [] }) => {
    const [selectedClub, setSelectedClub] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState('csv'); // 'csv' or 'pdf'
    const [timeRange, setTimeRange] = useState(0); // 0 = All Time, 1 = 1 month, 2 = 2 months, 3 = 3 months
    const [warningOnly, setWarningOnly] = useState(false);

    // Animation for sliding line
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: timeRange,
            useNativeDriver: false,
            friction: 8,
            tension: 40
        }).start();
    }, [timeRange]);

    useEffect(() => {
        if (visible && clubs.length > 0 && !selectedClub) {
            setSelectedClub(clubs[0]);
        }
    }, [visible, clubs]);

    const generateCSV = (data) => {
        const { clubName, meetings = [], members = [] } = data;

        // CSV Header
        let csv = `Attendance Report - ${clubName}\n`;
        csv += `Generated on: ${new Date().toLocaleString()}\n\n`;

        // Table Header
        csv += 'Member Name,Maverick ID,Email,';
        meetings.forEach(meeting => {
            csv += `"${meeting.name} (${new Date(meeting.date).toLocaleDateString()})",`;
        });
        csv += 'Total Present,Total Meetings,Attendance %\n';

        // Member Rows
        members.forEach(member => {
            const memberId = (member._id || member.id)?.toString();
            csv += `"${member.displayName}","${member.maverickId}","${member.email}",`;

            let presentCount = 0;
            meetings.forEach(meeting => {
                const attendance = meeting.attendees?.find(a => {
                    const attendeeId = (a.userId?._id || a.userId)?.toString();
                    return attendeeId === memberId;
                });
                const status = attendance?.status || 'absent';
                csv += `${status},`;
                if (status === 'present') presentCount++;
            });

            const attendanceRate = meetings.length > 0
                ? ((presentCount / meetings.length) * 100).toFixed(1)
                : '0.0';

            csv += `${presentCount},${meetings.length},${attendanceRate}%\n`;
        });

        return csv;
    };

    const generateHTML = (data) => {
        const { clubName, meetings = [], members = [] } = data;
        const generatedOn = new Date().toLocaleDateString();

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report - ${clubName}</title>
    <style>
        :root {
            --primary: #1a1a1a;
            --secondary: #666666;
            --accent: #0066cc;
            --border: #eeeeee;
            --present: #2e7d32;
            --absent: #c62828;
            --late: #ef6c00;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--primary);
            line-height: 1.5;
            background-color: #ffffff;
            padding: 40px;
        }
        .report-header {
            margin-bottom: 40px;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
        }
        .report-header h1 {
            font-size: 28px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            margin-bottom: 5px;
        }
        .report-header p {
            color: var(--secondary);
            font-size: 14px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .meta-item {
            padding: 15px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        .meta-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--secondary);
            margin-bottom: 5px;
        }
        .meta-value {
            font-size: 18px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th {
            background: #f5f5f5;
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            border-bottom: 1px solid var(--border);
            white-space: nowrap;
        }
        td {
            padding: 12px 10px;
            border-bottom: 1px solid var(--border);
        }
        tr:nth-child(even) { background-color: #fafafa; }
        .status {
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .status-present { color: var(--present); background: #e8f5e9; }
        .status-absent { color: var(--absent); background: #ffebee; }
        .status-late { color: var(--late); background: #fff3e0; }
        
        .rate { font-weight: 700; }
        .rate-high { color: var(--present); }
        .rate-mid { color: var(--late); }
        .rate-low { color: var(--absent); }

        .footer {
            margin-top: 60px;
            font-size: 11px;
            color: var(--secondary);
            text-align: center;
            border-top: 1px solid var(--border);
            padding-top: 20px;
        }
        @media print {
            body { padding: 0; }
            .meta-item { background: transparent; border: 1px solid var(--border); }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>Attendance Report</h1>
        <p>${clubName} • Mavericks Club Management System</p>
    </div>

    <div class="meta-grid">
        <div class="meta-item">
            <div class="meta-label">Club</div>
            <div class="meta-value">${clubName}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Total Members</div>
            <div class="meta-value">${members.length}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Meetings Tracked</div>
            <div class="meta-value">${meetings.length}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Generated On</div>
            <div class="meta-value">${generatedOn}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Member Name</th>
                <th>Maverick ID</th>
                ${meetings.map(m => `<th>${m.name}<br/><small style="font-weight:400;color:#888;">${new Date(m.date).toLocaleDateString()}</small></th>`).join('')}
                <th>Present</th>
                <th>Rate</th>
            </tr>
        </thead>
        <tbody>
            ${members.length === 0 ? '<tr><td colspan="100%" style="text-align:center;padding:40px;color:#999;">No members found for this club.</td></tr>' :
                members.map(member => {
                    const memberId = (member._id || member.id)?.toString();
                    let presentCount = 0;

                    const attendanceCells = meetings.map(meeting => {
                        const attendance = meeting.attendees?.find(a => {
                            const attendeeId = (a.userId?._id || a.userId)?.toString();
                            return attendeeId === memberId;
                        });
                        const status = attendance?.status || 'absent';
                        if (status === 'present') presentCount++;

                        return `<td><span class="status status-${status}">${status}</span></td>`;
                    }).join('');

                    const rateValue = meetings.length > 0 ? (presentCount / meetings.length) * 100 : 0;
                    const rateClass = rateValue >= 75 ? 'rate-high' : rateValue >= 50 ? 'rate-mid' : 'rate-low';

                    return `
                    <tr>
                        <td style="font-weight:600;">${member.displayName}</td>
                        <td style="color:#666;">${member.maverickId}</td>
                        ${attendanceCells}
                        <td style="font-weight:600;">${presentCount}/${meetings.length}</td>
                        <td class="rate ${rateClass}">${rateValue.toFixed(1)}%</td>
                    </tr>
                `;
                }).join('')}
        </tbody>
    </table>

    <div class="footer">
        This is a system-generated document. &copy; ${new Date().getFullYear()} Mavericks Club Management System.
    </div>
</body>
</html>`;
    };

    const generateWarningCSV = (data) => {
        const { clubName, members = [] } = data;
        let csv = `Critical Attendance Report - ${clubName}\n`;
        csv += `Filter: Members with 3+ Consecutive Absences\n`;
        csv += `Generated on: ${new Date().toLocaleString()}\n\n`;
        csv += 'Member Name,Maverick ID,Email,Phone,Role,Consecutive Missed,Joined At\n';

        members.forEach(m => {
            csv += `"${m.displayName}","${m.maverickId}","${m.email}","${m.phoneNumber || ''}","${m.role}","${m.consecutiveAbsences}","${new Date(m.joinedAt).toLocaleDateString()}"\n`;
        });
        return csv;
    };

    const generateWarningHTML = (data) => {
        const { clubName, members = [] } = data;
        const generatedOn = new Date().toLocaleDateString();

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
        .header { border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #ef4444; margin-bottom: 5px; font-size: 24px; text-transform: uppercase; }
        p { color: #666; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #fee2e2; text-align: left; padding: 12px; border-bottom: 1px solid #f87171; font-size: 13px; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .warning-badge { background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Critical Attendance List</h1>
        <p><strong>Club:</strong> ${clubName}</p>
        <p><strong>Criteria:</strong> Members with 3 or more consecutive absences</p>
        <p><strong>Generated:</strong> ${generatedOn}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Member Name</th>
                <th>Maverick ID</th>
                <th>Contact info</th>
                <th>Missed Streak</th>
                <th>Role</th>
            </tr>
        </thead>
        <tbody>
            ${members.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #999;">No members currently in warning zone.</td></tr>' :
                members.map(m => `
                <tr>
                    <td><strong>${m.displayName}</strong></td>
                    <td>${m.maverickId}</td>
                    <td>${m.email}<br/><small>${m.phoneNumber || ''}</small></td>
                    <td><span class="warning-badge">${m.consecutiveAbsences} Meetings</span></td>
                    <td>${m.role.toUpperCase()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <div style="margin-top: 40px; font-size: 11px; color: #999; text-align: center;">
        Generated by Mavericks Management System
    </div>
</body>
</html>`;
    };

    const handleExport = async () => {
        if (!selectedClub) {
            Alert.alert('Error', 'Please select a club');
            return;
        }

        setExporting(true);
        try {
            let data;
            let fileName, fileContent, mimeType;

            if (warningOnly) {
                // Fetch only warned members
                const response = await clubsAPI.getAttendanceWarnings(selectedClub._id);
                if (!response.success) throw new Error(response.message || 'Failed to fetch warnings');

                data = {
                    clubName: selectedClub.name,
                    members: response.data
                };

                if (exportFormat === 'csv') {
                    fileName = `${selectedClub.name.replace(/\s+/g, '_')}_Critical_Attendance_${Date.now()}.csv`;
                    fileContent = generateWarningCSV(data);
                    mimeType = 'text/csv';
                } else {
                    fileName = `${selectedClub.name.replace(/\s+/g, '_')}_Critical_Attendance_${Date.now()}.html`;
                    fileContent = generateWarningHTML(data);
                    mimeType = 'text/html';
                }
            } else {
                // Standard full report
                const response = await adminAPI.getClubAttendanceReport(
                    selectedClub._id,
                    timeRange > 0 ? timeRange : undefined
                );

                if (!response.success) {
                    throw new Error(response.message || 'Failed to fetch data');
                }

                data = {
                    clubName: selectedClub.name,
                    meetings: response.data.meetings,
                    members: response.data.members,
                };

                if (exportFormat === 'csv') {
                    fileName = `${selectedClub.name.replace(/\s+/g, '_')}_Attendance_${Date.now()}.csv`;
                    fileContent = generateCSV(data);
                    mimeType = 'text/csv';
                } else {
                    fileName = `${selectedClub.name.replace(/\s+/g, '_')}_Attendance_${Date.now()}.html`;
                    fileContent = generateHTML(data);
                    mimeType = 'text/html';
                }
            }

            // Handle platform-specific export
            if (Platform.OS === 'web') {
                const blob = new Blob([fileContent], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                Alert.alert('Success', 'Report downloaded successfully');
            } else {
                // Native Mobile logic
                const fileUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, fileContent, {
                    encoding: 'utf8',
                });

                // Share file
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                        mimeType: mimeType,
                        dialogTitle: 'Export Attendance Report',
                        UTI: exportFormat === 'csv' ? 'public.comma-separated-values-text' : 'public.html',
                    });
                } else {
                    Alert.alert('Success', `Report saved to: ${fileUri} `);
                }
            }

            onClose();
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Error', error.message || 'Failed to export attendance data');
        } finally {
            setExporting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Export Attendance Report</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={28} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Select Club */}
                        <Text style={styles.label}>Select Club</Text>
                        <View style={styles.clubList}>
                            {(!clubs || clubs.length === 0) ? (
                                <View style={styles.noClubsBox}>
                                    <Text style={styles.noClubsText}>No clubs available. Please check admin settings.</Text>
                                </View>
                            ) : (
                                clubs.map(club => (
                                    <TouchableOpacity
                                        key={club._id}
                                        style={[
                                            styles.clubChip,
                                            selectedClub?._id === club._id && styles.clubChipActive
                                        ]}
                                        onPress={() => setSelectedClub(club)}
                                    >
                                        <Text style={[
                                            styles.clubChipText,
                                            selectedClub?._id === club._id && styles.clubChipTextActive
                                        ]}>
                                            {club.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        {/* Select Format */}
                        <Text style={styles.label}>Export Format</Text>
                        <View style={styles.formatRow}>
                            <TouchableOpacity
                                style={[
                                    styles.formatBtn,
                                    exportFormat === 'csv' && styles.formatBtnActive
                                ]}
                                onPress={() => setExportFormat('csv')}
                            >
                                <Ionicons
                                    name="document-text"
                                    size={24}
                                    color={exportFormat === 'csv' ? '#0A66C2' : '#6B7280'}
                                />
                                <Text style={[
                                    styles.formatText,
                                    exportFormat === 'csv' && styles.formatTextActive
                                ]}>
                                    CSV
                                </Text>
                                <Text style={styles.formatDesc}>Excel Compatible</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.formatBtn,
                                    exportFormat === 'pdf' && styles.formatBtnActive
                                ]}
                                onPress={() => setExportFormat('pdf')}
                            >
                                <Ionicons
                                    name="document"
                                    size={24}
                                    color={exportFormat === 'pdf' ? '#0A66C2' : '#6B7280'}
                                />
                                <Text style={[
                                    styles.formatText,
                                    exportFormat === 'pdf' && styles.formatTextActive
                                ]}>
                                    HTML/PDF
                                </Text>
                                <Text style={styles.formatDesc}>Styled Report</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Critical Absences Toggle */}
                        <Text style={styles.label}>Advanced Filters</Text>
                        <TouchableOpacity
                            style={[styles.filterToggle, warningOnly && styles.filterToggleActive]}
                            onPress={() => setWarningOnly(!warningOnly)}
                        >
                            <View style={styles.filterInfo}>
                                <Ionicons
                                    name={warningOnly ? "warning" : "warning-outline"}
                                    size={20}
                                    color={warningOnly ? "#EF4444" : "#6B7280"}
                                />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.filterTitle, warningOnly && { color: '#EF4444' }]}>
                                        Critical Absences (3+) Only
                                    </Text>
                                    <Text style={styles.filterDesc}>
                                        Export a separate list of members needing warnings
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.checkbox, warningOnly && styles.checkboxActive]}>
                                {warningOnly && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        {/* Select Time Range - Hide if warning only search as it returns all time usually */}
                        {!warningOnly && (
                            <>
                                <Text style={styles.label}>Select Time Range</Text>
                                <View style={styles.rangeContainer}>
                                    {/* Animated Background Indicator */}
                                    <Animated.View
                                        style={[
                                            styles.activeLine,
                                            {
                                                width: '24%',
                                                left: slideAnim.interpolate({
                                                    inputRange: [0, 1, 2, 3],
                                                    outputRange: ['0.5%', '25.5%', '50.5%', '75.5%']
                                                })
                                            }
                                        ]}
                                    />

                                    {[
                                        { label: 'ALL', value: 0 },
                                        { label: '1 Month', value: 1 },
                                        { label: '2 Months', value: 2 },
                                        { label: '3 Months', value: 3 },
                                    ].map((item) => (
                                        <TouchableOpacity
                                            key={item.value}
                                            style={styles.rangeItem}
                                            onPress={() => setTimeRange(item.value)}
                                        >
                                            <Text style={[
                                                styles.rangeText,
                                                timeRange === item.value && styles.rangeTextActive
                                            ]}>
                                                {item.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Info */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color="#0A66C2" />
                            <Text style={styles.infoText}>
                                {warningOnly
                                    ? 'This will generate a separate list of members who have missed 3 or more meetings consecutively, including their contact details for followup.'
                                    : exportFormat === 'csv'
                                        ? 'CSV format can be opened in Excel, Google Sheets, or any spreadsheet application.'
                                        : 'HTML format includes color-coded attendance status and can be printed or converted to PDF.'}
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.exportBtn, (!selectedClub || exporting) && styles.exportBtnDisabled]}
                            onPress={handleExport}
                            disabled={!selectedClub || exporting}
                        >
                            {exporting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="download" size={20} color="#FFF" />
                                    <Text style={styles.exportText}>Export Report</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        marginTop: 16,
    },
    clubList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    clubChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    clubChipActive: {
        backgroundColor: '#E0F2FE',
        borderColor: '#0A66C2',
    },
    clubChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    clubChipTextActive: {
        color: '#0A66C2',
    },
    noClubsBox: {
        width: '100%',
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    noClubsText: {
        fontSize: 12,
        color: '#B91C1C',
        textAlign: 'center',
    },
    formatRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formatBtn: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    formatBtnActive: {
        backgroundColor: '#F0F9FF',
        borderColor: '#0A66C2',
    },
    formatText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 8,
    },
    formatTextActive: {
        color: '#0A66C2',
    },
    formatDesc: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    rangeContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        height: 48,
        position: 'relative',
    },
    rangeItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    rangeItemActive: {
        // Transparent because the sliding line handles the highlight
    },
    rangeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9CA3AF',
    },
    rangeTextActive: {
        color: '#0A66C2',
    },
    activeLine: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        // Calculate based on index, but for simplicity we use state-based rendering here
        // In a more advanced version we'd use Animated for smooth sliding
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F0F9FF',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#0369A1',
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    exportBtn: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#0A66C2',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    exportBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    exportText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    filterToggleActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    filterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    filterTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
    },
    filterDesc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    checkboxActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
});

export default AttendanceExportModal;
