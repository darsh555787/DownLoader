import axios from 'axios';

// In production (Vercel), point to your Railway backend URL
// Set VITE_API_URL in Vercel environment variables to your Railway domain
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const WS_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  : null;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getAvailableFormats = async (url) => {
  try {
    const response = await api.post('/formats', { url });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch formats');
  }
};

export const addDownload = async (url, format, quality) => {
  try {
    const response = await api.post('/download', { url, format, quality });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to add download');
  }
};

export const getDownloadStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch downloads');
  }
};

export const removeDownload = async (id) => {
  try {
    const response = await api.delete(`/remove/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to remove download');
  }
};

export const connectWebSocket = (onMessage) => {
  let ws = null;
  let closed = false;

  const connect = () => {
    if (closed) return;
    let wsUrl;
    try {
      if (WS_BASE_URL) {
        wsUrl = `${WS_BASE_URL}/ws`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onerror = () => {
        // Silently ignore — onclose will handle reconnect
      };

      ws.onclose = () => {
        if (!closed) {
          setTimeout(connect, 5000);
        }
      };
    } catch (e) {
      console.warn('WebSocket unavailable:', e.message);
    }
  };

  connect();

  return () => {
    closed = true;
    if (ws) ws.close();
  };
};
