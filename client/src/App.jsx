import React, { useState, useEffect, useCallback } from 'react';
import { WelcomeModal } from './components/WelcomeModal.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { DownloadItem } from './components/DownloadItem';
import {
  getAvailableFormats,
  addDownload,
  getDownloadStatus,
  removeDownload,
  connectWebSocket,
} from './utils/api.js';

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

const IconDownloadCloud = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>
);

const IconSparkle = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
      0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54
      1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
      1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

const IconSun = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const IconMoon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const IconInstall = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AppLogo = () => (
  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  </div>
);

// ── Main App ───────────────────────────────────────────────────────────────
function App() {
  const [dark, setDark] = useState(() => {
    // Check localStorage, fallback to system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [urls, setUrls] = useState(['']);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [downloads, setDownloads] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);

  // Apply / remove dark class on <html> — runs synchronously on state change
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      // Apply immediately (don't wait for useEffect re-render)
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  useEffect(() => {
    const unsubscribe = connectWebSocket((message) => {
      const { type, data } = message;
      if (type === 'progress_update') {
        setDownloads((prev) => prev.map((d) => d.id === data.id ? { ...d, progress: data.progress } : d));
      } else if (type === 'status_change') {
        setDownloads((prev) => prev.map((d) => d.id === data.id ? { ...d, ...data } : d));
      } else if (type === 'download_added') {
        setDownloads((prev) => [data, ...prev]);
      } else if (type === 'download_removed') {
        setDownloads((prev) => prev.filter((d) => d.id !== data.id));
      }
    });
    loadDownloads();
    return unsubscribe;
  }, []);

  const loadDownloads = async () => {
    try {
      const data = await getDownloadStatus();
      setDownloads(data);
    } catch (error) {
      // Don't show toast on initial load if backend is simply unreachable
      console.warn('Could not load downloads:', error.message);
    }
  };

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAddUrl = () => setUrls([...urls, '']);

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleRemoveUrl = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length === 0 ? [''] : newUrls);
  };

  const handleFetchFormats = async () => {
    const firstUrl = urls.find((u) => u.trim());
    if (!firstUrl) { showToast('Please enter at least one URL', 'error'); return; }
    setLoadingFormats(true);
    try {
      const data = await getAvailableFormats(firstUrl);
      setAvailableQualities(data.formats || []);
      if (data.formats?.length) setQuality(data.formats[0]);
      showToast('Formats loaded!', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoadingFormats(false);
    }
  };

  const handleDownload = async () => {
    const validUrls = urls.filter((u) => u.trim());
    if (validUrls.length === 0) { showToast('Please enter at least one URL', 'error'); return; }
    setLoading(true);
    try {
      for (const url of validUrls) {
        await addDownload(url, format, quality);
      }
      setUrls(['']);
      setAvailableQualities([]);
      showToast(`Added ${validUrls.length} download${validUrls.length > 1 ? 's' : ''} to queue`, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDownload = async (id) => {
    try {
      await removeDownload(id);
      showToast('Removed from queue', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const activeCount = downloads.filter(d => d.status === 'downloading').length;

  return (
    <div className="min-h-screen transition-colors duration-300
      bg-gradient-to-br from-blue-50 via-purple-50 to-fuchsia-50
      dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">

      <WelcomeModal onClose={() => {}} />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md
        bg-white/80 border-b border-slate-200/60 shadow-sm
        dark:bg-slate-900/80 dark:border-slate-700/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo />
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Darsh Downloader</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">YouTube & Instagram</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            {downloads.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                {activeCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
                    <div className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }}></div>
                    {activeCount} active
                  </div>
                )}
                {completedCount > 0 && (
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {completedCount} done
                  </div>
                )}
              </div>
            )}

            {/* Install PWA button */}
            {installPrompt && !installed && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all
                  border-blue-200 text-blue-600 hover:bg-blue-50
                  dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                aria-label="Install app"
              >
                <IconInstall />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-xl border transition-all
                border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100
                dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              aria-label="Toggle dark mode"
            >
              {dark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Input Card */}
        <div className="rounded-2xl shadow-sm border overflow-hidden mb-6
          bg-white border-slate-200/80
          dark:bg-slate-900 dark:border-slate-700/80">

          {/* Card Header */}
          <div className="px-6 pt-5 pb-4 border-b
            border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50
            dark:border-slate-700/60 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <IconDownloadCloud />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">New Download</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Paste a YouTube or Instagram URL below</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* URL Inputs */}
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2
                text-slate-700 dark:text-slate-300">
                Video URL
              </label>
              <div className="space-y-2">
                {urls.map((url, index) => (
                  <div key={index} className="flex gap-2 fade-in">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="https://youtube.com/watch?v=... or instagram.com/reel/..."
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl transition-all
                          border border-slate-200 bg-slate-50 placeholder-slate-400 text-slate-800
                          focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                          dark:border-slate-600 dark:bg-slate-800 dark:placeholder-slate-500 dark:text-slate-100
                          dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                      />
                    </div>
                    {urls.length > 1 && (
                      <button
                        onClick={() => handleRemoveUrl(index)}
                        className="px-3 py-2 rounded-xl transition-all border
                          text-slate-400 hover:text-red-500 hover:bg-red-50 border-slate-200
                          dark:border-slate-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddUrl}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold py-1 px-2 rounded-lg transition-all
                  text-blue-600 hover:text-blue-700 hover:bg-blue-50
                  dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
              >
                <IconPlus />
                Add another URL
              </button>
            </div>

            {/* Format + Quality Row */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2
                  text-slate-700 dark:text-slate-300">
                  Format
                </label>
                <div className="flex gap-2">
                  {['mp4', 'mp3'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                        format === f
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:text-blue-400'
                      }`}
                    >
                      {f === 'mp4' ? '🎬 MP4' : '🎵 MP3'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2
                  text-slate-700 dark:text-slate-300">
                  Quality
                </label>
                {availableQualities.length > 0 ? (
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl transition-all
                      border border-slate-200 bg-slate-50 text-slate-700
                      focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400
                      dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200
                      dark:focus:ring-blue-500/20 dark:focus:border-blue-500"
                  >
                    {availableQualities.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={handleFetchFormats}
                    disabled={loadingFormats}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium
                      rounded-xl border border-dashed transition-all disabled:opacity-50
                      border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50
                      dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    {loadingFormats
                      ? <><div className="spinner"></div> Checking...</>
                      : <><IconSparkle /> Load qualities</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white
                flex items-center justify-center gap-2 transition-all
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300
                dark:shadow-blue-900/40 dark:hover:shadow-blue-900/60
                active:scale-[0.98]"
              style={{
                background: loading
                  ? '#93c5fd'
                  : 'linear-gradient(135deg, #2563eb, #7c3aed)'
              }}
            >
              {loading
                ? <><div className="spinner-white"></div> Adding to queue...</>
                : <><IconDownloadCloud /> Start Download</>
              }
            </button>
          </div>
        </div>

        {/* Queue Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2
              text-slate-800 dark:text-slate-100">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Download Queue
              {downloads.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                  bg-slate-100 text-slate-600
                  dark:bg-slate-800 dark:text-slate-300">
                  {downloads.length}
                </span>
              )}
            </h2>
          </div>

          {downloads.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-12 text-center
              bg-white border-slate-200
              dark:bg-slate-900 dark:border-slate-700">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center
                bg-gradient-to-br from-blue-50 to-purple-50
                dark:from-slate-800 dark:to-slate-800">
                <svg className="w-7 h-7 text-blue-400 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <p className="font-semibold text-sm mb-1 text-slate-700 dark:text-slate-300">Queue is empty</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Paste a URL above and hit Start Download</p>
            </div>
          ) : (
            <div className="space-y-3">
              {downloads.map((download) => (
                <DownloadItem
                  key={download.id}
                  download={download}
                  onRemove={handleRemoveDownload}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-xs pb-4 text-slate-400 dark:text-slate-600">
          Made with ❤️ by Darsh &nbsp;·&nbsp; YouTube & Instagram downloader
        </div>
      </main>
    </div>
  );
}

export default App;
