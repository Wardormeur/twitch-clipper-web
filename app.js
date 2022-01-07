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
app.use("/scripts/luxon", express.static('node_modules/luxon/build/global'));
app.use("/scripts/script.js", express.static('public/script.js'));
app.use("/tailwind.min.css", express.static('public/tailwind.min.css'));
app.use("/style.css", express.static('public/style.css'));


app.get('/proxy/:clipId.mp4', async function(req, res) {
  const { clipId } = req.params;
  get(`https://clips-media-assets2.twitch.tv/${clipId}.mp4`, (response) => {
    response.pipe(res, { end: false });
    response.on('error', (e) => {
      console.error('Pipeline failed.', err);
      res.end()
    })
    response.on('end', () => {
      res.end();
    });
  });
});

app.get('/proxy/:clipId.jpg', async function(req, res) {
  const { clipId } = req.params
  get(`https://clips-media-assets2.twitch.tv/${clipId}-preview-480x272.jpg`, (response) => {
    res.type('jpg')
    response.pipe(res, { end: false });
    response.on('error', (e) => {
      console.error('Pipeline failed.', err);
      res.end()
    })
    response.on('end', () => {
      res.end();
    });
  });
});



const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});