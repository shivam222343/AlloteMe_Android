// Lightweight festival database with emojis
// Format: 'MM-DD': { name, emoji, color, category, info }

export const FESTIVALS = {
    // January
    '01-01': { name: "New Year's Day", emoji: '🎉', color: '#FFD700', category: 'National', info: 'Start of the Gregorian calendar year' },
    '01-14': { name: 'Makar Sankranti', emoji: '🪁', color: '#FF6B6B', category: 'Hindu', info: 'Harvest festival marking the sun\'s transition' },
    '01-15': { name: 'Pongal', emoji: '🌾', color: '#FFA500', category: 'Hindu', info: 'Tamil harvest festival' },
    '01-26': { name: 'Republic Day', emoji: '🇮🇳', color: '#FF9933', category: 'National', info: 'Constitution of India came into effect (1950)' },

    // February
    '02-14': { name: 'Valentine\'s Day', emoji: '❤️', color: '#FF1493', category: 'Social', info: 'Day of love and romance' },
    '02-19': { name: 'Shivratri', emoji: '🕉️', color: '#4A90E2', category: 'Hindu', info: 'Night of Lord Shiva' },
    '02-21': { name: 'Maha Shivratri', emoji: '🔱', color: '#6A5ACD', category: 'Hindu', info: 'Great night of Shiva' },

    // March
    '03-08': { name: 'Holi', emoji: '🎨', color: '#FF69B4', category: 'Hindu', info: 'Festival of colors' },
    '03-08': { name: 'Women\'s Day', emoji: '👩', color: '#FF1493', category: 'Social', info: 'International Women\'s Day' },
    '03-25': { name: 'Ugadi', emoji: '🌸', color: '#FF6347', category: 'Hindu', info: 'Telugu and Kannada New Year' },

    // April
    '04-01': { name: 'April Fool\'s Day', emoji: '🤡', color: '#FFD700', category: 'Social', info: 'Day of pranks and jokes' },
    '04-06': { name: 'Mahavir Jayanti', emoji: '🙏', color: '#FFA500', category: 'Jain', info: 'Birth of Lord Mahavira' },
    '04-10': { name: 'Eid al-Fitr', emoji: '🌙', color: '#00CED1', category: 'Islamic', info: 'Festival of breaking the fast' },
    '04-13': { name: 'Baisakhi', emoji: '🌾', color: '#FFD700', category: 'Sikh', info: 'Punjabi harvest festival' },
    '04-14': { name: 'Ambedkar Jayanti', emoji: '📚', color: '#4169E1', category: 'National', info: 'Birth of Dr. B.R. Ambedkar' },
    '04-21': { name: 'Ram Navami', emoji: '🏹', color: '#FF6347', category: 'Hindu', info: 'Birth of Lord Rama' },
    '04-22': { name: 'Earth Day', emoji: '🌍', color: '#228B22', category: 'Social', info: 'Environmental protection awareness' },

    // May
    '05-01': { name: 'Labour Day', emoji: '👷', color: '#DC143C', category: 'National', info: 'International Workers\' Day' },
    '05-12': { name: 'Mother\'s Day', emoji: '👩‍👧', color: '#FF69B4', category: 'Social', info: 'Honoring mothers' },
    '05-23': { name: 'Buddha Purnima', emoji: '☸️', color: '#FFD700', category: 'Buddhist', info: 'Birth of Gautama Buddha' },

    // June
    '06-16': { name: 'Father\'s Day', emoji: '👨‍👧', color: '#4169E1', category: 'Social', info: 'Honoring fathers' },
    '06-17': { name: 'Eid al-Adha', emoji: '🕌', color: '#00CED1', category: 'Islamic', info: 'Festival of sacrifice' },
    '06-21': { name: 'Yoga Day', emoji: '🧘', color: '#FF6347', category: 'National', info: 'International Day of Yoga' },

    // July
    '07-07': { name: 'Rath Yatra', emoji: '🛕', color: '#FFD700', category: 'Hindu', info: 'Chariot festival of Lord Jagannath' },

    // August
    '08-15': { name: 'Independence Day', emoji: '🇮🇳', color: '#FF9933', category: 'National', info: 'Freedom from British rule (1947)' },
    '08-19': { name: 'Raksha Bandhan', emoji: '🎀', color: '#FF1493', category: 'Hindu', info: 'Bond between brothers and sisters' },
    '08-26': { name: 'Janmashtami', emoji: '🦚', color: '#4169E1', category: 'Hindu', info: 'Birth of Lord Krishna' },

    // September
    '09-05': { name: 'Teacher\'s Day', emoji: '👨‍🏫', color: '#4169E1', category: 'National', info: 'Honoring teachers' },
    '09-17': { name: 'Ganesh Chaturthi', emoji: '🐘', color: '#FF6347', category: 'Hindu', info: 'Birth of Lord Ganesha' },

    // October
    '10-02': { name: 'Gandhi Jayanti', emoji: '🕊️', color: '#FF9933', category: 'National', info: 'Birth of Mahatma Gandhi' },
    '10-12': { name: 'Dussehra', emoji: '🏹', color: '#FFD700', category: 'Hindu', info: 'Victory of good over evil' },
    '10-24': { name: 'Diwali', emoji: '🪔', color: '#FFD700', category: 'Hindu', info: 'Festival of lights' },
    '10-31': { name: 'Halloween', emoji: '🎃', color: '#FF8C00', category: 'Social', info: 'Spooky celebration' },

    // November
    '11-01': { name: 'Kannada Rajyotsava', emoji: '🎊', color: '#DC143C', category: 'Regional', info: 'Karnataka Formation Day' },
    '11-07': { name: 'Chhath Puja', emoji: '🌅', color: '#FF6347', category: 'Hindu', info: 'Worship of Sun God' },
    '11-12': { name: 'Diwali', emoji: '🪔', color: '#FFD700', category: 'Hindu', info: 'Festival of lights (varies)' },
    '11-14': { name: 'Children\'s Day', emoji: '👶', color: '#FF69B4', category: 'National', info: 'Birth of Jawaharlal Nehru' },
    '11-15': { name: 'Guru Nanak Jayanti', emoji: '🙏', color: '#FFD700', category: 'Sikh', info: 'Birth of Guru Nanak Dev Ji' },

    // December
    '12-25': { name: 'Christmas', emoji: '🎄', color: '#DC143C', category: 'Christian', info: 'Birth of Jesus Christ' },
    '12-31': { name: 'New Year\'s Eve', emoji: '🎆', color: '#FFD700', category: 'Social', info: 'Last day of the year' },
};

// Category colors for dots
export const CATEGORY_COLORS = {
    'National': '#FF9933',
    'Hindu': '#FFD700',
    'Islamic': '#00CED1',
    'Christian': '#DC143C',
    'Sikh': '#FFD700',
    'Buddhist': '#FFA500',
    'Jain': '#FFA500',
    'Social': '#FF69B4',
    'Regional': '#4169E1',
};
