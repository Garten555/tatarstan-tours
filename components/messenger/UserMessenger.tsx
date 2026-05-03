'use client';

// Компонент мессенджера для приватных сообщений между пользователями
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Search,
  UserPlus,
  Loader2,
  WifiOff,
  Image as ImageIcon,
  X,
  MessageSquare,
  Check,
  CheckCheck,
  Eraser,
} from 'lucide-react';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';
import { resolveAuthUserForUi } from '@/lib/supabase/auth-quick-client';
import { escapeHtml } from '@/lib/utils/sanitize';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { playNotificationSound } from '@/lib/sound/notifications';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';
import { ChatEmojiPicker } from '@/components/chat/ChatEmojiPicker';
import { insertEmojiAtCursor } from '@/lib/chat/insert-emoji-at-cursor';
import { formatLastSeen, type PresenceStatus } from '@/lib/utils/presence';
import { postFormDataJsonWithProgress } from '@/lib/upload/post-form-data-xhr';
import ImageViewerModal from '@/components/common/ImageViewerModal';

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

function appendDmMessageDeduped(prev: Message[], incoming: Message): Message[] {
  const id = String(incoming.id);
  if (prev.some((m) => String(m.id) === id)) return prev;
  return [...prev, incoming];
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
  /** Подписка Pusher на канал текущего пользователя (ваше соединение с сервером чата, не статус собеседника). */
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [peerPresence, setPeerPresence] = useState<PresenceStatus | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const [imageViewer, setImageViewer] = useState<{ urls: string[]; index: number } | null>(null);
  const [clearingThread, setClearingThread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const nearBottomRef = useRef(true);
  const autoScrollNextRef = useRef(true);
  /** Пока открыт чат с peer — входящие по Pusher помечаем прочитанными на сервере (GET ?with=), не только при первом открытии */
  const markThreadReadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const fetchPeerPresence = useCallback(async (otherUserId: string) => {
    try {
      const res = await fetch('/api/users/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: [otherUserId] }),
      });
      const data = await res.json();
      if (data.success && data.activityByUserId && otherUserId in data.activityByUserId) {
        setPeerPresence(formatLastSeen(data.activityByUserId[otherUserId]));
      } else {
        setPeerPresence(formatLastSeen(null));
      }
    } catch {
      setPeerPresence(formatLastSeen(null));
    }
  }, []);

  // Получаем текущего пользователя
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await resolveAuthUserForUi(supabase);
      setCurrentUserId(user?.id || null);
    };
    void getCurrentUser();
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

  useEffect(() => {
    if (!selectedConversation) {
      setPeerPresence(null);
      return;
    }
    void fetchPeerPresence(selectedConversation);
    const t = window.setInterval(() => fetchPeerPresence(selectedConversation), 60_000);
    return () => clearInterval(t);
  }, [selectedConversation, fetchPeerPresence]);

  // Загружаем сообщения при выборе беседы (не ждём currentUserId — API по cookie)
  useEffect(() => {
    if (selectedConversation) {
      autoScrollNextRef.current = true;
      void loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Pusher только после известного id пользователя — иначе канал `user-null` и realtime молчит
  useEffect(() => {
    if (!selectedConversation || !currentUserId) {
      disconnectPusherSafely(pusherRef.current, [channelRef.current]);
      channelRef.current = null;
      pusherRef.current = null;
      setRealtimeConnected(false);
      return;
    }

    initPusher(selectedConversation, currentUserId);

    return () => {
      if (markThreadReadDebounceRef.current) {
        clearTimeout(markThreadReadDebounceRef.current);
        markThreadReadDebounceRef.current = null;
      }
      disconnectPusherSafely(pusherRef.current, [channelRef.current]);
      channelRef.current = null;
      pusherRef.current = null;
    };
  }, [selectedConversation, currentUserId]);

  const loadConversations = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      const response = await fetch('/api/users/messages');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setConversations(data.conversations || []);
            window.dispatchEvent(new CustomEvent('messages:update'));
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки бесед:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMessages = async (userId: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/users/messages?with=${userId}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setMessages(data.messages || []);
            autoScrollNextRef.current = true;
            window.dispatchEvent(new CustomEvent('messages:update'));
            window.dispatchEvent(new Event('notifications:update'));
            void fetchPeerPresence(userId);
            void loadConversations({ silent: true });
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const initPusher = (peerUserId: string, myUserId: string) => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      console.error('[UserMessenger] Pusher credentials not configured');
      return;
    }

    disconnectPusherSafely(pusherRef.current, [channelRef.current]);
    channelRef.current = null;
    pusherRef.current = null;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    });

    pusherRef.current = pusher;

    const channelName = `user-${myUserId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('[UserMessenger] Pusher subscribed to channel:', channelName);
      setRealtimeConnected(true);
    });

    channel.bind('new-message', (data: { message: Message }) => {
      if (data.message.sender_id === peerUserId || data.message.recipient_id === peerUserId) {
        setMessages((prev) => appendDmMessageDeduped(prev, data.message));
        const isMine = data.message.sender_id === myUserId;
        if (isMine || nearBottomRef.current) {
          autoScrollNextRef.current = true;
        }
        if (!isMine) {
          // Уже в этом диалоге — не дублируем звук «как извне»; синхронизируем прочитанное на сервере и бейдж в списке
          if (markThreadReadDebounceRef.current) clearTimeout(markThreadReadDebounceRef.current);
          markThreadReadDebounceRef.current = setTimeout(() => {
            markThreadReadDebounceRef.current = null;
            void loadMessages(peerUserId, { silent: true });
          }, 120);
        } else {
          void loadConversations({ silent: true });
        }
      }
    });

    channel.bind('dm-thread-cleared', (data: { peer_id: string }) => {
      if (data.peer_id === peerUserId) {
        setMessages([]);
        void loadConversations({ silent: true });
        window.dispatchEvent(new Event('notifications:update'));
      }
    });
  };

  useEffect(() => {
    if (!selectedConversation) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      nearBottomRef.current = distance <= 120;
    };
    onScroll();
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [selectedConversation]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  };

  useEffect(() => {
    if (!messages.length) return;
    if (autoScrollNextRef.current || nearBottomRef.current) {
      autoScrollNextRef.current = false;
      scrollToBottom();
    }
  }, [messages]);

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'messages');

      const data = await postFormDataJsonWithProgress<{ url?: string; path?: string; error?: string }>(
        '/api/upload',
        formData,
        (p) => setUploadProgress(p)
      );

      if (data.url && data.path) {
        return { url: data.url, path: data.path };
      }
      throw new Error(data.error || 'Ошибка загрузки изображения');
    } catch (error: any) {
      console.error('Ошибка загрузки изображения:', error);
      toast.error(error.message || 'Не удалось загрузить изображение');
      return null;
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const messageImageUrls = messages.map((m) => m.image_url).filter((u): u is string => !!u);

  const openImageViewer = (url: string) => {
    const urls = messageImageUrls.length ? messageImageUrls : [url];
    const index = Math.max(0, urls.indexOf(url));
    setImageViewer({ urls, index });
  };

  const clearThreadWithPeer = async () => {
    if (!selectedConversation) return;
    const ok = window.confirm(
      'Удалить всю переписку с этим человеком у вас и у него? Сообщения исчезнут у обоих, восстановить нельзя.'
    );
    if (!ok) return;
    try {
      setClearingThread(true);
      const res = await fetch('/api/users/messages/clear-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peer_id: selectedConversation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Не удалось очистить чат');
      }
      setMessages([]);
      void loadConversations({ silent: true });
      window.dispatchEvent(new Event('notifications:update'));
      toast.success('Переписка очищена');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setClearingThread(false);
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
        setMessages((prev) => appendDmMessageDeduped(prev, data.message));
        playNotificationSound('message');
        autoScrollNextRef.current = true;
        void loadConversations({ silent: true });
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
    <>
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
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {!realtimeConnected ? (
                        <>
                          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-amber-700">Подключение к чату...</span>
                        </>
                      ) : peerPresence ? (
                        <span
                          className={`inline-flex items-center gap-2 ${
                            peerPresence.online ? 'text-emerald-700' : 'text-gray-500'
                          }`}
                        >
                          {peerPresence.online ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                              aria-hidden
                            />
                          ) : null}
                          {peerPresence.label}
                        </span>
                      ) : (
                        <span className="text-gray-400">Загрузка...</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void clearThreadWithPeer()}
                    disabled={clearingThread || !messages.length}
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Удалить всю переписку у вас и у собеседника"
                  >
                    {clearingThread ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eraser className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Очистить</span>
                  </button>
                  <Link
                    href={`/users/${selectedConv?.other_user.username || selectedConv?.other_user.id}`}
                    className="text-base text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
                  >
                    Профиль
                  </Link>
                </div>
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
                            <button
                              type="button"
                              className="mb-3 block w-full overflow-hidden rounded-xl text-left outline-none ring-emerald-400/50 focus-visible:ring-2"
                              onClick={() => openImageViewer(message.image_url!)}
                              title="Открыть фото"
                            >
                              <img
                                src={message.image_url}
                                alt="Фото"
                                className="max-h-80 w-full max-w-full cursor-zoom-in object-contain rounded-xl"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {message.message && (
                            <div className="whitespace-pre-wrap break-words text-base leading-relaxed">
                              {escapeHtml(message.message)}
                            </div>
                          )}
                        </div>
                        <div
                          className={`mt-2 flex items-center gap-1 text-xs font-medium text-gray-500 ${
                            isMine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {isMine ? (
                            <span
                              className="inline-flex shrink-0 text-white/80"
                              title={message.is_read ? 'Прочитано' : 'Доставлено'}
                              aria-label={message.is_read ? 'Прочитано' : 'Доставлено'}
                            >
                              {message.is_read ? (
                                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                              ) : (
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div />
            </div>

            {/* Поле ввода */}
            <div className="p-6 border-t-2 border-gray-100 bg-white">
              {selectedImage && (
                <div className="mb-4 relative inline-block max-w-xs">
                  <img
                    src={selectedImage.preview}
                    alt="Preview"
                    className="max-h-48 w-full rounded-xl border-2 border-gray-200 object-cover"
                  />
                  {uploadingImage ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-[width] duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  ) : null}
                  <button
                    onClick={() => setSelectedImage(null)}
                    disabled={uploadingImage}
                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
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
                <ChatEmojiPicker
                  disabled={uploadingImage || sending}
                  buttonClassName="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  onEmojiSelect={(emoji) =>
                    insertEmojiAtCursor(emoji, newMessage, setNewMessage, messageTextareaRef)
                  }
                />
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
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <Send className="w-6 h-6 text-white" strokeWidth={2} />
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
    <ImageViewerModal
      isOpen={imageViewer !== null}
      images={imageViewer?.urls ?? []}
      initialIndex={imageViewer?.index ?? 0}
      title="Фото в чате"
      onClose={() => setImageViewer(null)}
    />
    </>
  );
}
