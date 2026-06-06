import { Metadata } from 'next';
import FriendsPage from '@/components/friends/FriendsPage';
import FriendsPageLayout from '@/components/friends/FriendsPageLayout';

export const metadata: Metadata = {
  title: 'Друзья | Туры по Татарстану',
  description: 'Управляйте своими друзьями и находите новых',
};

export default function FriendsRoutePage() {
  return (
    <FriendsPageLayout
      title="Друзья"
      subtitle="Управляйте своими друзьями, просматривайте запросы и находите новых друзей"
    >
      <FriendsPage />
    </FriendsPageLayout>
  );
}
