# Skeleton Loading Components - Usage Guide

## Available Components

### 1. Basic Components
- `SkeletonBox` - Basic skeleton element with customizable width, height, borderRadius
- `SkeletonCard` - Card container for grouped skeleton elements
- `SkeletonListItem` - Generic list item with optional avatar

### 2. Screen-Specific Components

#### Meetings Screen
```javascript
import { SkeletonMeetingCard } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        <SkeletonMeetingCard />
        <SkeletonMeetingCard />
        <SkeletonMeetingCard />
    </>
)}
```

#### Members Screen
```javascript
import { SkeletonMemberCard } from '../components/SkeletonLoader';

// Usage:
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
    {loading && Array.from({ length: 6 }).map((_, i) => (
        <SkeletonMemberCard key={i} />
    ))}
</View>
```

#### Chat Screen
```javascript
import { SkeletonChatMessage } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        <SkeletonChatMessage isMine={false} />
        <SkeletonChatMessage isMine={true} />
        <SkeletonChatMessage isMine={false} />
    </>
)}
```

#### Tasks Screen
```javascript
import { SkeletonTaskCard, SkeletonStatCard, SkeletonFilterChips } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        {/* Analytics */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <SkeletonStatCard borderColor="#0A66C2" />
            <SkeletonStatCard borderColor="#10B981" />
        </View>
        
        {/* Filters */}
        <SkeletonFilterChips count={4} />
        
        {/* Task List */}
        <SkeletonTaskCard />
        <SkeletonTaskCard />
        <SkeletonTaskCard />
    </>
)}
```

#### Gallery Screen
```javascript
import { SkeletonGalleryGrid, SkeletonFilterChips } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        <SkeletonFilterChips count={4} />
        <SkeletonGalleryGrid items={8} />
    </>
)}
```

#### Analytics Screen
```javascript
import { SkeletonStatCard, SkeletonCard, SkeletonBox } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        {/* AI Recommendations */}
        <SkeletonCard>
            <SkeletonBox width={150} height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width="95%" height={14} />
        </SkeletonCard>
        
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <SkeletonStatCard />
            <SkeletonStatCard />
        </View>
    </>
)}
```

#### Admin Panel
```javascript
import { SkeletonTableRow } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        <SkeletonTableRow columns={5} />
        <SkeletonTableRow columns={5} />
        <SkeletonTableRow columns={5} />
    </>
)}
```

#### Notifications
```javascript
import { SkeletonNotification } from '../components/SkeletonLoader';

// Usage:
{loading && (
    <>
        <SkeletonNotification />
        <SkeletonNotification />
        <SkeletonNotification />
    </>
)}
```

#### Dashboard Stats
```javascript
import { SkeletonStatsGrid } from '../components/SkeletonLoader';

// Usage:
{loading && <SkeletonStatsGrid items={4} />}
```

## Best Practices

1. **Show Only Loading Parts**: Display skeleton only for data-dependent sections
2. **Keep Static Elements Visible**: Headers, navigation, and static UI should remain visible
3. **Match Actual Layout**: Skeleton should mirror the real content structure
4. **Use Appropriate Components**: Choose the right skeleton component for each section
5. **Consistent Styling**: All skeletons use the same color (#E2E8F0) and opacity (0.6)

## Example: Complete Screen Implementation

```javascript
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import MainLayout from '../components/MainLayout';
import { 
    SkeletonMeetingCard, 
    SkeletonFilterChips,
    SkeletonStatsGrid 
} from '../components/SkeletonLoader';

const MeetingsScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState([]);

    useEffect(() => {
        fetchMeetings();
    }, []);

    return (
        <MainLayout navigation={navigation} title="Meetings">
            <ScrollView>
                {/* Static Header - Always Visible */}
                <Text style={styles.title}>Upcoming Meetings</Text>
                
                {/* Filters - Show Skeleton While Loading */}
                {loading ? (
                    <SkeletonFilterChips count={3} />
                ) : (
                    <FilterChips data={clubs} />
                )}
                
                {/* Stats - Show Skeleton While Loading */}
                {loading ? (
                    <SkeletonStatsGrid items={2} />
                ) : (
                    <StatsGrid data={stats} />
                )}
                
                {/* Meeting List - Show Skeleton While Loading */}
                {loading ? (
                    <>
                        <SkeletonMeetingCard />
                        <SkeletonMeetingCard />
                        <SkeletonMeetingCard />
                    </>
                ) : (
                    meetings.map(meeting => (
                        <MeetingCard key={meeting.id} data={meeting} />
                    ))
                )}
            </ScrollView>
        </MainLayout>
    );
};
```
