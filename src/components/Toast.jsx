import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#5F7252]" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-[#F8F6EE] border-[#5F7252]',
    error: 'bg-red-50 border-red-600',
    info: 'bg-blue-50 border-blue-600'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg ${bgColors[type]} animate-slide-up`}>
      {icons[type]}
      <p className="text-sm font-medium text-[#4A5940]">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-[#E8EBE4] rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-[#7A8F6C]" />
      </button>
    </div>
  );
};

export default Toast;
