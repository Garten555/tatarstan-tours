'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Loader2, MessageSquare, Bot, MessageCircle, Trash2, X } from 'lucide-react';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';

type ChatMessage = {
  id: string;
  message: string;
  is_support: boolean;
  is_ai: boolean;
  created_at: string;
};

type SupportChatProps = {
  variant?: 'widget';
  onClose?: () => void;
};

export default function SupportChat({ variant, onClose }: SupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'support' | 'ai'>('support');
  const [sessionStatus, setSessionStatus] = useState<'active' | 'closed' | 'deleted' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const modeRef = useRef<'support' | 'ai'>('support');
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitializingRef = useRef(false);

  // Проверяем авторизацию при монтировании
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  // Синхронизируем ref с state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/support/messages?mode=${mode}`, { cache: 'no-store' });
      
      if (!response.ok) {
        // Если пользователь не авторизован, просто очищаем сообщения без ошибки
        if (response.status === 401) {
          setIsAuthenticated(false);
          setMessages([]);
          setLoading(false);
          return;
        }

        console.error('Ошибка загрузки сообщений:', response.status, response.statusText);
        setMessages([]);
        setLoading(false);
        return;
      }

      const text = await response.text();
      if (!text) {
        setMessages([]);
        setLoading(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON сообщений:', parseError);
        setMessages([]);
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }

      // Проверяем статус сессии (только для режима поддержки)
      if (mode === 'support') {
        try {
          const sessionResponse = await fetch(`/api/support/session-status`, { cache: 'no-store' });
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.session) {
              if (sessionData.session.status === 'closed' || sessionData.session.status === 'archived') {
                setSessionStatus('closed');
              } else {
                setSessionStatus('active');
              }
            } else {
              // Активной сессии нет - проверяем, есть ли вообще сессии
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                // Если нет активной сессии, но есть закрытые - значит сессия закрыта
                // Если вообще нет сессий - значит удалена или еще не создана
                setSessionStatus(null); // Нет сессии, можно создать новую
              }
            }
          }
        } catch (error) {
          console.error('Ошибка проверки статуса сессии:', error);
        }
      }
    } catch (error) {
      console.error('Ошибка парсинга сообщений:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ждём, пока станет известен статус авторизации
    if (isAuthenticated === null) {
      return;
    }

    // Если пользователь не авторизован, не делаем запросы к API чата
    if (!isAuthenticated) {
      setMessages([]);
      setLoading(false);
      return;
    }

    loadMessages();

      // Pusher используется ТОЛЬКО для режима поддержки (реальные операторы)
    // ИИ работает через OpenRouter API и не использует Pusher
    if (mode === 'ai') {
      return; // ИИ не использует Pusher
    }

    // Инициализация Pusher только для режима поддержки
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      // Pusher не настроен (не критично для разработки)
      return;
    }

    // Получаем session_id (user.id) для подписки на канал
    const initPusher = async () => {
      // Предотвращаем множественные инициализации
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;

      try {
        // Очищаем предыдущее подключение, если оно есть
        if (channelRef.current) {
          try {
            const channel = channelRef.current;
            // Проверяем состояние канала перед отпиской
            if (channel && typeof channel.unbind_all === 'function') {
              channel.unbind_all();
            }
            if (channel && typeof channel.unsubscribe === 'function') {
              // Проверяем состояние WebSocket перед отпиской
              const pusher = pusherRef.current;
              if (pusher && pusher.connection) {
                const wsState = pusher.connection.state;
                if (wsState && wsState !== 'disconnected' && wsState !== 'disconnecting' && wsState !== 'closed') {
                  // Дополнительный try-catch для самого вызова unsubscribe
                  try {
                    channel.unsubscribe();
                  } catch (unsubError) {
                    // Игнорируем ошибки при unsubscribe
                  }
                }
              }
            }
          } catch (error) {
            // Игнорируем ошибки при очистке
          }
          channelRef.current = null;
        }

        if (pusherRef.current) {
          try {
            const pusher = pusherRef.current;
            const state = pusher.connection?.state;
            if (state && state !== 'disconnected' && state !== 'disconnecting' && state !== 'closed') {
              pusher.disconnect();
            }
          } catch (error) {
            // Игнорируем ошибки при отключении
          }
          pusherRef.current = null;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) {
          isInitializingRef.current = false;
          return;
        }

        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
          enabledTransports: ['ws', 'wss'],
        });

        pusherRef.current = pusher;

        const channelName = `support-chat-${userId}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        channel.bind('pusher:subscription_succeeded', () => {
          console.log('[SupportChat] Pusher subscribed to channel:', channelName);
          isInitializingRef.current = false;
        });

        channel.bind('new-message', (data: { message: ChatMessage }) => {
          if (data.message) {
            // В режиме поддержки показываем только сообщения без ИИ
            if (data.message.is_ai === true) {
              return; // Игнорируем сообщения от ИИ
            }
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
          }
        });

        // Обработка закрытия сессии
        channel.bind('session-closed', (data: { session: any }) => {
          if (data.session) {
            setSessionStatus('closed');
          }
        });

        // Обработка удаления сессии
        channel.bind('session-deleted', (data: { clearMessages?: boolean }) => {
          setSessionStatus('deleted');
          setMessages([]); // Всегда очищаем сообщения при удалении сессии
        });

        // Обработка очистки сообщений (при создании новой сессии)
        channel.bind('messages-cleared', () => {
          setMessages([]);
        });

        // Обработка создания новой сессии
        channel.bind('new-session-created', async () => {
          // Обновляем статус и перезагружаем сообщения
          setSessionStatus('active');
          await loadMessages();
        });
      } catch (error) {
        console.error('[SupportChat] Pusher initialization error:', error);
        isInitializingRef.current = false;
      }
    };

    initPusher();

    return () => {
      isInitializingRef.current = false;
      
      // Очистка канала - безопасная отписка с полной обработкой ошибок
      if (channelRef.current) {
        const channel = channelRef.current;
        
        // Отвязываем обработчики событий (безопасно)
        try {
          if (channel && typeof channel.unbind_all === 'function') {
            channel.unbind_all();
          }
        } catch (error) {
          // Игнорируем ошибки при unbind_all
        }
        
        // Отписываемся от канала (может вызвать ошибку, если WebSocket уже закрыт)
        try {
          if (channel && typeof channel.unsubscribe === 'function') {
            // Проверяем состояние Pusher перед отпиской
            const pusher = pusherRef.current;
            if (pusher && pusher.connection) {
              const wsState = pusher.connection.state;
              // Отписываемся только если WebSocket не закрыт
              if (wsState && 
                  wsState !== 'disconnected' && 
                  wsState !== 'disconnecting' && 
                  wsState !== 'closed') {
                // Дополнительный try-catch для самого вызова unsubscribe
                // так как состояние может измениться между проверкой и вызовом
                try {
                  channel.unsubscribe();
                } catch (unsubError) {
                  // Игнорируем ошибки при unsubscribe (WebSocket может быть уже в CLOSING/CLOSED)
                  // Это нормально, если канал уже закрыт или закрывается
                }
              }
            }
          }
        } catch (error) {
          // Игнорируем ошибки при unsubscribe (WebSocket может быть уже в CLOSING/CLOSED)
          // Это нормально, если канал уже закрыт или закрывается
        }
        
        channelRef.current = null;
      }
      
      // Очистка Pusher
      if (pusherRef.current) {
        try {
          const pusher = pusherRef.current;
          const state = pusher.connection?.state;
          if (state && 
              state !== 'disconnected' && 
              state !== 'disconnecting' && 
              state !== 'closed') {
            pusher.disconnect();
          }
        } catch (error) {
          // Игнорируем ошибки, если соединение уже закрыто
        }
        pusherRef.current = null;
      }
    };
  }, [mode]);

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

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    
    // Проверяем авторизацию
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Для отправки сообщений необходимо войти в аккаунт');
      return;
    }
    
    // Блокируем отправку, если сессия закрыта или удалена
    if (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted')) {
      return;
    }
    
    setSending(true);
    try {
      const endpoint = mode === 'ai' ? '/api/support/ai' : '/api/support/messages';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.error) {
          // Сессия закрыта
          setSessionStatus('closed');
          alert(errorData.error);
        }
        console.error('Ошибка отправки сообщения:', response.status, response.statusText);
        return;
      }

      const text = await response.text();
      if (!text) {
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON ответа:', parseError);
        return;
      }
      
      if (data.success) {
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        // ИИ работает через OpenRouter API - сообщения добавляем напрямую из ответа
        if (mode === 'ai' && data.messages && Array.isArray(data.messages)) {
          setMessages((prev) => {
            const newMessages = data.messages.filter((msg: ChatMessage) => 
              !prev.some((m) => m.id === msg.id)
            );
            return [...prev, ...newMessages];
          });
        }
        // Для режима поддержки сообщения придут через Pusher (реальные операторы)
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    if (mode !== 'ai') return;
    if (!confirm('Вы уверены, что хотите очистить историю чата с ИИ?')) return;

    try {
      const response = await fetch('/api/support/ai', {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages([]);
      }
    } catch (error) {
      console.error('Ошибка очистки чата:', error);
    }
  };

  const startNewSession = async () => {
    if (mode !== 'support') return;
    
    try {
      // Сначала очищаем сообщения на клиенте
      setMessages([]);
      setSessionStatus(null); // Сбрасываем статус перед созданием
      
      const response = await fetch('/api/support/sessions/new', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Не удалось начать новую сессию');
        return;
      }

      // Устанавливаем статус как активный
      setSessionStatus('active');
      
      // Перезагружаем сообщения для новой сессии
      await loadMessages();
    } catch (error) {
      console.error('Ошибка создания новой сессии:', error);
      alert('Не удалось начать новую сессию');
    }
  };

  const isWidget = variant === 'widget';

  return (
    <div
      className={`flex flex-col bg-white border border-gray-200 shadow-2xl overflow-hidden ${
        isWidget 
          ? 'fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[340px] md:w-[360px] sm:h-[480px] md:h-[500px] sm:rounded-xl sm:max-w-[calc(100vw-2rem)] sm:max-h-[calc(100vh-2rem)]' 
          : 'w-full max-w-4xl mx-auto h-[calc(100vh-200px)] min-h-[600px] rounded-xl'
      }`}
      data-support-chat
    >
      {/* Заголовок */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white flex-shrink-0">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${mode === 'ai' ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse flex-shrink-0`} />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {mode === 'ai' ? 'ИИ помощник' : 'Чат поддержки'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Кнопка очистки для ИИ */}
            {mode === 'ai' && messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Очистить чат"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            {/* Кнопка закрытия - только для виджета */}
            {variant === 'widget' && onClose && (
              <button
                onClick={onClose}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Закрыть чат"
                aria-label="Закрыть чат"
              >
                <X className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
            )}
            {/* Переключатель режима */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('support')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
                  mode === 'support'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden min-[375px]:inline">Поддержка</span>
              </button>
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${
                  mode === 'ai'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden min-[375px]:inline">ИИ</span>
              </button>
            </div>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-700 font-medium ml-4 sm:ml-5">
          {mode === 'ai' 
            ? 'Задайте вопрос ИИ о турах' 
            : 'Напишите нам, и мы поможем'}
        </p>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto chat-scroll bg-gray-50 p-2 sm:p-3 space-y-2 sm:space-y-2.5 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-emerald-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base font-semibold text-gray-900">Начните общение</p>
              <p className="text-[10px] sm:text-xs text-gray-700 font-medium mt-1 sm:mt-1.5">
                Задайте вопрос, и мы ответим вам
              </p>
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
                  className={`max-w-[85%] sm:max-w-[80%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                    msg.is_support
                      ? mode === 'ai' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-emerald-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.message}</div>
                  <div className={`text-[9px] sm:text-[10px] mt-1 sm:mt-1.5 font-medium ${msg.is_support ? mode === 'ai' ? 'text-blue-100' : 'text-emerald-100' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Уведомление о закрытии/удалении сессии */}
      {mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted') && (
        <div className={`p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 ${
          sessionStatus === 'deleted' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-2 h-2 rounded-full ${
                sessionStatus === 'deleted' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <p className={`text-xs sm:text-sm font-bold ${
                sessionStatus === 'deleted' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {sessionStatus === 'deleted' 
                  ? 'Сессия поддержки удалена. Вы не можете отправлять сообщения.'
                  : 'Сессия поддержки закрыта. Вы не можете отправлять сообщения.'}
              </p>
            </div>
            <button
              onClick={startNewSession}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Начать новую сессию
            </button>
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="p-2.5 sm:p-3 border-t border-gray-200 bg-white flex-shrink-0 safe-area-inset-bottom">
        {!isAuthenticated ? (
          <div className="text-center py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold">
              Для отправки сообщений необходимо <a href="/auth/login" className="text-emerald-600 hover:underline">войти в аккаунт</a>
            </p>
          </div>
        ) : (
          <div className="flex gap-1.5 sm:gap-2 items-end">
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
              placeholder={
                mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted')
                  ? 'Сессия закрыта'
                  : 'Напишите сообщение...'
              }
              rows={1}
              disabled={
                !isAuthenticated ||
                (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
              }
              className={`flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all resize-none overflow-hidden min-h-[44px] sm:min-h-[40px] max-h-[120px] sm:max-h-[120px] ${
                !isAuthenticated || (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-white'
              }`}
              style={{ fontSize: '16px' }} // Предотвращает зум на iOS
            />
            <button
              onClick={sendMessage}
              disabled={
                !isAuthenticated ||
                sending || 
                !input.trim() || 
                (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
              }
              className={`flex-shrink-0 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg !text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm transition-all shadow-md hover:shadow-lg ${
                mode === 'ai' 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
