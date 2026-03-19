const { getDB, updateDB } = require('../utils/db');

const getLibrary = async (req, res) => {
    try {
        const db = await getDB();
        res.json(db.library || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const addToLibrary = async (req, res) => {
    try {
        const track = req.body;
        if (!track || !track.id) return res.status(400).json({ error: 'Track data with ID required' });

        const db = await getDB();
        if (!db.library) db.library = [];



        const exists = db.library.find(t => t.id === track.id);
        if (!exists) {
            db.library.push({ ...track, addedAt: new Date().toISOString() });
            await updateDB(db);
        }
        res.json({ success: true, library: db.library });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const removeFromLibrary = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDB();
        if (!db.library) db.library = [];

        db.library = db.library.filter(t => t.id !== id);
        await updateDB(db);

        res.json({ success: true, library: db.library });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



module.exports = { getLibrary, addToLibrary, removeFromLibrary };
