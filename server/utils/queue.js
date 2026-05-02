import { dbRun, dbGet, dbAll } from '../database/db.js';
import { downloadVideo, getAvailableFormats } from './downloader.js';

const MAX_CONCURRENT_DOWNLOADS = 2;

export class DownloadQueue {
  constructor(db, downloadRouter) {
    this.db = db;
    this.downloadRouter = downloadRouter;
    this.currentDownloads = 0;
  }
  
  async start() {
    // Reset any stuck 'downloading' entries from a previous crashed session back to 'pending'
    const stuckDownloads = await dbAll(this.db, "SELECT * FROM downloads WHERE status = 'downloading'");
    for (const d of stuckDownloads) {
      await dbRun(this.db, 'UPDATE downloads SET status = ? WHERE id = ?', ['pending', d.id]);
      console.log(`Reset stuck download ${d.id} back to pending`);
    }

    console.log('Download queue started');
    // Process queue every 2 seconds
    setInterval(() => this.processQueue(), 2000);
  }
  
  async processQueue() {
    if (this.currentDownloads >= MAX_CONCURRENT_DOWNLOADS) {
      return;
    }
    
    try {
      // Get next pending download
      const download = await dbGet(
        this.db,
        `SELECT * FROM downloads WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`
      );
      
      if (!download) {
        return;
      }
      
      // Start downloading
      await this.processDownload(download);
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }
  
  async processDownload(download) {
    const { id, url, format, quality } = download;
    
    try {
      this.currentDownloads++;
      
      // Update status to downloading
      await dbRun(
        this.db,
        'UPDATE downloads SET status = ? WHERE id = ?',
        ['downloading', id]
      );

      // Fetch title in background (non-blocking)
      getAvailableFormats(url).then(async (info) => {
        if (info.title) {
          await dbRun(this.db, 'UPDATE downloads SET title = ? WHERE id = ?', [info.title, id]).catch(() => {});
          this.downloadRouter.broadcastUpdate('status_change', { id, title: info.title, status: 'downloading' });
        }
      }).catch(() => {});
      
      this.downloadRouter.broadcastUpdate('status_change', {
        id,
        status: 'downloading',
        progress: 0
      });
      
      // Download with progress callback (quality label passed directly)
      const result = await downloadVideo(url, quality, format, (progress) => {
        // Update progress in database
        dbRun(this.db, 'UPDATE downloads SET progress = ? WHERE id = ?', [progress, id]).catch(err => console.error('Progress update error:', err));
        
        // Broadcast progress
        this.downloadRouter.updateProgress(id, progress);
      });
      
      // Update success status
      const filename = result.filename;
      await dbRun(
        this.db,
        'UPDATE downloads SET status = ?, file_path = ?, progress = ? WHERE id = ?',
        ['completed', filename, 100, id]
      );
      
      this.downloadRouter.broadcastUpdate('status_change', {
        id,
        status: 'completed',
        progress: 100,
        file_path: filename
      });
      
    } catch (error) {
      console.error(`Download error for ${id}:`, error);
      
      // Update error status
      await dbRun(
        this.db,
        'UPDATE downloads SET status = ?, error_message = ? WHERE id = ?',
        ['failed', error.message, id]
      );
      
      this.downloadRouter.broadcastUpdate('status_change', {
        id,
        status: 'failed',
        error_message: error.message
      });
      
    } finally {
      this.currentDownloads--;
    }
  }
}
