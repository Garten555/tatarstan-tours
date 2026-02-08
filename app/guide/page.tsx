// Редирект на единую админ-панель
import { redirect } from 'next/navigation';

export default function GuidePanel() {
  redirect('/admin');
}
