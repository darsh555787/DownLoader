import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'downloads.json');

// Mock in-memory database
let downloads = [];

// Load from file if exists
if (fs.existsSync(DB_PATH)) {
  try {
    downloads = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.warn('Could not load database file, starting fresh');
  }
}

const saveDatabase = () => {
  fs.writeFileSync(DB_PATH, JSON.stringify(downloads, null, 2));
};

export const initializeDatabase = async () => {
  console.log('Database initialized (in-memory with JSON persistence)');
  
  return {
    // Mock database object with methods that match sqlite3 API
    run: (sql, params, callback) => {
      // Mock implementation for insert/update/delete
      if (sql.includes('INSERT INTO downloads')) {
        // params: [id, url, format, quality]
        const [id, url, format, quality] = params;
        const now = new Date().toISOString();
        const download = {
          id, url, format, quality,
          title: null,
          status: 'pending',
          progress: 0,
          file_path: null,
          error_message: null,
          created_at: now,
          updated_at: now,
        };
        downloads.push(download);
        saveDatabase();
        if (callback) callback.call({ lastID: id, changes: 1 });
      } else if (sql.includes('UPDATE downloads SET title = ? WHERE id = ?')) {
        const [title, id] = params;
        const d = downloads.find(d => d.id === id);
        if (d) { d.title = title; d.updated_at = new Date().toISOString(); }
        saveDatabase();
        if (callback) callback.call({ changes: d ? 1 : 0 });
      } else if (sql.includes('UPDATE downloads SET status = ? WHERE id = ?')) {
        const [status, id] = params;
        const d = downloads.find(d => d.id === id);
        if (d) { d.status = status; d.updated_at = new Date().toISOString(); }
        saveDatabase();
        if (callback) callback.call({ changes: d ? 1 : 0 });
      } else if (sql.includes('UPDATE downloads SET status = ?, file_path = ?, progress = ? WHERE id = ?')) {
        const [status, file_path, progress, id] = params;
        const d = downloads.find(d => d.id === id);
        if (d) { d.status = status; d.file_path = file_path; d.progress = progress; d.updated_at = new Date().toISOString(); }
        saveDatabase();
        if (callback) callback.call({ changes: d ? 1 : 0 });
      } else if (sql.includes('UPDATE downloads SET status = ?, error_message = ? WHERE id = ?')) {
        const [status, error_message, id] = params;
        const d = downloads.find(d => d.id === id);
        if (d) { d.status = status; d.error_message = error_message; d.updated_at = new Date().toISOString(); }
        saveDatabase();
        if (callback) callback.call({ changes: d ? 1 : 0 });
      } else if (sql.includes('UPDATE downloads SET progress = ? WHERE id = ?')) {
        const [progress, id] = params;
        const d = downloads.find(d => d.id === id);
        if (d) { d.progress = progress; d.updated_at = new Date().toISOString(); }
        saveDatabase();
        if (callback) callback.call({ changes: d ? 1 : 0 });
      } else if (sql.includes('UPDATE downloads')) {
        saveDatabase();
        if (callback) callback.call({ changes: 1 });
      } else if (sql.includes('DELETE FROM downloads WHERE id = ?')) {
        const [id] = params;
        const before = downloads.length;
        downloads = downloads.filter(d => d.id !== id);
        saveDatabase();
        if (callback) callback.call({ changes: before - downloads.length });
      } else if (sql.includes('DELETE FROM downloads')) {
        if (callback) callback.call({ changes: 1 });
      } else {
        if (callback) callback.call({ changes: 0 });
      }
    },
    get: (sql, params, callback) => {
      if (sql.includes('SELECT') && sql.includes('WHERE') && params && params.length > 0) {
        const result = downloads.find(d => d.id === params[0]);
        callback(null, result || null);
      } else if (sql.includes("status = 'pending'")) {
        // Queue processor query - find oldest pending
        const result = downloads
          .filter(d => d.status === 'pending')
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;
        callback(null, result);
      } else {
        callback(null, null);
      }
    },
    all: (sql, params, callback) => {
      if (sql.includes('SELECT')) {
        let result = [...downloads];
        // Handle WHERE status = '...' filtering
        const statusMatch = sql.match(/WHERE status = '(\w+)'/);
        if (statusMatch) {
          result = result.filter(d => d.status === statusMatch[1]);
        }
        const sorted = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        callback(null, sorted);
      } else {
        callback(null, []);
      }
    },
    exec: (sql, callback) => {
      console.log('Database schema initialized');
      if (callback) callback(null);
    },
    close: (callback) => {
      saveDatabase();
      if (callback) callback(null);
    }
  };
};

// Promisified database operations
export const dbRun = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (db, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};
