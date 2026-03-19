const fs = require('fs-extra');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

const getDB = async () => {
    if (!await fs.exists(DB_FILE)) {
        await fs.writeJson(DB_FILE, { searches: [], downloads: [], library: [] });
    }
    const data = await fs.readJson(DB_FILE);
    if (!data.searches) data.searches = [];
    if (!data.downloads) data.downloads = [];
    if (!data.library) data.library = [];
    return data;
};

const updateDB = async (data) => {
    await fs.writeJson(DB_FILE, data);
};

module.exports = { getDB, updateDB };
