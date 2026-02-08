'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, User, Mail, Calendar, Ban, Loader2, Search, Filter, X, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Appeal {
  id: string;
  user_id: string;
  ban_reason: string | null;
  appeal_text: string;
  status: 'pending' | 'approved' | 'rejected' | 'reviewing';
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    is_banned: boolean | null;
    ban_reason: string | null;
    banned_at: string | null;
    ban_until: string | null;
  };
  reviewer: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface BanAppealsListProps {
  appeals: Appeal[];
  currentUserId: string;
}

export default function BanAppealsList({ appeals, currentUserId }: BanAppealsListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const handleReview = async (appealId: string, status: 'approved' | 'rejected', comment?: string) => {
    setProcessingId(appealId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/ban-appeals/${appealId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          review_comment: comment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить апелляцию');
      }

      setMessage({ type: 'success', text: `Апелляция ${status === 'approved' ? 'одобрена' : 'отклонена'}!` });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (appealId: string) => {
    setDeletingId(appealId);
    setMessage(null);
    setDeleteConfirmId(null);

    try {
      const response = await fetch(`/api/admin/ban-appeals/${appealId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить апелляцию');
      }

      setMessage({ type: 'success', text: 'Апелляция успешно удалена!' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setProcessingId(userId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unban',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось разбанить пользователя');
      }

      setMessage({ type: 'success', text: 'Пользователь успешно разбанен!' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Одобрена';
      case 'rejected':
        return 'Отклонена';
      case 'reviewing':
        return 'На рассмотрении';
      default:
        return 'Ожидает рассмотрения';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      case 'reviewing':
        return <Clock className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  // Фильтрация и сортировка
  const filteredAndSortedAppeals = useMemo(() => {
    let filtered = [...appeals];

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    // Поиск по имени или email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(a => {
        const fullName = `${a.user.first_name} ${a.user.last_name}`.toLowerCase();
        const email = a.user.email.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
    }

    // Сортировка
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const nameA = `${a.user.first_name} ${a.user.last_name}`.toLowerCase();
        const nameB = `${b.user.first_name} ${b.user.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB, 'ru');
      }
    });

    return filtered;
  }, [appeals, statusFilter, searchQuery, sortBy]);

  const pendingAppeals = filteredAndSortedAppeals.filter(a => a.status === 'pending');
  const otherAppeals = filteredAndSortedAppeals.filter(a => a.status !== 'pending');
  
  const totalFiltered = filteredAndSortedAppeals.length;
  const hasActiveFilters = statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Сообщение */}
      {message && (
        <div className={`p-3 sm:p-4 rounded-xl border-2 font-bold text-sm sm:text-base ${
          message.type === 'success'
            ? 'bg-green-100 text-green-900 border-green-300'
            : 'bg-red-100 text-red-900 border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Панель фильтров */}
      <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Поиск */}
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Поиск по имени или email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите имя или email..."
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm sm:text-base text-gray-900 placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Фильтр по статусу */}
          <div className="sm:w-48">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Статус
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm sm:text-base text-gray-900"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидают рассмотрения</option>
              <option value="reviewing">На рассмотрении</option>
              <option value="approved">Одобрены</option>
              <option value="rejected">Отклонены</option>
            </select>
          </div>

          {/* Сортировка */}
          <div className="sm:w-48">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Сортировка
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-sm sm:text-base text-gray-900"
            >
              <option value="date">По дате (новые)</option>
              <option value="name">По имени (А-Я)</option>
            </select>
          </div>
        </div>

        {/* Информация о результатах */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm sm:text-base font-semibold text-gray-700">
                Найдено: <span className="text-emerald-600 font-bold">{totalFiltered}</span> из {appeals.length} апелляций
              </p>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ожидающие рассмотрения */}
      {pendingAppeals.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-3 sm:mb-4">
            Ожидают рассмотрения ({pendingAppeals.length})
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {pendingAppeals.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                onReview={handleReview}
                onDelete={handleDelete}
                onUnban={handleUnban}
                processingId={processingId}
                deletingId={deletingId}
                deleteConfirmId={deleteConfirmId}
                onDeleteConfirm={(id) => setDeleteConfirmId(id)}
                onDeleteCancel={() => setDeleteConfirmId(null)}
                reviewComment={reviewComment[appeal.id] || ''}
                onCommentChange={(comment) => setReviewComment({ ...reviewComment, [appeal.id]: comment })}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Остальные апелляции */}
      {otherAppeals.length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-3 sm:mb-4">
            Обработанные апелляции ({otherAppeals.length})
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {otherAppeals.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                onReview={handleReview}
                onDelete={handleDelete}
                onUnban={handleUnban}
                processingId={processingId}
                deletingId={deletingId}
                deleteConfirmId={deleteConfirmId}
                onDeleteConfirm={(id) => setDeleteConfirmId(id)}
                onDeleteCancel={() => setDeleteConfirmId(null)}
                reviewComment={reviewComment[appeal.id] || ''}
                onCommentChange={(comment) => setReviewComment({ ...reviewComment, [appeal.id]: comment })}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>
      )}

      {filteredAndSortedAppeals.length === 0 && appeals.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 p-8 sm:p-12 text-center">
          <Filter className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg sm:text-xl font-black text-gray-900">Нет результатов</p>
          <p className="text-sm sm:text-base text-gray-700 mt-2 font-medium">
            Попробуйте изменить параметры фильтрации
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 text-sm font-bold text-emerald-700 border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all"
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {appeals.length === 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 p-8 sm:p-12 text-center">
          <Ban className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg sm:text-xl font-black text-gray-900">Нет апелляций</p>
          <p className="text-sm sm:text-base text-gray-700 mt-2 font-medium">Пока нет апелляций на рассмотрение</p>
        </div>
      )}
    </div>
  );
}

function AppealCard({
  appeal,
  onReview,
  onDelete,
  onUnban,
  processingId,
  deletingId,
  deleteConfirmId,
  onDeleteConfirm,
  onDeleteCancel,
  reviewComment,
  onCommentChange,
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
}: {
  appeal: Appeal;
  onReview: (id: string, status: 'approved' | 'rejected', comment?: string) => void;
  onDelete: (id: string) => void;
  onUnban: (userId: string) => void;
  processingId: string | null;
  deletingId: string | null;
  deleteConfirmId: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  reviewComment: string;
  onCommentChange: (comment: string) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactElement;
}) {

  const isProcessing = processingId === appeal.id || processingId === appeal.user_id;
  const isDeleting = deletingId === appeal.id;
  const showDeleteConfirm = deleteConfirmId === appeal.id;
  const canReview = appeal.status === 'pending';
  const isUserBanned = appeal.user.is_banned === true;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black text-base sm:text-lg overflow-hidden border-2 border-emerald-200 flex-shrink-0">
            {appeal.user.avatar_url ? (
              <img src={appeal.user.avatar_url} alt={`${appeal.user.first_name} ${appeal.user.last_name}`} className="w-full h-full object-cover" />
            ) : (
              `${appeal.user.first_name?.[0] || ''}${appeal.user.last_name?.[0] || ''}`.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-2">
              <h3 className="text-lg sm:text-xl font-black text-gray-900 break-words">
                {appeal.user.first_name} {appeal.user.last_name}
              </h3>
              <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-bold border-2 ${getStatusColor(appeal.status)} self-start sm:self-auto`}>
                <span className="flex items-center gap-1.5">
                  {getStatusIcon(appeal.status)}
                  <span className="whitespace-nowrap">{getStatusLabel(appeal.status)}</span>
                </span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-base text-gray-900">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0" />
                <span className="font-bold break-all">{appeal.user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0" />
                <span className="font-bold whitespace-nowrap">{new Date(appeal.created_at).toLocaleString('ru-RU')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
          <Link
            href={`/profile?id=${appeal.user.id}`}
            className="px-3 sm:px-4 py-2 border-2 border-emerald-200 rounded-lg sm:rounded-xl text-emerald-700 hover:bg-emerald-50 transition-all font-bold text-xs sm:text-sm whitespace-nowrap"
          >
            Профиль
          </Link>
          <button
            onClick={() => onDeleteConfirm(appeal.id)}
            disabled={isProcessing || isDeleting}
            className="px-3 sm:px-4 py-2 border-2 border-red-200 rounded-lg sm:rounded-xl text-red-700 hover:bg-red-50 transition-all font-bold text-xs sm:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Удалить</span>
          </button>
        </div>
      </div>

      {/* Подтверждение удаления */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <p className="text-base sm:text-lg font-black text-red-900 mb-3">
            Вы уверены, что хотите удалить эту апелляцию?
          </p>
          <p className="text-sm sm:text-base text-red-800 mb-4 font-bold">
            Это действие нельзя отменить. Апелляция будет безвозвратно удалена.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => onDelete(appeal.id)}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Удаление...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Да, удалить</span>
                </>
              )}
            </button>
            <button
              onClick={onDeleteCancel}
              disabled={isDeleting}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-bold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Причина бана */}
      {appeal.ban_reason && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <p className="text-base sm:text-lg font-black text-red-900 mb-3">Причина бана:</p>
          <p className="text-base sm:text-lg text-red-900 font-bold leading-relaxed break-words">{appeal.ban_reason}</p>
        </div>
      )}

      {/* Текст апелляции */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
        <p className="text-base sm:text-lg font-black text-gray-900 mb-3 sm:mb-4">Текст апелляции:</p>
        <p className="text-base sm:text-lg text-gray-900 leading-relaxed whitespace-pre-wrap font-bold break-words">{appeal.appeal_text}</p>
      </div>

      {/* Комментарий модератора */}
      {appeal.review_comment && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <p className="text-base sm:text-lg font-black text-blue-900 mb-3">Комментарий модератора:</p>
          <p className="text-base sm:text-lg text-blue-900 font-bold leading-relaxed break-words">{appeal.review_comment}</p>
          {appeal.reviewer && (
            <p className="text-sm sm:text-base text-blue-800 mt-3 sm:mt-4 font-bold">
              Рассмотрено: {appeal.reviewer.first_name} {appeal.reviewer.last_name} ({new Date(appeal.reviewed_at!).toLocaleString('ru-RU')})
            </p>
          )}
        </div>
      )}

      {/* Кнопка разбана (если пользователь забанен) */}
      {isUserBanned && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg sm:rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-base sm:text-lg font-black text-yellow-900 mb-2">
                Пользователь заблокирован
              </p>
              <p className="text-sm sm:text-base text-yellow-800 font-bold">
                Вы можете разбанить пользователя независимо от статуса апелляции
              </p>
            </div>
            <button
              onClick={() => onUnban(appeal.user.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2 border-2 border-green-500 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed !text-white"
              style={{ color: 'white' }}
            >
              {isProcessing && processingId === appeal.user_id ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'white' }} />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" style={{ color: 'white' }} />
                  <span style={{ color: 'white' }}>Разбанить</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Действия (только для pending) */}
      {canReview && (
        <div className="border-t-2 border-gray-200 pt-4 sm:pt-5 space-y-4 sm:space-y-5">
          <div>
            <label className="block text-base sm:text-lg font-black text-gray-900 mb-3">
              Комментарий (необязательно)
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Добавьте комментарий к решению..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-base sm:text-lg text-gray-900 resize-none placeholder:text-gray-500 leading-relaxed"
              rows={4}
              disabled={isProcessing}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => onReview(appeal.id, 'approved', reviewComment || undefined)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                  <span className="text-white font-bold">Одобрить</span>
                </>
              )}
            </button>
            <button
              onClick={() => onReview(appeal.id, 'rejected', reviewComment || undefined)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                  <span className="text-white font-bold">Отклонить</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

