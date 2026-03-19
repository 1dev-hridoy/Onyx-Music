const yts = require('yt-search');
const path = require('path');
const fs = require('fs-extra');

const DB_PATH = path.join(__dirname, '../assets/music.db.json');
const CHANNELS_DB = path.join(__dirname, '../assets/channels.db.json');



const getFeatured = async (req, res) => {
    try {
        const musicDb = await fs.readJson(DB_PATH);
        const channels = await fs.readJson(CHANNELS_DB).catch(() => []);




        const shuffled = [...musicDb].sort(() => 0.5 - Math.random());
        const picks = shuffled.slice(0, 3);

        const trendingPromises = picks.map(band => {
            const song = band.songs[Math.floor(Math.random() * band.songs.length)];
            return yts(`${band.band} ${song}`).then(r => r.videos.slice(0, 6).map(v => ({
                id: v.videoId,
                url: v.url,
                title: v.title,
                duration: v.timestamp,
                thumbnail: v.thumbnail,
                author: v.author.name,
                band: band.band,
                genre: band.genre
            })));
        });




        const channelPromises = channels.map(async (channelData) => {
            const channelIdentifier = typeof channelData === 'string' ? channelData : channelData.identifier;
            try {
                let identifier = channelIdentifier;
                if (channelIdentifier.includes('youtube.com/')) {
                    const cleanUrl = channelIdentifier.replace(/\/$/, '');
                    const parts = cleanUrl.split('/');
                    identifier = parts[parts.length - 1];
                }

                const searchResult = await yts(identifier);
                let channelName = identifier;

                if (searchResult.channels && searchResult.channels.length > 0) {
                    channelName = searchResult.channels[0].name;
                }



                const vSearch = await yts(channelName);




                const filtered = vSearch.videos.filter(v => {
                    const author = v.author.name.toLowerCase();
                    const target = channelName.toLowerCase();
                    return author.includes(target) || target.includes(author);
                });




                const randomTen = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);

                return randomTen.map(v => ({
                    id: v.videoId,
                    url: v.url,
                    title: v.title,
                    duration: v.timestamp,
                    thumbnail: v.thumbnail,
                    author: v.author.name,
                    category: 'From Your Channels'
                }));
            } catch (e) { return []; }
        });




        const genres = [...new Set(musicDb.map(b => b.genre.split(' / ')[0]))].slice(0, 4);
        const genrePromises = genres.map(genre => {
            const bandsInGenre = musicDb.filter(b => b.genre.includes(genre));
            const picks = bandsInGenre.sort(() => 0.5 - Math.random()).slice(0, 2);
            return Promise.all(picks.map(band => {
                const song = band.songs[Math.floor(Math.random() * band.songs.length)];
                return yts(`${band.band} ${song}`).then(r => r.videos.slice(0, 1).map(v => ({
                    id: v.videoId,
                    url: v.url,
                    title: v.title,
                    duration: v.timestamp,
                    thumbnail: v.thumbnail,
                    author: v.author.name,
                    genre: band.genre,
                    category: genre
                })));
            }));
        });




        const [trendingDone, channelsDone, genresDone] = await Promise.all([
            Promise.all(trendingPromises),
            Promise.all(channelPromises),
            Promise.all(genrePromises)
        ]);

        const response = {
            "Trending Now": trendingDone.flat(),
        };

        const allChannelVideos = channelsDone.flat();
        if (allChannelVideos.length > 0) {
            const shuffledChannels = allChannelVideos.sort(() => 0.5 - Math.random());
            response["From Your Channels"] = shuffledChannels;
        }

        genresDone.forEach((genreResults, idx) => {
            const genreName = genres[idx];
            response[genreName] = genreResults.flat();
        });

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




const getBands = async (req, res) => {
    try {
        const musicDb = await fs.readJson(DB_PATH);
        res.json(musicDb.map(b => ({ band: b.band, genre: b.genre, songCount: b.songs.length })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getFeatured, getBands };
