import SupportChatAdmin from '@/components/admin/SupportChatAdmin';

export const metadata = {
  title: 'Чат поддержки - Админ панель',
  description: 'Управление чатами поддержки',
};

export default function AdminChatPage() {
  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Чат поддержки</h1>
        <p className="mt-2 text-gray-600">
          Управление сессиями поддержки и общение с пользователями
        </p>
      </div>

      {/* Компонент чата */}
      <SupportChatAdmin />
    </div>
  );
}
