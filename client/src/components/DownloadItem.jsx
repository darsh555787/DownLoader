import React from 'react';

const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const IconAlert = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const StatusBadge = ({ status }) => {
  const config = {
    completed:   { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Completed'   },
    failed:      { cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 dot: 'bg-red-500',     label: 'Failed'      },
    downloading: { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             dot: 'bg-blue-500',    label: 'Downloading' },
    pending:     { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         dot: 'bg-amber-400',   label: 'Pending'     },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>
      {status === 'downloading'
        ? <div className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }}></div>
        : <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      }
      {c.label}
    </span>
  );
};

export const DownloadItem = ({ download, onRemove }) => {
  const { id, title, url, format, quality, status, progress, error_message } = download;
  const isYT = !/instagram\.com/i.test(url || '');

  const PlatformBadge = isYT
    ? () => (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
          bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
          </svg>
          YouTube
        </span>
      )
    : () => (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
          bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          Instagram
        </span>
      );

  const progressValue = typeof progress === 'number' ? progress : 0;
  const barColor = status === 'completed' ? '#10b981'
    : status === 'failed' ? '#ef4444'
    : '#3b82f6';

  return (
    <div className="download-item rounded-xl border p-4 shadow-sm transition-all
      bg-white border-slate-200/80 hover:shadow-md hover:border-slate-300
      dark:bg-slate-900 dark:border-slate-700/80 dark:hover:border-slate-600">

      <div className="flex items-start justify-between gap-3">
        {/* Format icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold
            ${format === 'mp3'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>
            {format === 'mp3' ? '♪' : '▶'}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-snug mb-1
            text-slate-800 dark:text-slate-100">
            {title || <span className="text-slate-400 dark:text-slate-500 italic">Loading title...</span>}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {format.toUpperCase()} · {quality}
            </span>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {status === 'completed' && <div className="text-emerald-500"><IconCheck /></div>}
          {status === 'failed' && <div className="text-red-400"><IconAlert /></div>}
          <button
            onClick={() => onRemove(id)}
            className="p-1.5 rounded-lg transition-all
              text-slate-300 hover:text-red-500 hover:bg-red-50
              dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/30"
            aria-label="Remove"
          >
            <IconX />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {status === 'downloading' ? 'Downloading...' : status === 'completed' ? 'Complete' : status}
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{progressValue}%</span>
        </div>
        <div className="w-full rounded-full h-1.5 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressValue}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Error message */}
      {error_message && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg px-3 py-2
          bg-red-50 dark:bg-red-900/20">
          <IconAlert />
          <p className="text-xs text-red-600 dark:text-red-400 leading-snug">{error_message}</p>
        </div>
      )}

      {/* Save button */}
      {status === 'completed' && (
        <a
          href={`/api/file/${id}`}
          download
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4
            text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.98]
            bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200
            dark:shadow-emerald-900/30"
        >
          <IconDownload />
          Save File
        </a>
      )}
    </div>
  );
};
