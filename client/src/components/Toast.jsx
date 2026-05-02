import React, { useEffect } from 'react';

const IconX = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const Toast = ({ id, message, type = 'info', onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  const config = {
    success: {
      bg: 'bg-emerald-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2H9v-2zm0-8h2v6H9V5z" clipRule="evenodd" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-blue-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 4a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
    },
  };

  const c = config[type] || config.info;

  return (
    <div className={`toast flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium
      max-w-xs ${c.bg}`}>
      <span className="flex-shrink-0 opacity-90">{c.icon}</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
      >
        <IconX />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, onRemoveToast }) => (
  <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} onClose={onRemoveToast} />
    ))}
  </div>
);
