const axios = require('axios');
const Video = require('../models/Video');

// Helper to extract YouTube ID
const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

exports.addVideo = async (req, res) => {
    try {
        const { youtubeUrl, tags } = req.body;
        const videoId = getYoutubeId(youtubeUrl);
        
        if (!videoId) {
            return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
        }

        // Scrapping logic
        let title = 'YouTube Video';
        let views = '0 views';
        let uploadDate = 'Recently';
        let thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        try {
            const ytResponse = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = ytResponse.data;

            // Extract Title
            const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
            if (titleMatch) title = titleMatch[1];

            // Extract Views - looking for "viewCount":"123456"
            const viewsMatch = html.match(/"viewCount":"(\d+)"/);
            if (viewsMatch) {
                const count = parseInt(viewsMatch[1]);
                if (count > 1000000) views = (count / 1000000).toFixed(1) + 'M views';
                else if (count > 1000) views = (count / 1000).toFixed(1) + 'K views';
                else views = count + ' views';
            }

            // Extract Upload Date
            const dateMatch = html.match(/"uploadDate":"(.*?)"/);
            if (dateMatch) {
                const date = new Date(dateMatch[1]);
                uploadDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

        } catch (scrapError) {
            console.error('YouTube Scraping failed, using defaults:', scrapError.message);
        }

        const video = await Video.create({
            title,
            youtubeUrl,
            thumbnail,
            videoId,
            views,
            uploadDate,
            tags: tags || []
        });

        res.status(201).json({ success: true, data: video });
    } catch (error) {
        console.error('Add video error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getVideos = async (req, res) => {
    try {
        const { tag } = req.query;
        let query = {};
        
        // If tag is provided and not "undefined" or "null" string
        if (tag && tag !== 'undefined' && tag !== 'null' && tag !== '') {
            query.tags = tag;
        }

        const videos = await Video.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: videos });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Video deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
