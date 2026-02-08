import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SupportChat from '@/components/chat/SupportChat';

export const metadata = {
  title: 'Чат поддержки',
  description: 'Связь с поддержкой',
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/support');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SupportChat />
    </div>
  );
}
















