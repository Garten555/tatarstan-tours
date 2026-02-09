'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        console.error('Ошибка загрузки уведомлений:', response.status, response.statusText);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        // Считаем непрочитанные (можно добавить поле is_read в будущем)
        setUnreadCount(data.notifications?.length || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Слушаем события обновления уведомлений
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('notifications:update', handleUpdate);

    return () => {
      window.removeEventListener('notifications:update', handleUpdate);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        aria-label="Уведомления"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Уведомления</h3>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/notifications', { method: 'DELETE' });
                      loadNotifications();
                    } catch (error) {
                      console.error('Ошибка очистки уведомлений:', error);
                    }
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Очистить все
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Загрузка...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Нет уведомлений
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </div>
                      {notification.body && (
                        <div className="text-xs text-gray-600 mt-1">
                          {notification.body}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
