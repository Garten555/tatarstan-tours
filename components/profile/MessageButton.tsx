'use client';

import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface MessageButtonProps {
  userId: string;
  username: string;
}

export function MessageButton({ userId, username }: MessageButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMessage = async () => {
    try {
      setLoading(true);
      
      // Проверяем, можем ли мы писать этому пользователю
      const response = await fetch(`/api/users/messages/can-message?user_id=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось проверить возможность отправки сообщения');
      }

      if (!data.canMessage) {
        toast.error(data.reason || 'Вы не можете отправить сообщение этому пользователю');
        return;
      }

      // Переходим в мессенджер с открытием чата с этим пользователем
      router.push(`/messenger?user=${userId}`);
    } catch (error: any) {
      console.error('Ошибка открытия сообщения:', error);
      toast.error(error.message || 'Не удалось открыть сообщение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMessage}
      disabled={loading}
      className="px-6 py-3 rounded-xl font-bold text-base bg-purple-600 hover:bg-purple-700 text-white !text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <MessageSquare className="w-5 h-5" />
          <span>Написать сообщение</span>
        </>
      )}
    </button>
  );
}

