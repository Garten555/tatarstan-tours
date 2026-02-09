'use client';

// Компонент чата в комнате тура с Pusher - полностью переделанный дизайн
import { useState, useEffect, useRef } from 'react';
import { TourRoomMessage } from '@/types';
import { Send, Trash2, Loader2, Wifi, WifiOff, Image as ImageIcon, X, Flag } from 'lucide-react';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';

interface TourRoomChatProps {
  roomId: string;
}

export function TourRoomChat({ roomId }: TourRoomChatProps) {
  const [messages, setMessages] = useState<TourRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
        // Добавляем новое сообщение в конец массива (внизу списка)
        const newMessages = [...prev, data.message];
        // НЕ прокручиваем автоматически - пользователь сам решит, нужно ли прокручивать
        return newMessages;
      });
    });

    channel.bind('message-deleted', (data: { messageId: string }) => {
      console.log('[TourRoomChat] Message deleted:', data.messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    // Очистка при размонтировании
    return () => {
      // Очистка канала
      if (channelRef.current) {
        try {
          channelRef.current.unbind_all();
          channelRef.current.unsubscribe();
        } catch (error) {
          // Игнорируем ошибки, если канал уже закрыт
        }
        channelRef.current = null;
      }
      
      // Очистка Pusher
      if (pusherRef.current) {
        try {
          // Проверяем состояние соединения перед отключением
          const state = pusherRef.current.connection?.state;
          if (state && state !== 'disconnected' && state !== 'disconnecting') {
            pusherRef.current.disconnect();
          }
        } catch (error) {
          // Игнорируем ошибки, если соединение уже закрыто
        }
        pusherRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

  // Проверяем, находится ли пользователь внизу чата
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkIfNearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsUserNearBottom(distanceFromBottom < 100); // 100px от низа считается "внизу"
    };

    container.addEventListener('scroll', checkIfNearBottom);
    checkIfNearBottom(); // Проверяем при монтировании

    return () => {
      container.removeEventListener('scroll', checkIfNearBottom);
    };
  }, []);

  // Убеждаемся, что при загрузке страницы мы остаемся сверху
  useEffect(() => {
    // При первой загрузке принудительно остаемся сверху
    if (isInitialLoad && !loading && messages.length > 0) {
      setIsInitialLoad(false);
      // Принудительно устанавливаем скролл наверх
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = 0;
        }
      }, 0);
      return;
    }
  }, [messages, loading, isInitialLoad]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setIsInitialLoad(true); // Помечаем как начальную загрузку
      const response = await fetch(`/api/tour-rooms/${roomId}/messages?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        // Переворачиваем массив, чтобы старые сообщения были сверху, новые внизу
        const messagesArray = data.messages || [];
        const reversedMessages = [...messagesArray].reverse();
        setMessages(reversedMessages);
        // Принудительно устанавливаем скролл наверх после загрузки
        setTimeout(() => {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = 0;
          }
        }, 0);
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
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData: any = {};
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch {
          // Игнорируем ошибки парсинга
        }
        const errorMessage = errorData.details || errorData.error || 'Не удалось отправить сообщение';
        console.error('[TourRoomChat] Message send error:', errorMessage);
        
        if (errorData.migration_required) {
          toast.error('Ошибка: Миграция базы данных не применена. Пожалуйста, примените миграцию 018 в Supabase.');
        } else {
          toast.error(`Ошибка отправки сообщения: ${errorMessage}`);
        }
        
        setNewMessage(messageText);
        if (imageUrl && selectedImage) {
          setSelectedImage({ file: selectedImage.file, preview: selectedImage.preview });
        }
        return;
      }
      
      const data = await response.json();
      console.log('[TourRoomChat] Message response data:', data);
      
      if (!data.success) {
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

  const reportMessage = async (messageId: string) => {
    try {
      const reason = prompt('Причина жалобы (необязательно):') || '';
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
    } catch (error: any) {
      toast.error(error.message || 'Не удалось отправить жалобу');
    }
  };

  const scrollToBottom = () => {
    // Функция для ручной прокрутки вниз (только по запросу пользователя)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Шапка чата с индикатором подключения */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Чат тура</h3>
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-200" />
                  <span className="text-xs text-emerald-100">Подключено</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-yellow-200" />
                  <span className="text-xs text-yellow-100">Подключение...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Область сообщений */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto chat-scroll bg-gradient-to-b from-gray-50 to-white p-6 space-y-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Загрузка сообщений...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-gray-900 font-semibold mb-1">Пока нет сообщений</h4>
              <p className="text-gray-500 text-sm">Начните общение первым!</p>
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
                className={`flex gap-3 group ${isMine ? 'flex-row-reverse' : ''}`}
              >
                {/* Аватар (только для чужих сообщений и если нужно показать) */}
                {!isMine && showAvatar ? (
                  <div className="flex-shrink-0">
                    {message.user?.avatar_url ? (
                      <img
                        src={message.user.avatar_url}
                        alt={getUserName(message)}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-md border-2 border-white">
                        {getUserInitials(message)}
                      </div>
                    )}
                  </div>
                ) : !isMine ? (
                  <div className="w-10 flex-shrink-0" />
                ) : null}

                {/* Сообщение */}
                <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && showAvatar && (
                    <span className="text-xs text-gray-600 mb-1 px-2 font-medium">
                      {escapeHtml(getUserName(message))}
                    </span>
                  )}
                  <div
                    className={`relative px-4 py-3 rounded-2xl shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
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
                      <p className={`whitespace-pre-wrap break-words ${isMine ? 'text-white' : 'text-gray-800'}`}>
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
                        onClick={() => reportMessage(message.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-1.5 shadow-lg"
                        title="Пожаловаться"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {showTime && (
                    <span className={`text-xs text-gray-400 mt-1 px-2 ${isMine ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Форма отправки - закреплена внизу */}
      <div className="border-t border-gray-200 bg-white p-4">
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
        
        <div className="flex items-end gap-3">
          {/* Кнопка загрузки фото */}
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            disabled={sending || !connected || uploadingImage}
            className="flex-shrink-0 w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Прикрепить фото"
          >
            {uploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={connected ? "Напишите сообщение..." : "Подключение к чату..."}
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-gray-50 text-gray-900 placeholder-gray-400"
              disabled={sending || !connected || uploadingImage}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            {!connected && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            type="button"
            disabled={(!newMessage.trim() && !selectedImage) || sending || !connected || uploadingImage}
            className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            title="Отправить сообщение"
          >
            {sending || uploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {!connected && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Ожидание подключения к серверу...
          </p>
        )}
      </div>
    </div>
  );
}
