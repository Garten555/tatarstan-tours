'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Send, Loader2, Search, MessageSquare, Menu, X, CheckCircle, Archive, AlertCircle, Trash2 } from 'lucide-react';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';

type Session = {
  session_id: string;
  user_id: string | null;
  user_label: string;
  last_message: string;
  last_message_at: string;
  status?: 'active' | 'closed' | 'archived';
  closed_at?: string;
  closed_reason?: string;
};

type ChatMessage = {
  id: string;
  message: string;
  is_support: boolean;
  is_ai?: boolean;
  created_at: string;
};

export default function SupportChatAdmin() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  
  // Обновляем ref при смене активной сессии
  useEffect(() => {
    currentUserIdRef.current = activeSession?.user_id || null;
  }, [activeSession]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'archived' | 'all'>('active');
  const [closingSession, setClosingSession] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const chatFocusedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);

  // Функция для воспроизведения звука уведомления
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.06;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
    } catch {
      // Ignore sound errors (autoplay restrictions)
    }
  };

  // Функция для показа браузерного уведомления
  const showBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.svg',
        badge: '/logo.svg',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/logo.svg',
            badge: '/logo.svg',
          });
        }
      });
    }
  };

  // Отслеживаем фокус окна
  useEffect(() => {
    const handleFocus = () => {
      chatFocusedRef.current = true;
    };
    const handleBlur = () => {
      chatFocusedRef.current = false;
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Запрашиваем разрешение на уведомления при первом открытии админского чата
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Игнорируем ошибки запроса разрешения
      });
    }
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const statusParam = statusFilter === 'all' ? '' : statusFilter;
      const url = statusParam 
        ? `/api/admin/support/sessions?status=${statusParam}`
        : '/api/admin/support/sessions';
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error('Ошибка загрузки сессий:', response.status, response.statusText);
        setSessions([]);
        setLoading(false);
        return;
      }

      const text = await response.text();
      if (!text) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        setSessions(data.sessions || []);
        if (!activeSession && data.sessions?.length) {
          setActiveSession(data.sessions[0]);
        }
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Ошибка парсинга сессий:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/support/messages?session_id=${sessionId}`, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error('Ошибка загрузки сообщений:', response.status, response.statusText);
        setMessages([]);
        return;
      }

      const text = await response.text();
      if (!text) {
        setMessages([]);
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Ошибка парсинга сообщений:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    loadSessions();
    // Обновляем список сессий каждые 10 секунд (реже, чем сообщения)
    const timer = setInterval(loadSessions, 10000);
    return () => clearInterval(timer);
  }, [statusFilter]);

  useEffect(() => {
    if (!activeSession) return;

    loadMessages(activeSession.session_id);

    // Инициализация Pusher для real-time обновлений
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      // Pusher не настроен (не критично для разработки)
      return;
    }

    // Отключаем предыдущее подключение - безопасная очистка
    if (channelRef.current) {
      const channel = channelRef.current;
      try {
        if (channel && typeof channel.unbind_all === 'function') {
          channel.unbind_all();
        }
      } catch (error) {
        // Игнорируем ошибки
      }
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          const pusher = pusherRef.current;
          if (pusher && pusher.connection) {
            const wsState = pusher.connection.state;
            // Отписываемся только если WebSocket активен
            if (wsState === 'connected' || wsState === 'connecting') {
              try {
                channel.unsubscribe();
              } catch (unsubError: unknown) {
                // Игнорируем ошибки при unsubscribe
                const errorMsg = unsubError instanceof Error ? unsubError.message : String(unsubError);
                if (process.env.NODE_ENV === 'development' && 
                    !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
                  console.warn('[SupportChatAdmin] Init cleanup unsubscribe warning:', errorMsg);
                }
              }
            }
          }
        }
      } catch (error: unknown) {
        // Игнорируем ошибки
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (process.env.NODE_ENV === 'development' && 
            !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
          console.warn('[SupportChatAdmin] Init cleanup error:', errorMsg);
        }
      }
      channelRef.current = null;
    }
    
    if (pusherRef.current) {
      try {
        const pusher = pusherRef.current;
        if (pusher.connection) {
          const state = pusher.connection.state;
          // Отключаемся только если соединение активно
          if (state === 'connected' || state === 'connecting') {
            pusher.disconnect();
          }
        }
      } catch (error: unknown) {
        // Игнорируем ошибки, если соединение уже закрыто
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (process.env.NODE_ENV === 'development' && 
            !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
          console.warn('[SupportChatAdmin] Init cleanup disconnect warning:', errorMsg);
        }
      }
      pusherRef.current = null;
    }

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      enabledTransports: ['ws', 'wss'],
    });

    pusherRef.current = pusher;

    // Подписываемся на канал пользователя (user_id), а не на канал сессии
    // Это нужно для синхронизации с пользовательским чатом, который подписан на support-chat-${user.id}
    const userId = activeSession.user_id;
    if (!userId) {
      console.error('[SupportChatAdmin] Нет user_id для сессии:', activeSession.session_id);
      return;
    }
    
    // Сохраняем userId в ref для использования в обработчиках
    currentUserIdRef.current = userId;
    
    const channelName = `support-chat-${userId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SupportChatAdmin] Pusher subscribed to channel:', channelName, 'for user_id:', userId);
      }
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('[SupportChatAdmin] Pusher subscription error:', error);
    });

    // Обработчик нового сообщения
    channel.bind('new-message', (data: { message: ChatMessage }) => {
      if (data.message) {
        // Игнорируем сообщения от ИИ в админском чате
        if (data.message.is_ai === true) {
          return;
        }
        
        // Пропускаем дубликаты
        if (data.message.id === lastMessageIdRef.current) {
          return;
        }
        lastMessageIdRef.current = data.message.id;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[SupportChatAdmin] New message received via Pusher:', data.message.id, 'on channel:', channelName);
        }
        
        // Если сообщение от пользователя (is_support === false)
        if (data.message.is_support === false) {
          // Проверяем, открыт ли чат с этим пользователем
          // Используем ref для получения актуального userId
          const currentUserId = currentUserIdRef.current;
          const isCurrentChat = activeSession?.user_id === currentUserId;
          const isChatFocused = chatFocusedRef.current && isCurrentChat;
          
          if (!isChatFocused) {
            // Показываем уведомление только если чат не в фокусе или это другой пользователь
            playNotificationSound();
            const userName = isCurrentChat ? (activeSession?.user_label || 'Пользователь') : 'Пользователь';
            const messagePreview = data.message.message.length > 100 
              ? data.message.message.substring(0, 100) + '...' 
              : data.message.message;
            
            showBrowserNotification(
              `Новое сообщение от ${userName}`,
              messagePreview
            );
            toast.success(`Новое сообщение от ${userName}`, {
              icon: '💬',
            });
          } else {
            // Если чат в фокусе, только звук
            playNotificationSound();
          }
        }
        
        setMessages((prev) => {
          // Проверяем, нет ли уже такого сообщения
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          // Удаляем временные сообщения при получении реального
          const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
          return [...filtered, data.message];
        });
      }
    });

    // Обработка удаления сообщения
    channel.bind('message-deleted', (data: { messageId: string }) => {
      if (data.messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    });

    // Обработка удаления нескольких сообщений
    channel.bind('messages-deleted', (data: { messageIds: string[] }) => {
      if (data.messageIds && Array.isArray(data.messageIds)) {
        setMessages((prev) => prev.filter((m) => !data.messageIds.includes(m.id)));
      }
    });

    return () => {
      // Очистка канала - безопасная отписка
      if (channelRef.current) {
        const channel = channelRef.current;
        try {
          if (channel && typeof channel.unbind_all === 'function') {
            channel.unbind_all();
          }
        } catch (error) {
          // Игнорируем ошибки при unbind_all
        }
        
        try {
          if (channel && typeof channel.unsubscribe === 'function') {
            const pusher = pusherRef.current;
            if (pusher && pusher.connection) {
              const wsState = pusher.connection.state;
              // Отписываемся только если WebSocket активен
              if (wsState === 'connected' || wsState === 'connecting') {
                try {
                  channel.unsubscribe();
                } catch (unsubError: unknown) {
                  // Игнорируем ошибки при unsubscribe
                  const errorMsg = unsubError instanceof Error ? unsubError.message : String(unsubError);
                  if (process.env.NODE_ENV === 'development' && 
                      !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
                    console.warn('[SupportChatAdmin] Cleanup unsubscribe warning:', errorMsg);
                  }
                }
              }
            } else {
              // Если нет соединения, просто пытаемся отписаться
              try {
                channel.unsubscribe();
              } catch (unsubError: unknown) {
                // Игнорируем ошибки
                const errorMsg = unsubError instanceof Error ? unsubError.message : String(unsubError);
                if (process.env.NODE_ENV === 'development' && 
                    !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
                  console.warn('[SupportChatAdmin] Cleanup unsubscribe warning (no connection):', errorMsg);
                }
              }
            }
          }
        } catch (error: unknown) {
          // Игнорируем ошибки при unsubscribe
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (process.env.NODE_ENV === 'development' && 
              !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
            console.warn('[SupportChatAdmin] Cleanup error:', errorMsg);
          }
        }
        channelRef.current = null;
      }
      
      // Очистка Pusher
      if (pusherRef.current) {
        try {
          const pusher = pusherRef.current;
          if (pusher.connection) {
            const state = pusher.connection.state;
            // Отключаемся только если соединение активно
            if (state === 'connected' || state === 'connecting') {
              pusher.disconnect();
            }
          }
        } catch (error: unknown) {
          // Игнорируем ошибки, если соединение уже закрыто
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (process.env.NODE_ENV === 'development' && 
              !errorMsg.includes('CLOSING') && !errorMsg.includes('CLOSED')) {
            console.warn('[SupportChatAdmin] Cleanup disconnect warning:', errorMsg);
          }
        }
        pusherRef.current = null;
      }
    };
  }, [activeSession]);

  const handleCloseSession = async () => {
    if (!activeSession || closingSession) return;
    
    setCloseModalOpen(true);
  };

  const confirmCloseSession = async () => {
    if (!activeSession || closingSession) return;
    
    setClosingSession(true);
    setCloseModalOpen(false);
    const reason = closeReason.trim() || null;
    try {
      const response = await fetch(`/api/admin/support/sessions/${activeSession.session_id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null }),
      });

      if (!response.ok) {
        throw new Error('Не удалось завершить сессию');
      }

      // Обновляем список сессий
      await loadSessions();
      // Переключаемся на первую активную сессию или очищаем
      const activeSessions = sessions.filter(s => s.status === 'active');
      if (activeSessions.length > 0) {
        setActiveSession(activeSessions[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Ошибка завершения сессии:', error);
      alert('Не удалось завершить сессию');
    } finally {
      setClosingSession(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || deletingSession) return;
    
    setDeletingSession(true);
    try {
      const response = await fetch(`/api/admin/support/sessions/${sessionToDelete.session_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить сессию');
      }

      // Обновляем список сессий
      await loadSessions();
      
      // Если удаляемая сессия была активной, очищаем её
      if (activeSession?.session_id === sessionToDelete.session_id) {
        setActiveSession(null);
        setMessages([]);
      }
      
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления сессии:', error);
      alert('Не удалось удалить сессию');
    } finally {
      setDeletingSession(false);
    }
  };

  const sendMessage = async () => {
    if (!activeSession || !input.trim() || sending) return;
    if (activeSession.status !== 'active') {
      alert('Нельзя отправлять сообщения в завершенную сессию');
      return;
    }
    
    const messageText = input.trim();
    setInput('');
    // Сбрасываем высоту textarea сразу
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Оптимистичное обновление - добавляем сообщение сразу
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      is_support: true,
      is_ai: false,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => {
      // Проверяем, нет ли уже такого временного сообщения
      if (prev.some((m) => m.id === tempMessage.id)) {
        return prev;
      }
      return [...prev, tempMessage];
    });
    
    setSending(true);
    try {
      const response = await fetch('/api/admin/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id, message: messageText }),
      });

      if (!response.ok) {
        console.error('Ошибка отправки сообщения:', response.status, response.statusText);
        // Удаляем временное сообщение при ошибке
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        setInput(messageText); // Возвращаем текст обратно
        return;
      }

      const text = await response.text();
      if (!text) {
        // Удаляем временное сообщение при пустом ответе
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        return;
      }

      const data = JSON.parse(text);
      if (data.success && data.message) {
        // Заменяем временное сообщение на реальное
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempMessage.id);
          // Проверяем, нет ли уже такого сообщения (могло прийти через Pusher)
          if (!filtered.some((m) => m.id === data.message.id)) {
            return [...filtered, data.message];
          }
          return filtered;
        });
      } else {
        // Удаляем временное сообщение если не получили реальное
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Удаляем временное сообщение при ошибке
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setInput(messageText); // Возвращаем текст обратно
    } finally {
      setSending(false);
    }
  };

  const sessionLabel = useMemo(() => activeSession?.user_label || 'Сессия', [activeSession]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.user_label.toLowerCase().includes(query) ||
        session.last_message.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Автоподстройка высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const [showSessions, setShowSessions] = useState(true);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] sm:h-[calc(100vh-250px)] md:h-[calc(100vh-300px)] min-h-[500px] sm:min-h-[600px] bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      {/* Список сессий */}
      <div className={`w-full lg:w-1/3 border-r-0 lg:border-r-2 border-gray-200 flex flex-col bg-white transition-all duration-300 ${
        showSessions ? 'block' : 'hidden lg:block'
      }`}>
        {/* Заголовок */}
        <div className="p-4 sm:p-5 md:p-6 border-b-2 border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">Сессии</h2>
            <button
              onClick={() => setShowSessions(false)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Скрыть список сессий"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
            >
              <option value="active">Активные</option>
              <option value="closed">Завершенные</option>
              <option value="archived">Архив</option>
              <option value="all">Все</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск сессий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Список сессий */}
        <div className="flex-1 overflow-y-auto chat-scroll">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full"></div>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-black text-gray-900">
                {searchQuery ? 'Сессии не найдены' : 'Сообщений пока нет'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-1 p-2 sm:p-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                    activeSession?.session_id === session.session_id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : session.status === 'closed'
                      ? 'border-gray-300 bg-gray-50'
                      : session.status === 'archived'
                      ? 'border-gray-400 bg-gray-100'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveSession(session);
                      // На мобильных скрываем список сессий после выбора
                      if (window.innerWidth < 1024) {
                        setShowSessions(false);
                      }
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-bold text-base sm:text-lg text-gray-900 truncate flex-1">{session.user_label}</div>
                      {session.status === 'closed' && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-semibold flex-shrink-0">
                          Завершен
                        </span>
                      )}
                      {session.status === 'archived' && (
                        <span className="px-2 py-0.5 bg-gray-300 text-gray-600 rounded text-xs font-semibold flex-shrink-0">
                          Архив
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate font-medium">{session.last_message}</div>
                    {session.last_message_at && (
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                        {new Date(session.last_message_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session);
                        setDeleteModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5"
                      title="Удалить сессию"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Область чата */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {activeSession ? (
          <>
            {/* Заголовок чата */}
            <div className="p-4 sm:p-5 md:p-6 border-b-2 border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => setShowSessions(true)}
                      className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Показать список сессий"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div className="font-black text-lg sm:text-xl text-gray-900 truncate">{sessionLabel}</div>
                    {activeSession.status === 'closed' && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                        Завершен
                      </span>
                    )}
                    {activeSession.status === 'archived' && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold">
                        Архив
                      </span>
                    )}
                  </div>
                  {activeSession.last_message_at && (
                    <div className="text-xs sm:text-sm text-gray-700 font-medium truncate">
                      Последняя активность {new Date(activeSession.last_message_at).toLocaleString('ru-RU')}
                    </div>
                  )}
                  {activeSession.closed_at && (
                    <div className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                      Завершен {new Date(activeSession.closed_at).toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>
                {activeSession.status === 'active' && (
                  <button
                    onClick={handleCloseSession}
                    disabled={closingSession}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl"
                  >
                    {closingSession ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Завершить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto chat-scroll bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl font-black text-gray-900">Сообщений пока нет</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_support ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl ${
                          msg.is_support
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border-2 border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="text-sm sm:text-base font-semibold mb-1 leading-relaxed whitespace-pre-wrap break-words">{msg.message}</div>
                        <div className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 font-medium ${msg.is_support ? 'text-blue-100' : 'text-gray-600'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Поле ввода */}
            {activeSession.status === 'active' && (
              <div className="p-3 sm:p-4 md:p-6 border-t-2 border-gray-200 bg-white flex-shrink-0 safe-area-inset-bottom">
                <div className="flex gap-2 sm:gap-3 items-end">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Ответить пользователю..."
                    rows={1}
                    className="flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none overflow-hidden min-h-[44px] sm:min-h-[48px] max-h-[150px] sm:max-h-[200px]"
                    style={{ fontSize: '16px' }} // Предотвращает зум на iOS
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 font-black text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <span className="hidden sm:inline">Отправить</span>
                  </button>
                </div>
              </div>
            )}
            {activeSession.status !== 'active' && (
              <div className="p-4 sm:p-5 md:p-6 border-t-2 border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="text-center text-gray-600 font-semibold">
                  {activeSession.status === 'closed' && 'Диалог завершен'}
                  {activeSession.status === 'archived' && 'Диалог в архиве'}
                  {activeSession.closed_reason && (
                    <div className="mt-2 text-sm text-gray-500">
                      Причина: {activeSession.closed_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
            <div className="text-center">
              <MessageSquare className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-black text-gray-900">Выберите сессию для начала общения</p>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для завершения сессии */}
      {closeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl max-w-md w-full p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-emerald-600" />
                Завершить диалог
              </h2>
              <button
                onClick={() => {
                  setCloseModalOpen(false);
                  setCloseReason('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <label className="block text-base font-bold text-gray-900">
                Причина завершения (необязательно)
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Укажите причину завершения диалога..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-base resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={confirmCloseSession}
                disabled={closingSession}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closingSession ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Завершение...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Завершить</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setCloseModalOpen(false);
                  setCloseReason('');
                }}
                disabled={closingSession}
                className="px-6 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для удаления сессии */}
      {deleteModalOpen && sessionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-2xl max-w-md w-full p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                <Trash2 className="w-8 h-8 text-red-600" />
                Удалить сессию
              </h2>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSessionToDelete(null);
                }}
                disabled={deletingSession}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-base font-semibold text-gray-700">
                Вы уверены, что хотите удалить сессию с пользователем <span className="font-black text-gray-900">{sessionToDelete.user_label}</span>?
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm font-bold text-red-800">
                  ⚠️ Это действие необратимо. Все сообщения этой сессии будут удалены навсегда.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDeleteSession}
                disabled={deletingSession}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-base transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingSession ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Удалить</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSessionToDelete(null);
                }}
                disabled={deletingSession}
                className="px-6 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






