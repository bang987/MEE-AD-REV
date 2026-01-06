'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface MessageProps {
  type: 'success' | 'error';
  message: string;
  onClose?: () => void;
  duration?: number;
}

export default function Message({ type, message, onClose, duration = 8000 }: MessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border ${styles[type]} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
