import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Блог путешествий - Tatarstan Tours',
  description: 'Читайте интересные истории о путешествиях по Татарстану',
};

export default async function BlogPage() {
  // Редирект на главную страницу, так как блог теперь часть туристического паспорта
  redirect('/');
}

