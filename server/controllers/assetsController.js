const fs = require('fs-extra');
const path = require('path');




const getBackgroundVideos = async (req, res) => {
    try {
        const videoDir = path.join(__dirname, '../assets/videos');
        const files = await fs.readdir(videoDir);


        const videos = files
            .filter(file => file.endsWith('.mp4'))
            .map(file => ({
                name: file.replace(/\.mp4$/, '').replace(/-/g, ' '),
                filename: file,
                url: `/assets/videos/${file}`
            }));

        res.json(videos);
    } catch (error) {
        console.error('Error fetching background videos:', error);
        res.status(500).json({ error: 'Failed to fetch background videos' });
    }
};


module.exports = {
    getBackgroundVideos
};
