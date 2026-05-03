'use client';

// Компонент чата в комнате тура с Pusher - полностью переделанный дизайн
import { useState, useEffect, useRef } from 'react';
import { TourRoomMessage } from '@/types';
import { Send, Trash2, Loader2, Wifi, WifiOff, Image as ImageIcon, X, Flag } from 'lucide-react';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';
import { playNotificationSound } from '@/lib/sound/notifications';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';
import { ChatEmojiPicker } from '@/components/chat/ChatEmojiPicker';
import { insertEmojiAtCursor } from '@/lib/chat/insert-emoji-at-cursor';
import ReportReasonModal from '@/components/common/ReportReasonModal';

interface TourRoomChatProps {
  roomId: string;
  /** default — карточка; embedded — тёмная панель; messenger — экран как в WhatsApp/Telegram */
  variant?: 'default' | 'embedded' | 'messenger';
}

export function TourRoomChat({ roomId, variant = 'default' }: TourRoomChatProps) {
  const embedded = variant === 'embedded';
  const messenger = variant === 'messenger';
  const [messages, setMessages] = useState<TourRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const nearBottomRef = useRef(true);
  const autoScrollNextRef = useRef(true);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportSending, setReportSending] = useState(false);

  // Получаем текущего пользователя
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, [supabase]);

  // Загружаем сообщения
  useEffect(() => {
    loadMessages();
  }, [roomId]);

  // Инициализация Pusher для real-time обновлений
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error('[TourRoomChat] Pusher credentials not configured');
      return;
    }

    // Инициализируем Pusher (без авторизации для публичных каналов)
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      enabledTransports: ['ws', 'wss'],
    });

    pusherRef.current = pusher;

    // Подключаемся к публичному каналу комнаты (доступ контролируется на уровне приложения)
    const channelName = `tour-room-${roomId}`;
    const channel = pusher.subscribe(channelName);

    channelRef.current = channel;

    // Обработчики событий Pusher
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('[TourRoomChat] Pusher subscribed to channel:', channelName);
      setConnected(true);
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('[TourRoomChat] Pusher subscription error:', error);
      console.error('[TourRoomChat] Error details:', JSON.stringify(error, null, 2));
      setConnected(false);
      
      // Показываем более информативное сообщение
      if (error.status === 401) {
        toast.error('Ошибка авторизации. Попробуйте обновить страницу.');
      } else if (error.status === 403) {
        toast.error('У вас нет доступа к этому каналу.');
      } else {
        toast.error('Ошибка подключения к чату. Проверьте консоль для деталей.');
      }
    });

    channel.bind('new-message', (data: { message: TourRoomMessage }) => {
      console.log('[TourRoomChat] New message received:', data.message);
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.message.id);
        if (exists) return prev;
        if (data.message.user_id !== currentUserId) {
          playNotificationSound('message');
        }
        if (nearBottomRef.current || data.message.user_id === currentUserId) {
          autoScrollNextRef.current = true;
        }
        return [...prev, data.message];
      });
    });

    channel.bind('message-deleted', (data: { messageId: string }) => {
      console.log('[TourRoomChat] Message deleted:', data.messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    // Очистка при размонтировании
    return () => {
      disconnectPusherSafely(pusherRef.current, [channelRef.current]);
      channelRef.current = null;
      pusherRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

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

  const loadMessages = async () => {
    try {
      setLoading(true);
      autoScrollNextRef.current = true;
      const response = await fetch(`/api/tour-rooms/${roomId}/messages?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notifications:update'));
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<{ url: string; path: string } | null> => {
    try {
      setUploadingImage(true);
      console.log('[TourRoomChat] Starting image upload:', { fileName: file.name, fileSize: file.size, fileType: file.type });
      const formData = new FormData();
      formData.append('file', file);

      // Используем отдельный endpoint для фото из сообщений (не сохраняет в галерею)
      const response = await fetch(`/api/tour-rooms/${roomId}/messages/upload-image`, {
        method: 'POST',
        body: formData,
      });

      console.log('[TourRoomChat] Upload response status:', response.status);
      const data = await response.json();
      console.log('[TourRoomChat] Upload response data:', data);
      
      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Ошибка загрузки изображения';
        console.error('[TourRoomChat] Upload failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      if (data.success && data.url && data.path) {
        console.log('[TourRoomChat] Upload successful');
        return {
          url: data.url,
          path: data.path,
        };
      } else {
        throw new Error(data.error || data.details || 'Ошибка загрузки изображения');
      }
    } catch (error: any) {
      console.error('[TourRoomChat] Image upload error:', error);
      const errorMessage = error?.message || 'Не удалось загрузить изображение. Проверьте консоль для деталей.';
      toast.error(errorMessage);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending || !connected || uploadingImage) return;

    try {
      setSending(true);
      const messageText = newMessage.trim();
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      // Загружаем изображение если есть
      if (selectedImage) {
        const imageResult = await uploadImage(selectedImage.file);
        if (imageResult) {
          imageUrl = imageResult.url;
          imagePath = imageResult.path;
        } else {
          setSending(false);
          return; // Не отправляем сообщение если не удалось загрузить фото
        }
      }

      setNewMessage('');
      setSelectedImage(null);
      
      console.log('[TourRoomChat] Sending message:', { roomId, hasMessage: !!messageText, hasImage: !!imageUrl });
      const response = await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          message: messageText || null,
          imageUrl,
          imagePath,
        }),
      });

      console.log('[TourRoomChat] Message response status:', response.status);
      const data = await response.json();
      console.log('[TourRoomChat] Message response data:', data);
      
      if (!response.ok || !data.success) {
        const errorMessage = data.details || data.error || 'Не удалось отправить сообщение';
        console.error('[TourRoomChat] Message send error:', errorMessage);
        
        // Показываем понятное сообщение об ошибке
        if (data.migration_required) {
          toast.error('Ошибка: Миграция базы данных не применена. Пожалуйста, примените миграцию 018 в Supabase.');
        } else {
          toast.error(`Ошибка отправки сообщения: ${errorMessage}`);
        }
        
        setNewMessage(messageText);
        if (imageUrl && selectedImage) {
          setSelectedImage({ file: selectedImage.file, preview: selectedImage.preview });
        }
      }
      playNotificationSound('message');
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      toast.error('Ошибка отправки сообщения');
      setNewMessage(newMessage.trim());
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Изображение слишком большое (максимум 10MB)');
      return;
    }

    // Создаем превью
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage({
        file,
        preview: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    
    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/messages/${messageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        toast.success('Сообщение удалено');
      } else {
        toast.error(data.error || 'Не удалось удалить сообщение');
      }
    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      toast.error('Ошибка удаления сообщения');
    }
  };

  const submitMessageReport = async (reason: string) => {
    if (!reportMessageId) return;
    const messageId = reportMessageId;
    try {
      setReportSending(true);
      const response = await fetch(`/api/tour-rooms/${roomId}/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить жалобу');
      }
      toast.success('Жалоба отправлена');
      setReportMessageId(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить жалобу');
    } finally {
      setReportSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (message: TourRoomMessage) => {
    return message.user_id === currentUserId;
  };

  const getUserName = (message: TourRoomMessage) => {
    if ((message.user as any)?.first_name && (message.user as any)?.last_name) {
      return `${(message.user as any).first_name} ${(message.user as any).last_name}`;
    }
    return message.user?.full_name || 'Пользователь';
  };

  const getUserInitials = (message: TourRoomMessage) => {
    const name = getUserName(message);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${
        messenger
          ? 'h-full min-h-0 flex-1 bg-transparent'
          : embedded
            ? 'h-full min-h-0 bg-transparent'
            : 'h-full min-h-0 rounded-xl bg-white shadow-lg'
      }`}
    >
      {!messenger && (
        <div
          className={`flex items-center justify-between px-4 py-3 sm:px-5 ${
            embedded
              ? 'border-b border-white/10 bg-gradient-to-r from-emerald-950/80 via-[#0a1412] to-teal-950/70'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                embedded ? 'bg-emerald-500/25 ring-1 ring-emerald-400/30' : 'bg-white/20'
              }`}
            >
              <Send className={`h-5 w-5 ${embedded ? 'text-emerald-200' : 'text-white'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Чат тура</h3>
              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <Wifi className={`h-3 w-3 ${embedded ? 'text-emerald-400' : 'text-emerald-200'}`} />
                    <span className={`text-xs ${embedded ? 'text-emerald-200/90' : 'text-emerald-100'}`}>
                      Онлайн
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className={`h-3 w-3 ${embedded ? 'text-amber-400' : 'text-yellow-200'}`} />
                    <span className={`text-xs ${embedded ? 'text-amber-100/90' : 'text-yellow-100'}`}>
                      Подключение…
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className={`chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto ${
          messenger
            ? 'px-3 py-3 sm:px-5'
            : embedded
              ? 'bg-[linear-gradient(180deg,#060908_0%,#0a100e_50%,#060908_100%)] p-4 sm:p-5'
              : 'bg-gradient-to-b from-gray-50 to-white p-4 sm:p-6'
        }`}
        style={
          messenger
            ? {
                backgroundColor: '#e9edef',
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.075) 1px, transparent 0)',
                backgroundSize: '18px 18px',
              }
            : undefined
        }
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2
                className={`mx-auto mb-2 h-8 w-8 animate-spin ${embedded ? 'text-emerald-400' : messenger ? 'text-emerald-600' : 'text-emerald-600'}`}
              />
              <p className={`text-sm ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
                Загрузка сообщений...
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center ${
                  embedded
                    ? 'rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30'
                    : 'rounded-full bg-white shadow-sm ring-1 ring-gray-200'
                }`}
              >
                <Send className={`h-8 w-8 ${embedded ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <h4 className={`mb-1 font-semibold ${embedded ? 'text-stone-100' : 'text-gray-800'}`}>
                Пока нет сообщений
              </h4>
              <p className={`text-sm ${embedded ? 'text-stone-500' : 'text-gray-600'}`}>
                Напишите первое сообщение группе
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMine = isMyMessage(message);
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
            const showTime = index === messages.length - 1 || 
              new Date(message.created_at).getTime() - new Date(messages[index + 1].created_at).getTime() > 300000; // 5 минут

            return (
              <div
                key={message.id}
                className={`group flex gap-2 sm:gap-3 ${isMine ? 'flex-row-reverse' : ''}`}
              >
                {/* Аватар (только для чужих сообщений и если нужно показать) */}
                {!isMine && showAvatar ? (
                  <div className="flex-shrink-0">
                    {message.user?.avatar_url ? (
                      <img
                        src={message.user.avatar_url}
                        alt={getUserName(message)}
                        className={`h-10 w-10 rounded-full border-2 object-cover shadow-md ${
                          messenger ? 'border-gray-200' : embedded ? 'border-white/15' : 'border-white'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white shadow-md ${
                          messenger ? 'border-gray-200' : embedded ? 'border-emerald-400/30' : 'border-white'
                        }`}
                      >
                        {getUserInitials(message)}
                      </div>
                    )}
                  </div>
                ) : !isMine ? (
                  <div className="w-10 flex-shrink-0" />
                ) : null}

                {/* Сообщение */}
                <div className={`flex max-w-[85%] flex-col sm:max-w-[78%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && showAvatar && (
                    <span
                      className={`mb-0.5 px-1 text-xs font-medium ${embedded ? 'text-stone-400' : 'text-gray-600'}`}
                    >
                      {escapeHtml(getUserName(message))}
                    </span>
                  )}
                  <div
                    className={`relative px-3 py-2 shadow-sm sm:px-3.5 sm:py-2.5 ${
                      messenger
                        ? isMine
                          ? 'rounded-lg rounded-br-sm bg-[#d9fdd3] text-gray-900'
                          : 'rounded-lg rounded-bl-sm border border-gray-200/80 bg-white text-gray-900'
                        : isMine
                          ? embedded
                            ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-1 ring-white/10'
                            : 'rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                          : embedded
                            ? 'rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] text-stone-100 ring-1 ring-white/5'
                            : 'rounded-2xl rounded-bl-md border border-gray-100 bg-white text-gray-900'
                    }`}
                  >
                    {/* Изображение */}
                    {message.image_url && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <img
                          src={message.image_url}
                          alt="Фото из чата"
                          className="max-w-full max-h-64 object-contain rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    {/* Текст сообщения */}
                    {message.message && (
                      <p
                        className={`whitespace-pre-wrap break-words text-[15px] leading-snug ${
                          messenger
                            ? 'text-gray-900'
                            : isMine
                              ? 'text-white'
                              : embedded
                                ? 'text-stone-100'
                                : 'text-gray-800'
                        }`}
                      >
                        {message.message.split('\n').map((line, i, arr) => (
                          <span key={i}>
                            {escapeHtml(line)}
                            {i < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    )}
                    
                    {/* Кнопка удаления (только для своих сообщений) */}
                    {isMine && (
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg"
                        title="Удалить сообщение"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {!isMine && (
                      <button
                        onClick={() => setReportMessageId(message.id)}
                        className={`absolute -right-2 -top-2 rounded-full p-1.5 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
                          messenger
                            ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            : embedded
                              ? 'bg-white/10 text-stone-300 hover:bg-white/20'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Пожаловаться"
                      >
                        <Flag className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {showTime && (
                    <span
                      className={`mt-0.5 px-1 text-[11px] ${messenger ? 'text-gray-500' : embedded ? 'text-stone-600' : 'text-gray-400'} ${isMine ? 'text-right' : 'text-left'}`}
                    >
                      {formatTime(message.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className={`shrink-0 border-t p-2 sm:p-3 ${
          messenger
            ? 'border-gray-300/80 bg-[#f0f2f5]'
            : embedded
              ? 'border-white/10 bg-[#0c1210]/95 backdrop-blur-md'
              : 'border-gray-200 bg-white'
        }`}
      >
        {/* Превью выбранного изображения */}
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <div className="relative">
              <img
                src={selectedImage.preview}
                alt="Превью"
                className="max-w-xs max-h-32 rounded-lg object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className={`flex items-end gap-2 ${messenger ? 'sm:gap-2' : 'gap-3'}`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            disabled={sending || !connected || uploadingImage}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              messenger
                ? 'rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50'
                : embedded
                  ? 'rounded-xl bg-white/10 text-stone-200 hover:bg-white/15'
                  : 'rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Прикрепить фото"
          >
            {uploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>
          <ChatEmojiPicker
            disabled={sending || !connected || uploadingImage}
            buttonClassName={
              messenger
                ? 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                : embedded
                  ? 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-stone-200 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50'
            }
            onEmojiSelect={(emoji) =>
              insertEmojiAtCursor(emoji, newMessage, setNewMessage, messageTextareaRef)
            }
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={messageTextareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={connected ? 'Сообщение' : 'Подключение…'}
              rows={1}
              className={`w-full resize-none border px-4 py-2.5 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                messenger
                  ? 'rounded-3xl border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm placeholder:text-gray-400'
                  : embedded
                    ? 'rounded-xl border-white/15 bg-white/[0.06] text-stone-100 placeholder:text-stone-500'
                    : 'rounded-xl border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400'
              }`}
              disabled={sending || !connected || uploadingImage}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            {!connected && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className={`h-4 w-4 animate-spin ${embedded ? 'text-stone-500' : 'text-gray-400'}`} />
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            type="button"
            disabled={(!newMessage.trim() && !selectedImage) || sending || !connected || uploadingImage}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              messenger
                ? 'rounded-full bg-emerald-600 shadow-sm hover:bg-emerald-700'
                : 'rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:scale-105 disabled:transform-none'
            }`}
            title="Отправить"
          >
            {sending || uploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" strokeWidth={2} />
            )}
          </button>
        </div>
        <div
          className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${
            messenger ? 'text-gray-500' : embedded ? 'text-amber-200/80' : 'text-amber-600'
          }`}
        >
          {!connected && (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Ожидание подключения…
            </span>
          )}
        </div>
      </div>

      <ReportReasonModal
        open={reportMessageId !== null}
        title="Жалоба на сообщение"
        subtitle="Расскажите, что не так (необязательно). Модераторы увидят жалобу вместе с сообщением."
        busy={reportSending}
        onCancel={() => {
          if (!reportSending) setReportMessageId(null);
        }}
        onSubmit={(reason) => void submitMessageReport(reason)}
      />
    </div>
  );
}
