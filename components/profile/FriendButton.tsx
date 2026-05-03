'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface FriendButtonProps {
  userId: string;
  username: string;
  compact?: boolean;
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'loading';

const btnBase =
  'font-bold transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
const btnLg = 'px-6 py-3 rounded-xl text-base [&_svg]:w-5 [&_svg]:h-5';
const btnSm = 'px-4 py-2 rounded-lg text-sm [&_svg]:w-4 [&_svg]:h-4';

export function FriendButton({ userId, username, compact }: FriendButtonProps) {
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [loading, setLoading] = useState(false);

  // Загружаем статус дружбы
  useEffect(() => {
    const loadFriendshipStatus = async () => {
      try {
        const response = await fetch(`/api/users/friends/status?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.friendship) {
            if (data.friendship.status === 'accepted') {
              setStatus('accepted');
            } else if (data.friendship.status === 'pending') {
              setStatus(data.friendship.requested_by_me ? 'pending_sent' : 'pending_received');
            } else {
              setStatus('none');
            }
          } else {
            setStatus('none');
          }
        } else {
          setStatus('none');
        }
      } catch (error) {
        console.error('Ошибка загрузки статуса дружбы:', error);
        setStatus('none');
      }
    };

    loadFriendshipStatus();
  }, [userId]);

  const handleAction = async (action: 'request' | 'accept' | 'reject' | 'remove') => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: userId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка выполнения действия');
      }

      // Обновляем статус
      if (action === 'request') {
        setStatus('pending_sent');
        toast.success('Запрос на дружбу отправлен');
      } else if (action === 'accept') {
        setStatus('accepted');
        toast.success('Запрос принят! Теперь вы друзья');
      } else if (action === 'reject' || action === 'remove') {
        setStatus('none');
        toast.success(action === 'reject' ? 'Запрос отклонен' : 'Удален из друзей');
      }
    } catch (error: any) {
      console.error('Ошибка действия с друзьями:', error);
      toast.error(error.message || 'Не удалось выполнить действие');
    } finally {
      setLoading(false);
    }
  };

  const b = compact ? btnSm : btnLg;

  if (status === 'loading') {
    return (
      <button
        disabled
        className={`${b} ${btnBase} bg-gray-200 text-gray-500 cursor-not-allowed`}
      >
        <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
        <span>Загрузка...</span>
      </button>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleAction('remove')}
          disabled={loading}
          className={`${b} ${btnBase} bg-red-600 hover:bg-red-700 text-white`}
        >
          {loading ? (
            <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
          ) : (
            <>
              <UserX />
              <span>{compact ? 'Удалить' : 'Удалить из друзей'}</span>
            </>
          )}
        </button>
        <div
          className={`${b} bg-emerald-100 text-emerald-700 font-bold flex items-center gap-2`}
        >
          <UserCheck />
          <span>Друзья</span>
        </div>
      </div>
    );
  }

  if (status === 'pending_sent') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className={`${b} ${btnBase} bg-gray-200 hover:bg-gray-300 text-gray-700`}
        >
          {loading ? (
            <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
          ) : (
            <>
              <UserX />
              <span>{compact ? 'Отменить' : 'Отменить запрос'}</span>
            </>
          )}
        </button>
        <div
          className={`${b} bg-yellow-100 text-yellow-700 font-bold flex items-center gap-2`}
        >
          <Clock />
          <span>{compact ? 'Ожидание' : 'Запрос отправлен'}</span>
        </div>
      </div>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleAction('accept')}
          disabled={loading}
          className={`${b} ${btnBase} bg-emerald-600 hover:bg-emerald-700 text-white`}
        >
          {loading ? (
            <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
          ) : (
            <>
              <UserCheck />
              <span>{compact ? 'Принять' : 'Принять запрос'}</span>
            </>
          )}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className={`${b} ${btnBase} bg-gray-200 hover:bg-gray-300 text-gray-700`}
        >
          {loading ? (
            <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
          ) : (
            <>
              <UserX />
              <span>Отклонить</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // status === 'none'
  return (
    <button
      onClick={() => handleAction('request')}
      disabled={loading}
      className={`${b} ${btnBase} bg-blue-600 hover:bg-blue-700 text-white`}
    >
      {loading ? (
        <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
      ) : (
        <>
          <UserPlus />
          <span>{compact ? 'В друзья' : 'Добавить в друзья'}</span>
        </>
      )}
    </button>
  );
}











