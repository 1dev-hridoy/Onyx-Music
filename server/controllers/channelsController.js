const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');

const CHANNELS_DB = path.join(__dirname, '../assets/channels.db.json');




const initDb = async () => {
    if (!fs.existsSync(CHANNELS_DB)) {
        await fs.outputJson(CHANNELS_DB, []);
        return [];
    }


    let data = await fs.readJson(CHANNELS_DB);
    if (data.length > 0 && typeof data[0] === 'string') {
        data = data.map(id => ({ name: id.split('/').pop().replace('@', '') || id, identifier: id }));
        await fs.outputJson(CHANNELS_DB, data);
    }
    return data;
};




const getChannels = async (req, res) => {
    try {
        const channels = await initDb();
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




const addChannel = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Channel identifier (URL or Name) is required' });

        const channels = await initDb();
        if (channels.find(c => c.identifier === identifier)) {
            return res.status(400).json({ error: 'Channel already exists' });
        }



        let name = identifier;
        try {
            let searchIdent = identifier;
            if (identifier.includes('youtube.com/')) {
                const cleanUrl = identifier.replace(/\/$/, '');
                const parts = cleanUrl.split('/');
                searchIdent = parts[parts.length - 1];
            }
            const r = await yts(searchIdent);
            if (r.channels && r.channels.length > 0) {
                name = r.channels[0].name;
            }
        } catch (err) { }

        channels.push({ name, identifier });
        await fs.outputJson(CHANNELS_DB, channels);
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};






const removeChannel = async (req, res) => {
    try {
        const { name } = req.params;
        let channels = await initDb();
        channels = channels.filter(c => c.identifier !== name && c.name !== name);
        await fs.outputJson(CHANNELS_DB, channels);
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};






const updateChannel = async (req, res) => {
    try {
        const { oldName } = req.params;
        const { newName } = req.body;
        if (!newName) return res.status(400).json({ error: 'New channel name is required' });

        const channels = await initDb();
        const idx = channels.findIndex(c => c.identifier === oldName || c.name === oldName);
        if (idx === -1) return res.status(404).json({ error: 'Channel not found' });

        channels[idx].name = newName;
        await fs.outputJson(CHANNELS_DB, channels);
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getChannels,
    addChannel,
    removeChannel,
    updateChannel
};
