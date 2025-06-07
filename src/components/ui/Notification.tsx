import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, X, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  type: NotificationType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  if (!isVisible) {
    return null;
  }
  
  const typeConfig = {
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5" />,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-500',
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
    },
  };
  
  const config = typeConfig[type];
  
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md animate-slide-in-right 
                    ${config.bgColor} ${config.textColor} p-4 rounded-lg shadow-md 
                    border-l-4 ${config.borderColor} flex items-start`}>
      <div className={`${config.iconColor} flex-shrink-0 mr-3 pt-0.5`}>
        {config.icon}
      </div>
      <div className="flex-1 mr-2">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Notification;