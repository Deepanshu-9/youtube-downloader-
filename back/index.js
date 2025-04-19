// working backedn code with incorrect url handeling 

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 5000;

// Middlewares
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());
app.use(express.static('downloads'));

// Ensure 'downloads' directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

// Supported domains
const supportedSites = [
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'twitter.com',
  'x.com',
];

// --- Helper: Check if supported platform ---
function isSupportedURL(url) {
  try {
    const parsed = new URL(url);
    return supportedSites.some((site) => parsed.hostname.includes(site));
  } catch {
    return false;
  }
}

// --- Helper: Sanitize YouTube URL ---
function sanitizeURL(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

// for testing 
app.get('/test', (req, res) => {
  res.send('Hello from server');
});



// --- Fetch Video Info ---
app.post('/info', (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).send('URL required');

  url = sanitizeURL(url);
  if (!isSupportedURL(url)) return res.status(400).send('Unsupported or invalid media URL.');

  exec(`yt-dlp --dump-json --no-playlist "${url}"`, { maxBuffer: 1024 * 5000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp info error:', stderr || error.message);
      return res.status(500).send('Failed to fetch info');
    }

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
      console.error('JSON parse error:', err.message);
      return res.status(500).send('Invalid response from yt-dlp');
    }
  });
});

// --- Download Best Audio as MP3 ---
app.post('/download-audio', (req, res) => {
  let { url, title } = req.body;
  if (!url || !title) return res.status(400).send('URL and title required');

  url = sanitizeURL(url);
  if (!isSupportedURL(url)) return res.status(400).send('Unsupported or invalid media URL.');

  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '');
  const outputPath = path.join(__dirname, 'downloads', `${safeTitle}.mp3`);

  const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp audio error:', stderr || error.message);
      return res.status(500).send('Download failed');
    }

    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        res.download(outputPath, `${safeTitle}.mp3`, () => {
          fs.unlink(outputPath, () => {});
        });
      } else {
        res.status(500).send('File not found after download');
      }
    }, 2000);
  });
});

// --- Download Video by Format ID or Best ---
app.post('/download-video', (req, res) => {
  let { url, format_id, title } = req.body;
  if (!url || !title) return res.status(400).send('URL and title required');

  url = sanitizeURL(url);
  if (!isSupportedURL(url)) return res.status(400).send('Unsupported or invalid media URL.');

  const safeTitle = title.replace(/[<>:"/\\|?*]+/g, '');
  const outputPath = path.join(__dirname, 'downloads', `${safeTitle}.mp4`);

  const command = format_id
    ? `yt-dlp -f "${format_id}+140" --merge-output-format mp4 -o "${outputPath}" "${url}"`
    : `yt-dlp -o "${outputPath}" "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('yt-dlp video error:', stderr || error.message);
      return res.status(500).send('Download failed');
    }

    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        res.download(outputPath, `${safeTitle}.mp4`, () => {
          fs.unlink(outputPath, () => {});
        });
      } else {
        res.status(500).send('File not found after download');
      }
    }, 2000);
  });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});