'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { escapeHtml } from '@/lib/utils/sanitize';
import { createClient } from '@/lib/supabase/client';
import { Trash2, Flag, X, Check } from 'lucide-react';
import ImageViewerModal from '@/components/common/ImageViewerModal';
import { useDialog } from '@/hooks/useDialog';
import toast from 'react-hot-toast';

interface BlogPostFeedItemProps {
  post: {
    id: string;
    user_id?: string;
    title?: string;
    content?: string | null;
    slug: string;
    cover_image_url?: string | null;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
    created_at: string;
    published_at?: string | null;
    user?: {
      id: string;
      username?: string | null;
      avatar_url?: string | null;
    };
  };
  isOwner?: boolean; // Передаем информацию о владельце для быстрого отображения кнопки удаления
}

export default function BlogPostFeedItem({ post, isOwner = false }: BlogPostFeedItemProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentFormOpen, setCommentFormOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [postDeleted, setPostDeleted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { confirm, alert, prompt, DialogComponents } = useDialog();
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      // Отладочное логирование
      if (user) {
        const postUserId = post.user_id || post.user?.id;
        const isOwner = user.id === postUserId;
        console.log('User check:', {
          currentUserId: user.id,
          postUserId: postUserId,
          postUserIdDirect: post.user_id,
          postUserObjectId: post.user?.id,
          isOwner,
        });
      }
    };
    loadUser();
  }, [supabase, post]);

  const loadComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(`/api/blog/posts/${post.id}/comments`);
      const data = await response.json();
      if (data.success) {
        // API возвращает комментарии с replies, нам нужны только корневые
        const rootComments = (data.comments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          user: comment.user || {
            id: comment.user_id,
            username: null,
            first_name: null,
            avatar_url: null,
          },
          created_at: comment.created_at,
        }));
        setComments(rootComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  // Загружаем комментарии
  useEffect(() => {
    if (!postDeleted) {
      loadComments();
    }
  }, [postDeleted, loadComments]);

  // Заменяем обычные video на VideoPlayer с Plyr после рендера
  useEffect(() => {
    if (!post.content || !contentRef.current) return;

    const container = contentRef.current;
    const videoElements = container.querySelectorAll('video');
    
    videoElements.forEach((videoEl) => {
      // Проверяем, не заменен ли уже на VideoPlayer
      if (videoEl.closest('.plyr-container')) return;
      
      const source = videoEl.querySelector('source');
      const videoSrc = source?.getAttribute('src') || videoEl.getAttribute('src');
      if (!videoSrc) return;

      const videoType = source?.getAttribute('type') || undefined;
      
      // Создаем контейнер для VideoPlayer
      const wrapper = document.createElement('div');
      wrapper.className = 'my-4';
      
      // Создаем временный элемент для React компонента
      const tempDiv = document.createElement('div');
      wrapper.appendChild(tempDiv);
      
      // Заменяем video на wrapper
      videoEl.parentNode?.replaceChild(wrapper, videoEl);
      
      // Используем React для рендера VideoPlayer
      // Но так как мы не можем использовать React в useEffect напрямую,
      // создадим video элемент с классом plyr и инициализируем Plyr
      const newVideo = document.createElement('video');
      newVideo.className = 'plyr w-full rounded-xl';
      newVideo.setAttribute('playsinline', '');
      newVideo.setAttribute('controls', '');
      newVideo.setAttribute('preload', 'metadata');
      
      const sourceEl = document.createElement('source');
      sourceEl.src = videoSrc;
      if (videoType) {
        sourceEl.type = videoType;
      }
      newVideo.appendChild(sourceEl);
      
      wrapper.replaceChild(newVideo, tempDiv);
      
      // Инициализируем Plyr
      import('plyr').then((PlyrModule) => {
        const Plyr = PlyrModule.default;
        new Plyr(newVideo, {
          controls: [
            'play-large',
            'restart',
            'rewind',
            'play',
            'fast-forward',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'settings',
            'pip',
            'airplay',
            'fullscreen',
          ],
          settings: ['quality', 'speed'],
          speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
          },
          keyboard: {
            focused: true,
            global: false,
          },
          tooltips: {
            controls: true,
            seek: true,
          },
          i18n: {
            restart: 'Перезапустить',
            rewind: 'Перемотать назад',
            play: 'Воспроизвести',
            pause: 'Пауза',
            fastForward: 'Перемотать вперед',
            seek: 'Перейти',
            seekLabel: '{currentTime} из {duration}',
            played: 'Воспроизведено',
            buffered: 'Буферизовано',
            currentTime: 'Текущее время',
            duration: 'Длительность',
            volume: 'Громкость',
            mute: 'Отключить звук',
            unmute: 'Включить звук',
            enableCaptions: 'Включить субтитры',
            disableCaptions: 'Выключить субтитры',
            download: 'Скачать',
            enterFullscreen: 'Полноэкранный режим',
            exitFullscreen: 'Выйти из полноэкранного режима',
            frameTitle: 'Плеер для {title}',
            captions: 'Субтитры',
            settings: 'Настройки',
            pip: 'Картинка в картинке',
            menu: 'Меню',
            quality: 'Качество',
            loop: 'Зациклить',
            start: 'Начать',
            end: 'Конец',
            all: 'Все',
            reset: 'Сбросить',
            disabled: 'Отключено',
            enabled: 'Включено',
            advertisement: 'Реклама',
            qualityBadge: {
              2160: '4K',
              1440: 'HD',
              1080: 'HD',
              720: 'HD',
              576: 'SD',
              480: 'SD',
            },
          },
        });
      }).catch((err) => {
        console.error('Plyr init error:', err);
      });
    });
  }, [post.content]);

  const displayDate = post.published_at || post.created_at;
  const authorUsername = post.user?.username || post.user?.id;
  const postUrl = `/users/${authorUsername}/blog/${post.slug}`;

  // Если пост удален, не рендерим его (после всех хуков)
  if (postDeleted) {
    return null;
  }

  const handleTextareaInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = 'auto';
    const nextHeight = Math.min(target.scrollHeight, 220);
    target.style.height = `${nextHeight}px`;
  };

  const handleSubmitComment = async () => {
    const message = commentInput.trim();
    if (!message) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      const data = await response.json();
      if (response.status === 401) {
        await alert('Нужна авторизация, чтобы комментировать.', 'Требуется авторизация', 'warning');
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить комментарий');
      }

      // Добавляем новый комментарий в список
      const newComment = data.comment;
      if (newComment) {
        setComments((prev) => [
          ...prev,
          {
            id: newComment.id,
            content: newComment.content,
            user: newComment.user || {
              id: newComment.user_id,
              username: 'Вы',
              avatar_url: null,
            },
            created_at: newComment.created_at,
          },
        ]);
      }
      setCommentInput('');
      setCommentFormOpen(false);
    } catch (error: any) {
      await alert(error.message || 'Не удалось сохранить комментарий', 'Ошибка', 'error');
    } finally {
      setCommentLoading(false);
    }
  };

  // Извлекаем текст из контента для заголовка, если title нет или это "Новый пост"
  const getPostTitle = () => {
    if (post.title && post.title !== 'Новый пост' && post.title.trim().length > 0) {
      return post.title;
    }
    return null; // Не показываем заголовок, если его нет или это "Новый пост"
  };

  const postTitle = getPostTitle();

  return (
    <article className="bg-white rounded-2xl border-2 border-gray-100 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full mb-6">
      {/* Заголовок поста с автором - как в отзывах */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/users/${authorUsername}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (post.user?.avatar_url) {
                  setAvatarViewerOpen(true);
                }
              }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold overflow-hidden text-lg md:text-xl cursor-pointer hover:opacity-80 transition-opacity"
            >
              {post.user?.avatar_url ? (
                <Image
                  src={post.user.avatar_url}
                  alt={authorUsername || 'Пользователь'}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                (authorUsername || 'П').slice(0, 1).toUpperCase()
              )}
            </button>
            <div>
              <div className="font-semibold text-gray-900 text-base md:text-lg">
                {authorUsername || 'Пользователь'}
              </div>
              <div className="text-sm md:text-base text-gray-400 mt-1">
                {format(new Date(displayDate), 'd MMMM yyyy', { locale: ru })}
              </div>
            </div>
          </Link>
        </div>
        {(isOwner || (currentUser && (currentUser.id === post.user_id || currentUser.id === post.user?.id))) && (
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const confirmed = await confirm('Вы уверены, что хотите удалить этот пост?', 'Удаление поста');
              if (!confirmed) return;
              // Оптимистичное обновление - сразу скрываем пост
              setPostDeleted(true);
              
              try {
                const response = await fetch(`/api/blog/posts/${post.id}`, {
                  method: 'DELETE',
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || 'Не удалось удалить пост');
                }
                toast('Пост удален', {
                  icon: <Trash2 className="w-5 h-5 text-red-500" />,
                  duration: 3000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                });
                // Отправляем событие для обновления списка постов
                window.dispatchEvent(new CustomEvent('blog:post-deleted', { detail: { postId: post.id } }));
              } catch (error: any) {
                // Откатываем оптимистичное обновление при ошибке
                setPostDeleted(false);
                console.error('Error deleting post:', error);
                toast.error(error.message || 'Не удалось удалить пост');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-colors font-medium text-sm"
            title="Удалить пост"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Удалить</span>
          </button>
        )}
      </div>

      {/* Контент поста */}
      <div className="mt-6">
        {/* Заголовок только если есть и не "Новый пост" */}
        {postTitle && (
          <h3 className="font-bold text-xl sm:text-2xl md:text-3xl lg:text-3xl text-gray-900 mb-4 sm:mb-5 md:mb-6 leading-tight">
            {escapeHtml(postTitle)}
          </h3>
        )}
        
        {/* Основной контент */}
        {post.content && (
          <div 
            ref={contentRef}
            className="text-gray-700 whitespace-pre-line break-words text-base sm:text-lg md:text-xl lg:text-xl leading-relaxed sm:leading-relaxed md:leading-relaxed lg:leading-relaxed"
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        )}
        
        {/* Обложка если есть */}
        {post.cover_image_url && (
          <div className="mt-6 rounded-xl overflow-hidden border border-gray-100">
            <Image
              src={post.cover_image_url}
              alt={postTitle || 'Обложка поста'}
              width={1200}
              height={600}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
      </div>

      {/* Реакции - как в отзывах */}
      <div className="mt-8">
        <div className="flex items-center gap-6 text-base md:text-lg text-gray-500">
          <button
            type="button"
            className="inline-flex items-center gap-2 hover:text-emerald-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {post.likes_count || 0}
          </button>
          <button
            type="button"
            onClick={() => setCommentFormOpen(!commentFormOpen)}
            className="inline-flex items-center gap-2 hover:text-emerald-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {post.comments_count || comments.length || 0}
          </button>
        </div>
      </div>

      {/* Комментарии - как в отзывах */}
      <div className="mt-8">
        <div className="text-base md:text-lg text-gray-500 font-medium mb-4">Комментарии</div>
        {comments.length > 0 && (
          <div className="mt-4 space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-4 rounded-xl border border-white/70 bg-white/80 px-5 py-4"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold overflow-hidden text-sm md:text-base flex-shrink-0">
                  {comment.user?.avatar_url ? (
                    <Image
                      src={comment.user.avatar_url}
                      alt={comment.user?.username || comment.user?.first_name || 'Пользователь'}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    ((comment.user?.username || comment.user?.first_name || 'П').slice(0, 1).toUpperCase())
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm md:text-base text-gray-500">
                      {comment.user?.username || comment.user?.first_name || 'Пользователь'} •{' '}
                      {format(new Date(comment.created_at), 'd MMM yyyy', { locale: ru })}
                    </div>
                    <div className="flex items-center gap-2">
                      {(currentUser?.id === comment.user?.id || currentUser?.id === post.user?.id) && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await confirm('Вы уверены, что хотите удалить этот комментарий?', 'Удаление комментария');
                            if (!confirmed) return;
                            try {
                              const response = await fetch(`/api/blog/posts/${post.id}/comments/${comment.id}`, {
                                method: 'DELETE',
                              });
                              const data = await response.json();
                              if (!response.ok) {
                                throw new Error(data.error || 'Не удалось удалить комментарий');
                              }
                              setComments((prev) => prev.filter((c) => c.id !== comment.id));
                            } catch (error: any) {
                              await alert(error.message || 'Не удалось удалить комментарий', 'Ошибка', 'error');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Удалить комментарий"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {currentUser && currentUser.id !== comment.user?.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            const reason = await prompt('Причина жалобы (необязательно):', 'Жалоба на комментарий', 'Введите причину...', '') || '';
                            try {
                              const response = await fetch(`/api/blog/posts/${post.id}/comments/${comment.id}/report`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason }),
                              });
                              const data = await response.json();
                              if (response.status === 401) {
                                await alert('Нужна авторизация, чтобы пожаловаться.', 'Требуется авторизация', 'warning');
                                return;
                              }
                              if (!response.ok) {
                                throw new Error(data.error || 'Не удалось отправить жалобу');
                              }
                              await alert('Жалоба отправлена', 'Успешно', 'success');
                            } catch (error: any) {
                              await alert(error.message || 'Не удалось отправить жалобу', 'Ошибка', 'error');
                            }
                          }}
                          className="text-gray-400 hover:text-rose-600 p-1"
                          title="Пожаловаться"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm sm:text-base md:text-lg text-gray-900 mt-2 whitespace-pre-line break-words leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
                    {escapeHtml(comment.content || '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setCommentFormOpen(!commentFormOpen)}
            className="text-base md:text-lg text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            {commentFormOpen ? 'Скрыть форму' : 'Ответить'}
          </button>
        </div>

        {commentFormOpen && (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 md:p-8">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onInput={handleTextareaInput}
              onFocus={handleTextareaInput}
              rows={4}
              placeholder="Оставьте комментарий..."
              className="w-full rounded-2xl border border-emerald-200/70 bg-white px-5 py-4 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none overflow-hidden max-h-64"
            />
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={commentLoading || !commentInput.trim()}
                className="px-6 py-3 md:px-8 md:py-4 rounded-xl bg-emerald-600 text-white text-base md:text-lg font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {commentLoading ? 'Отправка...' : 'Отправить'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommentInput('');
                  setCommentFormOpen(false);
                }}
                className="px-6 py-3 md:px-8 md:py-4 rounded-xl border border-emerald-200 text-base md:text-lg text-emerald-700 hover:bg-emerald-50 font-semibold transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Просмотр аватара */}
      {post.user?.avatar_url && (
        <ImageViewerModal
          isOpen={avatarViewerOpen}
          images={[post.user.avatar_url]}
          title={`Аватар ${authorUsername || 'Пользователя'}`}
          onClose={() => setAvatarViewerOpen(false)}
        />
      )}

      {/* Диалоги */}
      {DialogComponents}
    </article>
  );
}

