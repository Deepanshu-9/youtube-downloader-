const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());
app.use(express.static('downloads'));

// Get video info
app.post('/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('URL required');

  exec(`yt-dlp --dump-json "${url}"`, (error, stdout) => {
    if (error) return res.status(500).send('Failed to fetch info');

    try {
      const info = JSON.parse(stdout);
      const formats = info.formats?.map(f => ({
        format_id: f.format_id,
        format_note: f.format_note,
        ext: f.ext,
        resolution: f.resolution || `${f.width || ''}x${f.height || ''}`,
        filesize: f.filesize,
        url: f.url
      })).filter(f => f.filesize && f.ext === 'mp4') || [];

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats
      });
    } catch (err) {
      return res.status(500).send('Invalid response from yt-dlp');
    }
  });
});

// Download best audio as MP3
app.post('/download-audio', (req, res) => {
  const { url, title } = req.body;
  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '');
  const outputPath = path.join(__dirname, 'downloads', `${safeTitle}.mp3`);

  const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`;
  exec(command, (error) => {
    if (error) return res.status(500).send('Download failed');
    res.download(outputPath, `${safeTitle}.mp3`, () => {
      fs.unlink(outputPath, () => {});
    });
  });
});

// Download video (format_id optional for non-YouTube platforms)
app.post('/download-video', (req, res) => {
  const { url, format_id, title } = req.body;
  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '');
  const outputPath = path.join(__dirname, 'downloads', `${safeTitle}.mp4`);

  const command = format_id
    ? `yt-dlp -f ${format_id} -o "${outputPath}" "${url}"`
    : `yt-dlp -o "${outputPath}" "${url}"`; // No format for Instagram, etc.

  exec(command, (error) => {
    if (error) return res.status(500).send('Download failed');
    res.download(outputPath, `${safeTitle}.mp4`, () => {
      fs.unlink(outputPath, () => {});
    });
  });
});

app.listen(port, () => console.log(`✅ Server running at http://localhost:${port}`));
