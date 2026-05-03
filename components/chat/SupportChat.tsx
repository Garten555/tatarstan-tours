'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, Loader2, MessageSquare, Bot, MessageCircle, Trash2, X } from 'lucide-react';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { getUserFromSession, resolveAuthUserForUi } from '@/lib/supabase/auth-quick-client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { playNotificationSound } from '@/lib/sound/notifications';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';
import { ChatEmojiPicker } from '@/components/chat/ChatEmojiPicker';
import { insertEmojiAtCursor } from '@/lib/chat/insert-emoji-at-cursor';

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const autoScrollNextRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitializingRef = useRef(false);
  const [clearConfirm, setClearConfirm] = useState<null | 'ai' | 'support'>(null);

  // Авторизация: getSession (локально) + при необходимости getUser с таймаутом — без вечного зависания без VPN
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const user = await resolveAuthUserForUi(supabase);
      if (!cancelled) setIsAuthenticated(!!user);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Синхронизируем ref с state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'include' };

  /** Не блокировать UI: session-status иногда долго отвечает или сбрасывается — иначе вечный спиннер */
  const refreshSessionStatus = async () => {
    if (mode !== 'support') return;
    try {
      const sessionResponse = await fetch(`/api/support/session-status`, fetchOpts);
      if (!sessionResponse.ok) return;
      const sessionData = await sessionResponse.json();
      if (sessionData.session) {
        if (sessionData.session.status === 'closed' || sessionData.session.status === 'archived') {
          setSessionStatus('closed');
        } else {
          setSessionStatus('active');
        }
      } else {
        const supabase = createClient();
        const user = await getUserFromSession(supabase);
        if (user) setSessionStatus(null);
      }
    } catch (error) {
      console.error('Ошибка проверки статуса сессии:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/support/messages?mode=${mode}`, fetchOpts);

      if (!response.ok) {
        // 401 — нет сессии на сервере (гость или cookies не дошли до API)
        if (response.status !== 401) {
          console.error('Ошибка загрузки сообщений:', response.status, response.statusText);
        }
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
    } finally {
      setLoading(false);
    }

    if (mode === 'support') {
      void refreshSessionStatus();
    }
  };

  // Сообщения и session-status требуют авторизации на сервере — не дергаем API до проверки
  useEffect(() => {
    if (isAuthenticated === null) return;

    if (!isAuthenticated) {
      setMessages([]);
      setSessionStatus(null);
      setLoading(false);
      return;
    }

    void loadMessages();
  }, [mode, isAuthenticated]);

  useEffect(() => {
    // Pusher используется ТОЛЬКО для режима поддержки (реальные операторы)
    // ИИ работает через OpenRouter API и не использует Pusher
    if (mode === 'ai') return;
    if (isAuthenticated !== true) return;

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
        disconnectPusherSafely(pusherRef.current, [channelRef.current]);
        channelRef.current = null;
        pusherRef.current = null;

        const supabase = createClient();
        const user = await getUserFromSession(supabase);
        const userId = user?.id;
        if (!userId) {
          isInitializingRef.current = false;
          return;
        }

        // Transports по умолчанию: WS, при блокировке — xhr long polling
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
        });

        pusherRef.current = pusher;

        const channelName = `support-chat-${userId}`;
        const channel = pusher.subscribe(channelName);
        channelRef.current = channel;

        channel.bind('pusher:subscription_succeeded', () => {
          console.log('[SupportChat] Pusher subscribed to channel:', channelName);
          isInitializingRef.current = false;
        });

        channel.bind('pusher:subscription_error', (status: unknown) => {
          console.error('[SupportChat] Pusher subscription_error:', channelName, status);
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
              if (data.message.is_support) {
                playNotificationSound('message');
              }
              return [...prev, data.message];
            });
          }
        });

        // Закрытие сессии: на сервере нет активной сессии — список сообщений пустой (см. GET /api/support/messages)
        channel.bind('session-closed', (data: { session: any }) => {
          if (data.session) {
            setSessionStatus('closed');
            setMessages([]);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('notifications:update'));
            }
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
      disconnectPusherSafely(pusherRef.current, [channelRef.current]);
      channelRef.current = null;
      pusherRef.current = null;
    };
  }, [mode, isAuthenticated]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      nearBottomRef.current = distance <= 120;
    };
    onScroll();
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (autoScrollNextRef.current || nearBottomRef.current) {
      autoScrollNextRef.current = false;
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    }
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
    const user = await resolveAuthUserForUi(supabase);
    if (!user) {
      toast.error('Для отправки сообщений необходимо войти в аккаунт');
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.error) {
          setSessionStatus('closed');
          toast.error(errorData.error);
        }
        console.error('Ошибка отправки сообщения:', response.status, response.statusText);
        return;
      }

      const text = await response.text();
      if (!text) {
        return;
      }

      const data = JSON.parse(text);
      if (data.success) {
        playNotificationSound('message');
        autoScrollNextRef.current = true;
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

  const requestClearChat = () => {
    if (mode === 'ai') setClearConfirm('ai');
    else if (mode === 'support') setClearConfirm('support');
  };

  const performClearChatConfirmed = async () => {
    const kind = clearConfirm;
    setClearConfirm(null);
    if (kind === 'ai') {
      try {
        const response = await fetch('/api/support/ai', {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          setMessages([]);
          toast.success('История чата с ИИ очищена');
        } else {
          toast.error('Не удалось очистить чат');
        }
      } catch (error) {
        console.error('Ошибка очистки чата:', error);
        toast.error('Не удалось очистить чат');
      }
      return;
    }

    if (kind === 'support') {
      try {
        const response = await fetch('/api/support/clear', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          setMessages([]);
          setSessionStatus('closed');
          toast.success('Чат очищён, сессия закрыта');
        } else {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error || 'Не удалось очистить чат');
        }
      } catch (error) {
        console.error('Ошибка очистки чата:', error);
        toast.error('Не удалось очистить чат');
      }
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
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Не удалось начать новую сессию');
        return;
      }

      // Устанавливаем статус как активный
      setSessionStatus('active');
      
      // Перезагружаем сообщения для новой сессии
      await loadMessages();
    } catch (error) {
      console.error('Ошибка создания новой сессии:', error);
      toast.error('Не удалось начать новую сессию');
    }
  };

  const isWidget = variant === 'widget';

  return (
    <>
    <div
      className={`flex flex-col bg-white border border-gray-200 shadow-2xl overflow-hidden ${
        isWidget
          ? [
              'fixed z-[51] inset-0 max-h-[min(100dvh,100svh)]',
              'sm:inset-auto sm:left-auto sm:top-auto',
              'sm:bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
              'sm:right-[max(0.75rem,env(safe-area-inset-right,0px))]',
              'sm:w-[min(92vw,292px)] md:w-[min(88vw,304px)] lg:w-[min(80vw,316px)]',
              'sm:h-[min(68dvh,396px)] md:h-[min(72dvh,424px)] lg:h-[min(76dvh,452px)]',
              'sm:min-h-[260px] sm:max-h-[min(calc(100dvh-4rem),560px)]',
              'sm:rounded-xl sm:max-w-[min(100vw-1rem,316px)]',
            ].join(' ')
          : 'w-full max-w-4xl mx-auto h-[calc(100vh-200px)] min-h-[600px] rounded-xl'
      }`}
      data-support-chat
    >
      {/* Заголовок */}
      <div
        className={`border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white flex-shrink-0 ${
          isWidget ? 'px-2.5 sm:px-3 py-2 sm:py-2.5' : 'px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4'
        }`}
      >
        {isWidget ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div
                className={`inline-flex items-center gap-1.5 min-w-0 rounded-full px-2.5 py-1 text-xs font-bold leading-tight ${
                  mode === 'ai'
                    ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-200/80'
                    : 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80'
                }`}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full animate-pulse ${mode === 'ai' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                />
                <span className="truncate">{mode === 'ai' ? 'Чат с ИИ' : 'Чат с поддержкой'}</span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {messages.length > 0 && (mode === 'ai' || (mode === 'support' && sessionStatus === 'active')) && (
                  <button
                    type="button"
                    onClick={requestClearChat}
                    className="rounded-lg p-1 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                    title={mode === 'support' ? 'Очистить чат и закрыть сессию' : 'Очистить чат'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {variant === 'widget' && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                    title="Закрыть чат"
                    aria-label="Закрыть чат"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => setMode('support')}
                className={`flex min-h-[36px] items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition-all sm:text-xs ${
                  mode === 'support'
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">Поддержка</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex min-h-[36px] items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition-all sm:text-xs ${
                  mode === 'ai'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200/80'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">ИИ</span>
              </button>
            </div>
            <p className="text-center text-[11px] font-medium leading-snug text-gray-600 sm:text-xs">
              {mode === 'ai' ? 'Вопросы об турах — ответ нейросети' : 'Операторы сервиса — напишите нам'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between sm:mb-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <div
                  className={`h-2 w-2 shrink-0 animate-pulse rounded-full sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 ${mode === 'ai' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                />
                <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg md:text-xl">
                  {mode === 'ai' ? 'ИИ помощник' : 'Чат поддержки'}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
                {messages.length > 0 && (mode === 'ai' || (mode === 'support' && sessionStatus === 'active')) && (
                  <button
                    type="button"
                    onClick={requestClearChat}
                    className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 sm:p-2 md:p-2.5"
                    title={mode === 'support' ? 'Очистить чат и закрыть сессию' : 'Очистить чат'}
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:h-6" />
                  </button>
                )}
                <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 sm:gap-1 md:gap-1.5 sm:p-1">
                  <button
                    type="button"
                    onClick={() => setMode('support')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all sm:gap-1.5 md:gap-2 sm:px-2.5 md:px-3 sm:py-1.5 md:py-2 sm:text-sm md:text-base ${
                      mode === 'support'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    <span className="hidden min-[375px]:inline">Поддержка</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all sm:gap-1.5 md:gap-2 sm:px-2.5 md:px-3 sm:py-1.5 md:py-2 sm:text-sm md:text-base ${
                      mode === 'ai'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    <span className="hidden min-[375px]:inline">ИИ</span>
                  </button>
                </div>
              </div>
            </div>
            <p className="ml-4 text-xs font-medium text-gray-700 sm:ml-5 sm:text-sm md:ml-6 md:text-base">
              {mode === 'ai' ? 'Задайте вопрос ИИ о турах' : 'Напишите нам, и мы поможем'}
            </p>
          </>
        )}
      </div>

      {/* Сообщения */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto chat-scroll bg-gray-50 min-h-0 ${
          isWidget ? 'p-2 space-y-2' : 'p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-2.5 md:space-y-3'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 animate-spin text-emerald-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-0">
            <div className={`text-center ${isWidget ? 'px-3 py-2' : 'px-4 sm:px-6'}`}>
              <MessageSquare
                className={`text-gray-300 mx-auto ${isWidget ? 'w-10 h-10 mb-2' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-3 sm:mb-4'}`}
              />
              <p className={`font-semibold text-gray-900 ${isWidget ? 'text-sm' : 'text-base sm:text-lg md:text-xl'}`}>
                Начните общение
              </p>
              <p
                className={`text-gray-700 font-medium ${isWidget ? 'text-[11px] mt-1.5 leading-snug' : 'text-xs sm:text-sm md:text-base mt-2 sm:mt-2.5'}`}
              >
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
                  className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg ${
                    msg.is_support
                      ? mode === 'ai' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-emerald-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <div className="text-sm sm:text-base md:text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.message}</div>
                  <div className={`text-xs sm:text-sm md:text-base mt-1.5 sm:mt-2 md:mt-2.5 font-medium ${msg.is_support ? mode === 'ai' ? 'text-blue-100' : 'text-emerald-100' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div />
          </>
        )}
      </div>

      {/* Уведомление о закрытии/удалении сессии */}
      {mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted') && (
        <div
          className={`border-t border-gray-200 flex-shrink-0 ${
            isWidget ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4 md:p-5'
          } ${sessionStatus === 'deleted' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
        >
          <div className={`flex flex-col ${isWidget ? 'gap-2' : 'gap-2 sm:gap-3 md:gap-4'}`}>
            <div className={`flex items-start gap-2 ${isWidget ? '' : 'sm:gap-3 md:gap-4'}`}>
              <div
                className={`rounded-full flex-shrink-0 mt-0.5 ${
                  isWidget ? 'w-2 h-2' : 'w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4'
                } ${sessionStatus === 'deleted' ? 'bg-red-500' : 'bg-yellow-500'}`}
              />
              <p
                className={`font-bold leading-snug ${
                  isWidget ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'
                } ${sessionStatus === 'deleted' ? 'text-red-800' : 'text-yellow-800'}`}
              >
                {sessionStatus === 'deleted'
                  ? 'Сессия поддержки удалена. Вы не можете отправлять сообщения.'
                  : 'Сессия поддержки закрыта. Вы не можете отправлять сообщения.'}
              </p>
            </div>
            <button
              onClick={startNewSession}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all duration-200 shadow-md hover:shadow-lg ${
                isWidget
                  ? 'py-2 px-3 text-xs sm:text-sm'
                  : 'sm:w-auto px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 sm:rounded-xl text-sm sm:text-base md:text-lg'
              }`}
            >
              Начать новую сессию
            </button>
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div
        className={`border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 flex-shrink-0 safe-area-inset-bottom ${
          isWidget ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4 md:p-5'
        }`}
      >
        {isAuthenticated === null ? (
          <div className="flex items-center justify-center gap-2 py-4 text-gray-600 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden />
            <span>Проверка входа…</span>
          </div>
        ) : isAuthenticated === false ? (
          <div className="text-center py-3 sm:py-4 px-4 sm:px-5 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <p className="text-sm sm:text-base md:text-lg text-yellow-800 font-semibold">
              Для отправки сообщений необходимо{' '}
              <a href="/auth" className="text-emerald-600 hover:underline font-bold">
                войти в аккаунт
              </a>
            </p>
          </div>
        ) : (
          <div className={`flex items-center ${isWidget ? 'gap-1.5' : 'gap-2 sm:gap-3 md:gap-4'}`}>
            <div className="flex-1 relative">
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
                  isAuthenticated !== true ||
                  (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
                }
                className={`w-full border-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none overflow-hidden shadow-sm ${
                  isWidget
                    ? 'px-3 py-2 pr-10 text-sm rounded-xl min-h-[44px] max-h-[112px]'
                    : 'px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 pr-12 sm:pr-14 md:pr-16 rounded-xl sm:rounded-2xl text-sm sm:text-base md:text-lg min-h-[52px] sm:min-h-[56px] md:min-h-[60px] max-h-[120px] sm:max-h-[140px] md:max-h-[160px]'
                } ${
                  isAuthenticated !== true || (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-600 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 hover:border-emerald-400 text-gray-900 placeholder:text-gray-500'
                }`}
                style={{
                  fontSize: 'clamp(14px, 1rem, 18px)',
                  color:
                    isAuthenticated !== true || (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
                      ? '#4b5563'
                      : '#111827',
                }}
              />
            </div>
            <ChatEmojiPicker
              disabled={
                isAuthenticated !== true ||
                (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
              }
              buttonClassName={`flex-shrink-0 inline-flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isWidget ? 'min-h-[44px] min-w-[44px]' : 'min-h-[52px] min-w-[52px] sm:min-h-[56px] sm:min-w-[56px]'
              }`}
              onEmojiSelect={(emoji) =>
                insertEmojiAtCursor(emoji, input, setInput, textareaRef)
              }
            />
            <button
              onClick={sendMessage}
              disabled={
                isAuthenticated !== true ||
                sending || 
                !input.trim() || 
                (mode === 'support' && (sessionStatus === 'closed' || sessionStatus === 'deleted'))
              }
              className={`flex-shrink-0 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:transform-none ${
                isWidget
                  ? 'min-h-[44px] px-3 rounded-xl gap-1.5 text-sm self-center'
                  : 'min-h-[52px] sm:min-h-[56px] md:min-h-[60px] px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl gap-2 sm:gap-2.5 md:gap-3 text-sm sm:text-base md:text-lg self-center'
              } ${
                mode === 'ai' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              }`}
            >
              {sending ? (
                <Loader2 className={`${isWidget ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7'} animate-spin text-white`} />
              ) : (
                <Send className={`${isWidget ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7'} text-white`} strokeWidth={2} />
              )}
              <span className={isWidget ? 'sr-only' : 'hidden sm:inline'}>Отправить</span>
            </button>
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog
      isOpen={clearConfirm !== null}
      title={
        clearConfirm === 'ai'
          ? 'Очистить историю чата с ИИ?'
          : 'Очистить чат с поддержкой?'
      }
      message={
        clearConfirm === 'ai'
          ? 'История переписки с ИИ будет удалена. Восстановить её будет нельзя.'
          : 'Сессия поддержки будет автоматически закрыта, переписка удалена. Вопрос будет считаться решённым.'
      }
      confirmText="Очистить"
      cancelText="Отмена"
      variant={clearConfirm === 'ai' ? 'warning' : 'emerald'}
      onConfirm={performClearChatConfirmed}
      onCancel={() => setClearConfirm(null)}
    />
    </>
  );
}
