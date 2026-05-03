import { Suspense } from 'react';
import SetUsernameClient from './SetUsernameClient';

export const metadata = {
  title: 'Выберите ник — туристический дневник',
  description: 'Уникальный адрес вашего профиля и дневника',
};

function Fallback() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 text-sm font-medium">Загрузка...</p>
    </div>
  );
}

export default function SetUsernamePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SetUsernameClient />
    </Suspense>
  );
}
