// Festival notification messages with emojis
export const FESTIVAL_MESSAGES = {
    'Diwali': [
        '🪔 Happy Diwali! May your life be filled with light and prosperity! ✨',
        '✨ Wishing you a sparkling Diwali full of joy and happiness! 🪔',
        '🎆 May this Diwali bring endless moments of joy and love! 💫',
        '🪔 Light up your life with happiness this Diwali! 🌟',
        '✨ Have a blessed and prosperous Diwali! 🙏🪔'
    ],
    'Holi': [
        '🎨 Happy Holi! May your life be as colorful as the festival! 🌈',
        '🌈 Wishing you a vibrant and joyful Holi! 🎨',
        '💜 Let the colors of Holi spread happiness in your life! 🎨',
        '🎨 May this Holi paint your life with beautiful colors! 🌈',
        '🌈 Have a colorful and fun-filled Holi celebration! 🎨'
    ],
    'Christmas': [
        '🎄 Merry Christmas! May your day be merry and bright! ⭐',
        '⭐ Wishing you a magical Christmas filled with love! 🎅',
        '🎅 May Santa bring you lots of happiness this Christmas! 🎁',
        '🎄 Have a blessed and joyful Christmas! ⛄',
        '⭐ Sending you warm Christmas wishes and cheer! 🎄'
    ],
    'New Year\'s Day': [
        '🎉 Happy New Year! May this year bring you success! 🎊',
        '🎊 Wishing you a fantastic New Year ahead! 🥳',
        '🥳 Cheers to new beginnings and fresh starts! 🎉',
        '🎆 May the New Year bring you joy and prosperity! ✨',
        '✨ Here\'s to an amazing year ahead! 🎉'
    ],
    'Eid al-Fitr': [
        '🌙 Eid Mubarak! May Allah bless you with happiness! ⭐',
        '⭐ Wishing you a blessed and joyous Eid! 🌙',
        '🌙 May this Eid bring peace and prosperity! 🕌',
        '🕌 Eid Mubarak! Have a wonderful celebration! 🌙',
        '⭐ Sending you warm Eid wishes! 🌙'
    ],
    'default': [
        '🎉 Happy {festival}! Wishing you joy and happiness! ✨',
        '✨ Celebrating {festival} with you! Have a great day! 🎊',
        '🎊 May {festival} bring you lots of blessings! 🙏',
        '🌟 Wishing you a wonderful {festival} celebration! 🎉',
        '🎉 Have an amazing {festival}! Enjoy the festivities! ✨'
    ]
};

// Birthday messages with emojis
export const BIRTHDAY_MESSAGES = [
    '🎂 Happy Birthday {name}! May all your dreams come true! 🎉',
    '🎉 Wishing you the happiest birthday ever, {name}! 🎂',
    '🎈 Happy Birthday {name}! Have an amazing day ahead! 🎁',
    '🎁 It\'s your special day, {name}! Enjoy every moment! 🎂',
    '🎂 Happy Birthday {name}! May this year be your best yet! ✨',
    '✨ Sending birthday wishes your way, {name}! 🎉',
    '🎉 Another year older, another year wiser! Happy Birthday {name}! 🎂',
    '🎂 Make a wish and blow out the candles, {name}! 🎈',
    '🎈 Celebrating you today, {name}! Happy Birthday! 🎁',
    '🎁 Hope your birthday is as special as you are, {name}! 🎂'
];

// General counseling and motivational messages
export const GENERAL_MESSAGES = [
    { title: '💡 Pro Tip', body: 'Keep your documents ready for the admission cycle! 📄' },
    { title: '🎯 Goal Setter', body: 'Have you checked the latest cutoffs for your dream college? 🏫' },
    { title: '🤖 Eta at your Service', body: 'Need help and counseling? Ask Eta anything about colleges! 💬' },
    { title: '📅 Stay Updated', body: 'Check out the "Browse" section for the latest institution updates! 🔔' },
    { title: '🚀 Future Ready', body: 'Every step you take today brings you closer to your dream career! ✨' },
    { title: '🎓 Counselor\'s Advice', body: 'Don\'t panic about cutoffs. Variety in choice is the key to admission! 🔑' },
    { title: '🏫 College Search', body: 'Pune, Mumbai or Nagpur? Explore top colleges in your favorite city! 📍' },
    { title: '💪 Keep Going', body: 'The admission process is a marathon, not a sprint. Stay patient! 🧘' },
    { title: '📊 Trend Analysis', body: 'Last year\'s cutoffs are just a guide. Stay positive for this year! 📈' },
    { title: '🌟 Success Mantra', body: 'Start your day by visualizing your first day at your dream college! 🌈' }
];

// Function to get random message
export const getRandomMessage = (messages) => {
    return messages[Math.floor(Math.random() * messages.length)];
};

// Function to get festival message
export const getFestivalMessage = (festivalName) => {
    const messages = FESTIVAL_MESSAGES[festivalName] || FESTIVAL_MESSAGES.default;
    const message = getRandomMessage(messages);
    return message.replace('{festival}', festivalName);
};

// Function to get birthday message
export const getBirthdayMessage = (userName) => {
    const message = getRandomMessage(BIRTHDAY_MESSAGES);
    return message.replace('{name}', userName);
};

// Notification times (hours in 24-hour format)
export const NOTIFICATION_TIMES = [8, 10, 12, 14, 16, 18, 20]; // Expanded for more random variety
