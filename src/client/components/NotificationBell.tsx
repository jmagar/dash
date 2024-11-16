import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../hooks/useNotifications';
import { useDesktopNotifications } from '../hooks/useDesktopNotifications';
import type { Notification, NotificationType } from '../../types/notifications';

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    counts,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    userId,
    limit: 10,
    autoRefresh: true,
  });
  const { requestPermission } = useDesktopNotifications();

  // Check if we should show the permission prompt
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowPermissionPrompt(true);
    }
  }, []);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowPermissionPrompt(false);
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case 'alert': return '🔔';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const formatTimestamp = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Failed to format timestamp:', error);
      return 'some time ago';
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    if (!notifications.find((n: Notification) => n.id === notificationId)?.read) {
      await markAsRead(notificationId);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (error) {
    console.error('Failed to load notifications:', error);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications ${counts?.unread ? `(${counts.unread} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {counts?.unread ? (
          <span
            className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full"
            aria-hidden="true"
          >
            {counts.unread}
          </span>
        ) : null}
      </button>

      {/* Desktop Notification Permission Prompt */}
      {showPermissionPrompt && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg p-4 z-50">
          <p className="text-sm text-gray-600 mb-3">
            Would you like to receive desktop notifications for important updates?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Not now
            </button>
            <button
              onClick={handlePermissionRequest}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Allow
            </button>
          </div>
        </div>
      )}

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="notifications-menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <div className="flex items-center space-x-4">
              {counts?.unread ? (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Mark all as read
                </button>
              ) : null}
              <Link
                to="/settings/notifications"
                className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </Link>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <ul>
                {notifications.map((notification: Notification) => (
                  <li key={notification.id}>
                    <button
                      className={`w-full text-left p-4 border-b hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                        notification.read ? 'bg-white' : 'bg-blue-50'
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                      aria-label={`${notification.title} - ${notification.message}`}
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3" aria-hidden="true">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimestamp(new Date(notification.createdAt))}
                          </p>
                          {notification.link && (
                            <a
                              href={notification.link}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1 block"
                              onClick={e => e.stopPropagation()}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View details
                            </a>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
