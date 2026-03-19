const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());


app.use('/api', apiRoutes);
app.use('/assets', express.static(path.join(__dirname, 'assets')));




const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));




app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`Modular Server running on port ${PORT}`);
});
