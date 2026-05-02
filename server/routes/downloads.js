import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { dbRun, dbGet, dbAll } from '../database/db.js';
import { getAvailableFormats, downloadVideo, DOWNLOADS_DIR_PATH } from '../utils/downloader.js';

export const createDownloadRouter = (db, wss) => {
  const router = express.Router();
  
  // Store active downloads for progress tracking
  const activeDownloads = new Map();
  
  // Get available formats for a URL
  router.post('/formats', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      const formats = await getAvailableFormats(url);
      res.json(formats);
    } catch (error) {
      console.error('Format fetch error:', error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // Add a new download
  router.post('/download', async (req, res) => {
    try {
      const { url, format, quality } = req.body;
      
      if (!url || !format || !quality) {
        return res.status(400).json({ error: 'URL, format, and quality are required' });
      }
      
      const id = uuidv4();
      
      // Insert download record
      await dbRun(
        db,
        `INSERT INTO downloads (id, url, format, quality, status) VALUES (?, ?, ?, ?, 'pending')`,
        [id, url, format, quality]
      );
      
      const download = await dbGet(db, 'SELECT * FROM downloads WHERE id = ?', [id]);
      
      // Broadcast to all connected WebSocket clients
      broadcastUpdate('download_added', download);
      
      // Add to queue
      activeDownloads.set(id, { status: 'queued', progress: 0 });
      
      res.json(download);
    } catch (error) {
      console.error('Download creation error:', error);
      res.status(500).json({ error: 'Failed to create download' });
    }
  });
  
  // Get all downloads
  router.get('/status', async (req, res) => {
    try {
      const downloads = await dbAll(db, 'SELECT * FROM downloads ORDER BY created_at DESC');
      res.json(downloads);
    } catch (error) {
      console.error('Status fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch downloads' });
    }
  });
  
  // Get single download status
  router.get('/status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const download = await dbGet(db, 'SELECT * FROM downloads WHERE id = ?', [id]);
      
      if (!download) {
        return res.status(404).json({ error: 'Download not found' });
      }
      
      res.json(download);
    } catch (error) {
      console.error('Status fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch download status' });
    }
  });
  
  // Serve a completed download file
  router.get('/file/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const download = await dbGet(db, 'SELECT * FROM downloads WHERE id = ?', [id]);

      if (!download || download.status !== 'completed' || !download.file_path) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = join(DOWNLOADS_DIR_PATH, download.file_path);

      if (!fs.existsSync(filePath)) {
        return res.status(410).json({ error: 'File has been deleted' });
      }

      const filename = download.title
        ? `${download.title.replace(/[^\w\s.-]/g, '').trim()}.${download.format}`
        : download.file_path;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('File serve error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // Remove a download (permanently delete)
  router.delete('/remove/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Cancel if actively downloading
      if (activeDownloads.has(id)) {
        activeDownloads.delete(id);
      }

      // Permanently delete from database
      await dbRun(db, 'DELETE FROM downloads WHERE id = ?', [id]);

      broadcastUpdate('download_removed', { id });

      res.json({ success: true });
    } catch (error) {
      console.error('Remove error:', error);
      res.status(500).json({ error: 'Failed to remove download' });
    }
  });
  
  // WebSocket broadcast function
  const broadcastUpdate = (type, data) => {
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({ type, data }));
        }
      });
    }
  };
  
  // Expose function for queue processor to update progress
  router.updateProgress = (downloadId, progress) => {
    broadcastUpdate('progress_update', { id: downloadId, progress });
  };
  
  router.broadcastUpdate = broadcastUpdate;
  router.activeDownloads = activeDownloads;
  
  return router;
};
