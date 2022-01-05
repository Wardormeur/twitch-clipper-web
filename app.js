const express = require('express');
const axios = require('axios')
const fs = require('fs')
const { pipeline } = require('stream')
const { get } = require('https')
const app = express();

app.use((_, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static('public'));

app.use("/scripts/ffmpeg", express.static('node_modules/@ffmpeg'));
app.use("/scripts/axios", express.static('node_modules/axios'));

app.get('/proxy/:clipId.mp4', async function(req, res) {
    const { clipId } = req.params;
    get(`https://clips-media-assets2.twitch.tv/${clipId}.mp4`, (response) => {
        pipeline(response, res, (err) => {
            if (err) {
              console.error('Pipeline failed.', err);
            } else {
              console.log('Pipeline succeeded.');
            }
          });
        response.on('close', () => res.end())
    });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});