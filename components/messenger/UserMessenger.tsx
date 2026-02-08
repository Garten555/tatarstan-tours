'use client';

// Компонент мессенджера для приватных сообщений между пользователями
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Search, UserPlus, Settings, Loader2, Wifi, WifiOff, Image as ImageIcon, X, MessageSquare } from 'lucide-react';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string | null;
  image_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: {
    id: string;
    username: string | null;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
  };
  recipient: {
    id: string;
    username: string | null;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
  };
}

export default function UserMessenger() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const supabase = createClient();

  // Получаем текущего пользователя
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, [supabase]);

  // Загружаем список бесед
  useEffect(() => {
    loadConversations();
  }, []);

  // Открываем чат с пользователем из URL параметра
  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId && currentUserId && userId !== currentUserId) {
      // Ищем существующую беседу или создаем новую
      const existingConv = conversations.find(c => c.other_user.id === userId);
      if (existingConv) {
        setSelectedConversation(existingConv.other_user.id);
      } else {
        // Создаем новую беседу
        setSelectedConversation(userId);
      }
    }
  }, [searchParams, currentUserId, conversations]);

  // Загружаем сообщения при выборе беседы
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      initPusher(selectedConversation);
    } else {
      // Отключаемся от Pusher при закрытии беседы
      if (channelRef.current) {
        try {
          channelRef.current.unbind_all();
          channelRef.current.unsubscribe();
        } catch (error) {
          // Игнорируем ошибки, если канал уже закрыт
        }
        channelRef.current = null;
      }
      if (pusherRef.current) {
        try {
          const state = pusherRef.current.connection?.state;
          if (state && state !== 'disconnected' && state !== 'disconnecting') {
            pusherRef.current.disconnect();
          }
        } catch (error) {
          // Игнорируем ошибки, если соединение уже закрыто
        }
        pusherRef.current = null;
      }
      setConnected(false);
    }

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
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/messages');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setConversations(data.conversations || []);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки бесед:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/messages?with=${userId}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setMessages(data.messages || []);
            scrollToBottom();
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const initPusher = (userId: string) => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error('[UserMessenger] Pusher credentials not configured');
      return;
    }

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      enabledTransports: ['ws', 'wss'],
    });

    pusherRef.current = pusher;

    const channelName = `user-${currentUserId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('[UserMessenger] Pusher subscribed to channel:', channelName);
      setConnected(true);
    });

    channel.bind('new-message', (data: { message: Message }) => {
      if (data.message.sender_id === userId || data.message.recipient_id === userId) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
        loadConversations(); // Обновляем список бесед
      }
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'messages');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка загрузки изображения');
        }
        throw new Error('Ошибка загрузки изображения');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return {
          url: data.url,
          path: data.path,
        };
      }
      
      throw new Error('Неверный формат ответа');
    } catch (error: any) {
      console.error('Ошибка загрузки изображения:', error);
      toast.error(error.message || 'Не удалось загрузить изображение');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || sending || !selectedConversation || uploadingImage) return;

    try {
      setSending(true);
      const messageText = newMessage.trim();
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (selectedImage) {
        const imageResult = await uploadImage(selectedImage.file);
        if (imageResult) {
          imageUrl = imageResult.url;
          imagePath = imageResult.path;
        } else {
          setSending(false);
          return;
        }
      }

      setNewMessage('');
      setSelectedImage(null);

      const response = await fetch('/api/users/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: selectedConversation,
          message: messageText || null,
          image_url: imageUrl,
          image_path: imagePath,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Не удалось отправить сообщение');
        }
        throw new Error('Не удалось отправить сообщение');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        // Добавляем сообщение в список
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        loadConversations(); // Обновляем список бесед
      }
    } catch (error: any) {
      console.error('Ошибка отправки сообщения:', error);
      toast.error(error.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер изображения не должен превышать 10 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage({
        file,
        preview: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const isMyMessage = (message: Message) => {
    return message.sender_id === currentUserId;
  };

  const getUserName = (message: Message) => {
    if (isMyMessage(message)) {
      return message.recipient?.display_name || message.recipient?.username || 'Получатель';
    }
    return message.sender?.display_name || message.sender?.username || 'Отправитель';
  };

  const getUserInitials = (message: Message) => {
    const name = getUserName(message);
    if (message.sender?.first_name && message.sender?.last_name) {
      return `${message.sender.first_name[0]}${message.sender.last_name[0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getConversationName = (conv: Conversation) => {
    return conv.other_user.display_name || conv.other_user.username || 
           `${conv.other_user.first_name || ''} ${conv.other_user.last_name || ''}`.trim() || 'Пользователь';
  };

  const getConversationInitials = (conv: Conversation) => {
    if (conv.other_user.first_name && conv.other_user.last_name) {
      return `${conv.other_user.first_name[0]}${conv.other_user.last_name[0]}`.toUpperCase();
    }
    const name = getConversationName(conv);
    return name.slice(0, 2).toUpperCase();
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return !conv.is_archived;
    const searchLower = searchQuery.toLowerCase();
    const username = conv.other_user.username?.toLowerCase() || '';
    const displayName = conv.other_user.display_name?.toLowerCase() || '';
    const firstName = conv.other_user.first_name?.toLowerCase() || '';
    const lastName = conv.other_user.last_name?.toLowerCase() || '';
    return (
      username.includes(searchLower) ||
      displayName.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower)
    ) && !conv.is_archived;
  });

  const selectedConv = conversations.find((c) => c.other_user.id === selectedConversation);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-300px)] min-h-[600px] bg-white rounded-2xl border-2 border-gray-100 shadow-xl overflow-hidden">
      {/* Список бесед */}
      <div className="w-full lg:w-1/3 border-r-2 border-gray-100 flex flex-col bg-white">
        {/* Заголовок */}
        <div className="p-6 border-b-2 border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Сообщения</h2>
            <Link
              href="/friends"
              className="p-2.5 hover:bg-emerald-50 rounded-xl transition-colors group"
              title="Друзья"
            >
              <UserPlus className="w-6 h-6 text-gray-600 group-hover:text-emerald-600 transition-colors" />
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск бесед..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Список бесед */}
        <div className="flex-1 overflow-y-auto chat-scroll">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-200 rounded-full"></div>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-500">
                {searchQuery ? 'Беседы не найдены' : 'Пока нет бесед'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.other_user.id)}
                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-all text-left ${
                  selectedConversation === conv.other_user.id 
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-600' 
                    : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {conv.other_user.avatar_url ? (
                      <Image
                        src={conv.other_user.avatar_url}
                        alt={getConversationName(conv)}
                        width={56}
                        height={56}
                        className="rounded-xl object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg border-2 border-gray-100">
                        {getConversationInitials(conv)}
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-black border-2 border-white">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-gray-900 truncate mb-1">
                      {getConversationName(conv)}
                    </div>
                    <div className="text-sm text-gray-600 truncate font-medium">
                      {conv.last_message_text || 'Нет сообщений'}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Область чата */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Заголовок чата */}
            <div className="p-6 border-b-2 border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedConv?.other_user.avatar_url ? (
                    <Image
                      src={selectedConv.other_user.avatar_url}
                      alt={getConversationName(selectedConv)}
                      width={48}
                      height={48}
                      className="rounded-xl object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-base border-2 border-gray-100">
                      {selectedConv ? getConversationInitials(selectedConv) : 'П'}
                    </div>
                  )}
                  <div>
                    <div className="font-black text-xl text-gray-900">
                      {selectedConv ? getConversationName(selectedConv) : 'Пользователь'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                      {connected ? (
                        <>
                          <Wifi className="w-4 h-4 text-emerald-600" />
                          <span>В сети</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4 text-gray-400" />
                          <span>Подключение...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/users/${selectedConv?.other_user.username || selectedConv?.other_user.id}`}
                  className="text-base text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                >
                  Профиль
                </Link>
              </div>
            </div>

            {/* Сообщения */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto chat-scroll bg-gradient-to-b from-gray-50 to-white p-6 space-y-4"
            >
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                    <div className="absolute inset-0 w-12 h-12 border-4 border-emerald-200 rounded-full"></div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900 mb-2">Пока нет сообщений</h4>
                    <p className="text-lg text-gray-600 font-medium">Начните общение первым!</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMine = isMyMessage(message);
                  const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${isMine ? 'flex-row-reverse' : ''}`}
                    >
                      {!isMine && showAvatar ? (
                        <div className="flex-shrink-0">
                          {message.sender?.avatar_url ? (
                            <Image
                              src={message.sender.avatar_url}
                              alt={getUserName(message)}
                              width={48}
                              height={48}
                              className="rounded-xl object-cover border-2 border-gray-100"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-sm border-2 border-gray-100">
                              {getUserInitials(message)}
                            </div>
                          )}
                        </div>
                      ) : !isMine ? (
                        <div className="w-12 flex-shrink-0" />
                      ) : null}

                      <div className={`flex flex-col w-full ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`relative px-5 py-4 rounded-2xl shadow-sm min-w-0 ${
                            isMine
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md max-w-[75%]'
                              : 'bg-white text-gray-900 rounded-bl-md border-2 border-gray-100 max-w-[75%]'
                          }`}
                        >
                          {message.image_url && (
                            <div className="mb-3 rounded-xl overflow-hidden">
                              <img
                                src={message.image_url}
                                alt="Фото"
                                className="max-w-full max-h-80 object-contain rounded-xl"
                                loading="lazy"
                              />
                            </div>
                          )}
                          {message.message && (
                            <div className="whitespace-pre-wrap break-words text-base leading-relaxed">
                              {escapeHtml(message.message)}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs text-gray-500 mt-2 font-medium ${isMine ? 'text-right' : 'text-left'}`}>
                          {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="p-6 border-t-2 border-gray-100 bg-white">
              {selectedImage && (
                <div className="mb-4 relative inline-block">
                  <img
                    src={selectedImage.preview}
                    alt="Preview"
                    className="max-w-xs max-h-48 rounded-xl object-cover border-2 border-gray-200"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || sending}
                  className="p-3 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                  title="Прикрепить фото"
                >
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <ImageIcon className="w-6 h-6" />
                  )}
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Напишите сообщение..."
                  rows={1}
                  className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none max-h-32 text-base"
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage}
                  className="p-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  {sending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-12 h-12 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-3">Выберите беседу</h3>
              <p className="text-lg text-gray-600 font-medium">Выберите беседу из списка или начните новую</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
