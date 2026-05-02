import express from 'express';
import cors from 'cors';
import expressWs from 'express-ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './database/db.js';
import { createDownloadRouter } from './routes/downloads.js';
import { DownloadQueue } from './utils/queue.js';
import { cleanupOldDownloads } from './utils/downloader.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins (frontend on Vercel, local dev)
  credentials: true,
}));
app.use(express.json());

// Initialize Express-WS for WebSocket support
const expressWsInstance = expressWs(app);

// Serve downloaded files
const clientDistPath = join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

let db;
let downloadRouter;
let queue;

// Set up express-ws
const wss = expressWsInstance ? expressWsInstance.getWss?.() : null;

const startServer = async () => {
  try {
    // Initialize database
    db = await initializeDatabase();
    console.log('Database initialized');
    
    // Create download router with WebSocket support
    downloadRouter = createDownloadRouter(db, wss);
    
    // Mount routes
    app.use('/api', downloadRouter);
    
    // WebSocket endpoint for real-time updates
    app.ws('/ws', (ws, req) => {
      console.log('Client connected to WebSocket');
      
      ws.on('message', (msg) => {
        console.log('WebSocket message:', msg);
      });
      
      ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    // Initialize and start download queue
    queue = new DownloadQueue(db, downloadRouter);
    await queue.start();
    
    // Cleanup old downloads every 6 hours
    setInterval(() => cleanupOldDownloads(), 6 * 60 * 60 * 1000);
    
    // Serve React app for all other routes
    app.get('*', (req, res) => {
      res.sendFile(join(clientDistPath, 'index.html'));
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Darsh Downloader server running on http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  if (db) {
    db.close(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
