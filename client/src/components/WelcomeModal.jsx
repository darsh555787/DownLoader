import React, { useEffect, useState } from 'react';

export const WelcomeModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('darshDownloaderWelcome');
    if (!hasSeenWelcome) setIsVisible(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem('darshDownloaderWelcome', 'true');
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center
        bg-white dark:bg-slate-900">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Welcome, Darsh! 👋</h2>
        <p className="text-sm mb-6 leading-relaxed text-slate-500 dark:text-slate-400">
          Your personal video downloader is ready.<br />
          Download YouTube & Instagram videos in <strong>MP4</strong> or <strong>MP3</strong>,
          pick your quality, and track progress in real-time.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-7">
          {['🎬 MP4 Video', '🎵 MP3 Audio', '📊 Live Progress', '⚡ Multi-URL'].map((f) => (
            <span key={f} className="text-xs font-medium px-3 py-1.5 rounded-full
              bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {f}
            </span>
          ))}
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white
            transition-all active:scale-[0.98] shadow-md shadow-blue-200
            hover:shadow-lg hover:shadow-blue-300"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
        >
          Let's go →
        </button>
      </div>
    </div>
  );
};
