'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { playNotificationSound } from '@/lib/sound/notifications';
import { sanitizeImageUrl } from '@/lib/utils/sanitize';
import {
  PUSHER_BRIDGE_EVENT,
  type PusherBridgeDetail,
} from '@/lib/pusher/user-bridge-events';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  created_at: string;
};

function parseNotificationBodyMeta(body: string | null): {
  displayText: string;
  senderId: string | null;
  senderUsername: string | null;
  senderAvatar: string | null;
  roomId: string | null;
} {
  if (!body) {
    return { displayText: '', senderId: null, senderUsername: null, senderAvatar: null, roomId: null };
  }
  const lines = body.split('\n');
  const meta = new Map<string, string>();
  const textLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('sender_id:')) {
      meta.set('sender_id', line.slice('sender_id:'.length).trim());
      continue;
    }
    if (line.startsWith('sender_username:')) {
      meta.set('sender_username', line.slice('sender_username:'.length).trim());
      continue;
    }
    if (line.startsWith('sender_avatar:')) {
      meta.set('sender_avatar', line.slice('sender_avatar:'.length).trim());
      continue;
    }
    if (line.startsWith('room_id:')) {
      meta.set('room_id', line.slice('room_id:'.length).trim());
      continue;
    }
    textLines.push(rawLine);
  }
  return {
    displayText: textLines.join('\n').trim(),
    senderId: meta.get('sender_id') || null,
    senderUsername: meta.get('sender_username') || null,
    senderAvatar: meta.get('sender_avatar') || null,
    roomId: meta.get('room_id') || null,
  };
}

/** Строка вида «…текст» + «\nsender_id:<uuid>» из API дружбы */
function parseFriendRequestMeta(body: string | null): {
  displayText: string;
  senderId: string | null;
} {
  const parsed = parseNotificationBodyMeta(body);
  const displayText = parsed.displayText;
  const senderId = parsed.senderId;
  return { displayText, senderId };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendActionId, setFriendActionId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const response = await fetch('/api/notifications', { credentials: 'include' });
      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.length || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadNotifications();

    const supabase = createClient();
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      void loadNotifications();
    });

    const handleUpdate = () => {
      void loadNotifications();
    };
    window.addEventListener('notifications:update', handleUpdate);

    const onPusherBridge = (ev: Event) => {
      const d = (ev as CustomEvent<PusherBridgeDetail>).detail;
      if (!d || d.channel !== 'notifications' || d.event !== 'new-notification') return;
      playNotificationSound('notification');
      void loadNotifications();
    };
    window.addEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);

    return () => {
      authSubscription.unsubscribe();
      window.removeEventListener('notifications:update', handleUpdate);
      window.removeEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
    };
  }, [loadNotifications]);

  const removeNotificationLocal = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const deleteNotificationRemote = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
  };

  const handleFriendAccept = async (notification: Notification, senderId: string) => {
    setFriendActionId(notification.id);
    try {
      const res = await fetch('/api/users/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: senderId, action: 'accept' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось принять запрос');
      }
      toast.success('Запрос принят');
      await deleteNotificationRemote(notification.id);
      removeNotificationLocal(notification.id);
      window.dispatchEvent(new CustomEvent('notifications:update'));
      window.dispatchEvent(new CustomEvent('friends:update'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setFriendActionId(null);
    }
  };

  const handleFriendReject = async (notification: Notification, senderId: string) => {
    setFriendActionId(notification.id);
    try {
      const res = await fetch('/api/users/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: senderId, action: 'reject' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось отклонить запрос');
      }
      toast.success('Запрос отклонён');
      await deleteNotificationRemote(notification.id);
      removeNotificationLocal(notification.id);
      window.dispatchEvent(new CustomEvent('notifications:update'));
      window.dispatchEvent(new CustomEvent('friends:update'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setFriendActionId(null);
    }
  };

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
                      await fetch('/api/notifications', { method: 'DELETE', credentials: 'include' });
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
                  {notifications.map((notification) => {
                    const isFriendReq = notification.type === 'friend_request';
                    const parsedMeta = parseNotificationBodyMeta(notification.body);
                    const { displayText, senderId } = isFriendReq
                      ? parseFriendRequestMeta(notification.body)
                      : { displayText: parsedMeta.displayText, senderId: null };
                    const busy = friendActionId === notification.id;
                    const senderName = parsedMeta.senderUsername || 'Пользователь';
                    const senderInitial = senderName.charAt(0).toUpperCase();
                    const safeAvatar = sanitizeImageUrl(parsedMeta.senderAvatar);
                    const hasAvatar = !!safeAvatar;

                    return (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          {hasAvatar ? (
                            <img
                              src={safeAvatar as string}
                              alt={senderName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {senderInitial || 'U'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </div>
                        {(isFriendReq ? displayText : notification.body) ? (
                          <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                            {isFriendReq ? displayText : parsedMeta.displayText || notification.body}
                          </div>
                        ) : null}

                        {isFriendReq && senderId && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleFriendAccept(notification, senderId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                              Принять
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleFriendReject(notification, senderId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Отклонить
                            </button>
                          </div>
                        )}

                        {isFriendReq && !senderId && (
                          <p className="text-[11px] text-gray-400 mt-2">
                            Откройте раздел{' '}
                            <a href="/friends" className="text-emerald-700 font-semibold underline">
                              Друзья
                            </a>
                            , чтобы ответить на запрос.
                          </p>
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
