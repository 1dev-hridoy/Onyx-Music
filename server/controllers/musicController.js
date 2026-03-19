const yts = require('yt-search');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const { getDB, updateDB } = require('../utils/db');
const YouTubeDownloader = require('../services/audioService');

const TEMP_DIR = path.join(__dirname, '../../temp');
const downloader = new YouTubeDownloader();
const fileAccessMap = new Map();



const CLEANUP_INTERVAL = 60 * 1000;
const MAX_AGE = 5 * 60 * 1000;



setInterval(async () => {
    const now = Date.now();
    try {
        if (!await fs.exists(TEMP_DIR)) return;
        const files = await fs.readdir(TEMP_DIR);
        for (const file of files) {
            const filePath = path.join(TEMP_DIR, file);
            const lastAccessed = fileAccessMap.get(file) || (await fs.stat(filePath)).atimeMs;
            if (now - lastAccessed > MAX_AGE) {
                console.log(`Cleaning up file: ${file}`);
                await fs.remove(filePath);
                fileAccessMap.delete(file);
            }
        }
    } catch (e) { }
}, CLEANUP_INTERVAL);






const searchMusic = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const r = await yts(query);
        const videos = r.videos.slice(0, 10).map(v => ({
            id: v.videoId,
            url: v.url,
            title: v.title,
            description: v.description,
            duration: v.timestamp,
            thumbnail: v.thumbnail,
            author: v.author.name
        }));

        const db = await getDB();
        db.searches.push({ query, timestamp: new Date().toISOString() });
        await updateDB(db);

        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};






const downloadMusic = async (req, res) => {
    try {
        const videoId = req.query.id;
        if (!videoId) return res.status(400).json({ error: 'Video ID is required' });

        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const result = await downloader.convert(youtubeUrl, { format: 'mp3', audioBitrate: '320' });

        if (!result.success) {
            return res.status(500).json({ error: 'Conversion failed', details: result.error });
        }

        const fileName = `${videoId}.mp3`;
        const filePath = path.join(TEMP_DIR, fileName);
        await fs.ensureDir(TEMP_DIR);

        const response = await axios({
            method: 'GET',
            url: result.downloadUrl,
            responseType: 'stream',
            timeout: 30000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                fs.remove(filePath).catch(() => { });
                reject(err);
            });
            response.data.on('error', (err) => {
                writer.destroy();
                fs.remove(filePath).catch(() => { });
                reject(err);
            });
        });

        console.log(`File downloaded successfully: ${fileName}`);
        fileAccessMap.set(fileName, Date.now());

        const db = await getDB();
        db.downloads.push({ videoId, fileName, timestamp: new Date().toISOString() });
        await updateDB(db);

        res.json({
            success: true,
            fileId: videoId,
            title: result.filename,
            playbackUrl: `/api/stream/${videoId}`
        });
    } catch (error) {
        console.error('Download API Error:', error);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || 'No additional details'
        });
    }
};





const streamMusic = async (req, res) => {
    const fileId = req.params.fileId;
    const fileName = `${fileId}.mp3`;
    const filePath = path.join(TEMP_DIR, fileName);

    console.log(`Streaming request for: ${fileId}`);
    if (await fs.exists(filePath)) {
        console.log(`File found: ${filePath}`);
        fileAccessMap.set(fileName, Date.now());
        res.sendFile(filePath);
    } else {
        console.log(`File not found: ${filePath}`);
        res.status(404).json({ error: 'File not found or expired' });
    }
};

module.exports = { searchMusic, downloadMusic, streamMusic };
