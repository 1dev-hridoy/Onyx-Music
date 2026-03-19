const express = require('express');
const router = express.Router();
const { searchMusic, downloadMusic, streamMusic } = require('../controllers/musicController');
const { getLibrary, addToLibrary, removeFromLibrary } = require('../controllers/libraryController');
const { getFeatured, getBands } = require('../controllers/featuredController');
const { getBackgroundVideos } = require('../controllers/assetsController');
const { getChannels, addChannel, removeChannel, updateChannel } = require('../controllers/channelsController');


router.get('/search', searchMusic);
router.get('/download', downloadMusic);
router.get('/stream/:fileId', streamMusic);

router.get('/featured', getFeatured);
router.get('/bands', getBands);
router.get('/background-videos', getBackgroundVideos);

router.get('/channels', getChannels);
router.post('/channels', addChannel);
router.delete('/channels/:name', removeChannel);
router.put('/channels/:oldName', updateChannel);


router.get('/library', getLibrary);
router.post('/library', addToLibrary);
router.delete('/library/:id', removeFromLibrary);

module.exports = router;
