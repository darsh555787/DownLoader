import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, opts);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => (stdout += d.toString()));
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => {
      // yt-dlp exits 1 on warnings — treat as success if stdout has content
      if (code !== 0 && !stdout.trim()) reject(new Error(stderr.slice(-500)));
      else resolve({ stdout, stderr });
    });
    proc.on('error', reject);
  });

const DOWNLOADS_DIR = join(dirname(__dirname), 'downloads');

// Ensure downloads directory exists
try {
  await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
} catch (err) {
  console.error('Failed to create downloads directory:', err);
}

// Detect platform from URL
export const detectPlatform = (url) => {
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'other';
};

// Quality label -> yt-dlp format selector
const QUALITY_FORMAT_MAP = {
  '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best',
  '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best',
  '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best',
  '720p':  'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best',
  '480p':  'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best',
  '360p':  'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best',
  '240p':  'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=240]+bestaudio/best',
  'best':  'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
  'best audio': 'bestaudio/best',
};

// Get available formats for a URL
export const getAvailableFormats = async (url) => {
  try {
    const { stdout } = await execAsync('yt-dlp', [
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      url,
    ], { timeout: 30000 });

    // stdout may have warning lines before the JSON — find the JSON object
    const jsonStart = stdout.indexOf('{');
    if (jsonStart === -1) throw new Error('No JSON in yt-dlp output');
    const data = JSON.parse(stdout.slice(jsonStart));
    const platform = detectPlatform(url);

    const heightsSeen = new Set();
    const qualities = [];

    if (data.formats) {
      for (const fmt of data.formats) {
        if (fmt.height && fmt.vcodec && fmt.vcodec !== 'none') {
          if (!heightsSeen.has(fmt.height)) {
            heightsSeen.add(fmt.height);
            qualities.push({ label: `${fmt.height}p`, height: fmt.height });
          }
        }
      }
    }

    qualities.sort((a, b) => b.height - a.height);
    const formatLabels = qualities.length > 0 ? qualities.map(q => q.label) : ['best'];
    if (!formatLabels.includes('best')) formatLabels.push('best');
    formatLabels.push('best audio');

    return {
      title: data.title || data.description?.slice(0, 60) || 'Video',
      duration: data.duration,
      platform,
      formats: formatLabels,
      formatIds: Object.fromEntries(formatLabels.map(l => [l, l])),
    };
  } catch (error) {
    throw new Error(`Failed to fetch formats: ${error.message}`);
  }
};

// Resolve a quality label to a yt-dlp format selector
const resolveFormatSelector = (quality, format, url = '') => {
  if (format === 'mp3') return 'bestaudio/best';

  const isInstagram = detectPlatform(url) === 'instagram';
  if (isInstagram) {
    if (quality === 'best audio') return 'bestaudio/best';
    if (quality === 'best') return 'best';
    const height = parseInt(quality);
    if (!isNaN(height)) return `best[height<=${height}]/bestvideo[height<=${height}]+bestaudio/best`;
    return 'best';
  }

  return QUALITY_FORMAT_MAP[quality] || QUALITY_FORMAT_MAP['best'];
};

// Download video/audio
export const downloadVideo = async (url, quality, format, onProgress) => {
  const timestamp = Date.now();
  const outputTemplate = join(DOWNLOADS_DIR, `video_${timestamp}.%(ext)s`);
  const formatSelector = resolveFormatSelector(quality, format, url);

  const args = [
    '--no-warnings',
    '--newline',
    '--no-playlist',
    '-f', formatSelector,
    '-o', outputTemplate,
  ];

  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else if (detectPlatform(url) !== 'instagram') {
    args.push('--merge-output-format', 'mp4');
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stderr = '';
    let lastProgress = 0;

    const parseProgress = (text) => {
      // Match patterns like "  5.3%" or "[download]  5.3% of"
      const match = text.match(/(\d+\.?\d*)%/);
      if (match) {
        const p = Math.min(99, parseFloat(match[1]));
        if (p > lastProgress) {
          lastProgress = p;
          onProgress?.(Math.round(p));
        }
      }
    };

    // yt-dlp with --newline sends progress to stdout
    proc.stdout.on('data', (chunk) => parseProgress(chunk.toString()));

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      parseProgress(text);
    });

    proc.on('close', async (code) => {
      // yt-dlp exits 1 on non-fatal warnings — check if file was actually created
      try {
        const files = await fs.readdir(DOWNLOADS_DIR);
        const matched = files
          .filter(f => f.startsWith(`video_${timestamp}`))
          .sort()
          .pop();

        if (matched) {
          return resolve({ path: join(DOWNLOADS_DIR, matched), filename: matched });
        }
      } catch (_) {}

      // No file found — real failure
      reject(new Error(`yt-dlp failed (code ${code}): ${stderr.slice(-400)}`));
    });

    proc.on('error', (err) => reject(new Error(`Failed to spawn yt-dlp: ${err.message}`)));
  });
};

// Clean up old downloads (older than 24 hours)
export const cleanupOldDownloads = async () => {
  try {
    const files = await fs.readdir(DOWNLOADS_DIR);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = join(DOWNLOADS_DIR, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > oneDayMs) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

export const DOWNLOADS_DIR_PATH = DOWNLOADS_DIR;
