import { useState } from 'react';
import axios from 'axios';

function App() {
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState(null);
  const [format, setFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [fetchTime, setFetchTime] = useState(0);
  const [intervalId, setIntervalId] = useState(null);

  const getWebsiteNameFromURL = (url) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, '');
      return hostname.split('.')[0]; // e.g., "youtube"
    } catch {
      return '*';
    }
  };

  const headingTitle = () => {
    if (!url) return 'Multi-Platform Downloader';
    const name = getWebsiteNameFromURL(url);
    return `${name.charAt(0).toUpperCase() + name.slice(1)} Downloader`;
  };

  const getInfo = async () => {
    try {
      setLoading(true);
      setFetchTime(0);
      const id = setInterval(() => setFetchTime((prev) => prev + 1), 1000);
      setIntervalId(id);

      const res = await axios.post('http://localhost:5000/info', { url });
      setInfo(res.data);
    } catch (err) {
      alert('Failed to fetch info. Please check the URL.');
    } finally {
      setLoading(false);
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const downloadAudio = () => {
    setDownloadingAudio(true);
    axios
      .post(
        'http://localhost:5000/download-audio',
        { url, title: info?.title || 'audio' },
        { responseType: 'blob' }
      )
      .then(({ data }) => {
        const blob = new Blob([data], { type: 'audio/mp3' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${info?.title || 'audio'}.mp3`;
        link.click();
      })
      .finally(() => setDownloadingAudio(false));
  };

  const downloadVideo = () => {
    setDownloadingVideo(true);
    axios
      .post(
        'http://localhost:5000/download-video',
        {
          url,
          title: info?.title || 'video',
          format_id: info?.formats?.length > 0 ? format : null,
        },
        { responseType: 'blob' }
      )
      .then(({ data }) => {
        const blob = new Blob([data], { type: 'video/mp4' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${info?.title || 'video'}.mp4`;
        link.click();
      })
      .finally(() => setDownloadingVideo(false));
  };

  return (
    <div className="min-h-screen bg-zinc-900 p-6 flex flex-col items-center font-sans">
      <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-center text-zinc-100">
        {headingTitle()}
      </h1>

      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Video URL"
          className="flex-1 w-full px-4 text-white py-2 border border-gray-300 rounded-md shadow-sm bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={getInfo}
          disabled={loading}
          className={`w-full sm:w-auto px-4 py-2 rounded-md shadow text-white ${
            loading ? 'bg-gray-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Fetching...' : 'Fetch Info'}
        </button>
      </div>

      {loading && (
        <div className="text-white mt-6 text-lg font-medium animate-pulse text-center">
          Loading video info...
          <div className="text-sm text-gray-300 mt-2">
            waiting : {fetchTime} second{fetchTime !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {info && (
        <div className="mt-10 w-full max-w-xl bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col items-center mb-4">
            <img
              src={info.thumbnail}
              alt="thumbnail"
              className="w-full sm:w-80 rounded-md object-cover"
            />
            <h2 className="text-xl font-semibold mt-4 text-center">{info.title}</h2>
            <p className="text-gray-600 mt-1">Duration: {(info.duration)} sec</p>
          </div>

          <button
            onClick={downloadAudio}
            disabled={downloadingAudio}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md mb-6"
          >
            {downloadingAudio ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                <span className="ml-2">Downloading Audio...</span>
              </div>
            ) : (
              'Download  Audio (MP3)'
            )}
          </button>

          {info.formats?.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Select Video Format</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select
                  onChange={(e) => setFormat(e.target.value)}
                  value={format}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Format</option>
                  {info.formats.map((f) => (
                    <option key={f.format_id} value={f.format_id}>
                      {(f.format_note || f.resolution || 'Unknown')} -{' '}
                      {f.filesize
                        ? (f.filesize / (1024 * 1024)).toFixed(2) + ' MB'
                        : 'Size Unknown'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={downloadVideo}
                  disabled={!format || downloadingVideo}
                  className={`w-full sm:w-auto py-2 px-4 rounded-md text-white ${
                    format && !downloadingVideo
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {downloadingVideo ? (
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                      <span className="ml-2">Downloading Video...</span>
                    </div>
                  ) : (
                    'Download Video'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={downloadVideo}
              disabled={downloadingVideo}
              className={`mt-4 w-full py-2 px-4 rounded-md text-white ${
                downloadingVideo ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {downloadingVideo ? (
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                  <span className="ml-2">Downloading Video...</span>
                </div>
              ) : (
                'Download  Video'
              )}
            </button>
          )}
        </div>
      )}

      <div className="mt-10 bg-zinc-300 p-6 rounded-lg shadow-2xl w-full max-w-xl">
        <h2 className="text-4xl font-semibold mb-2 text-zinc-900">📝 How to Use:</h2>
        <ul className="list-disc pl-5 space-y-1 ">
          <li>Paste a video URL from YouTube, Instagram, or other platforms.</li>
          <li>Click <strong>Fetch Info</strong> to load video data.</li>
          <li>Select video format (if available) or download audio/video directly.</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
