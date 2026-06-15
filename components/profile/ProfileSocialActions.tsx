'use client';

import { FriendButton } from './FriendButton';
import { MessageButton } from './MessageButton';

interface ProfileSocialActionsProps {
  profileUserId: string;
  cleanUsername: string;
  canAddFriend: boolean;
}

/**
 * Действия на чужом профиле: заявка в друзья (вместо отдельной подписки) и сообщение.
 */
export function ProfileSocialActions({
  profileUserId,
  cleanUsername,
  canAddFriend,
}: ProfileSocialActionsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      {canAddFriend && (
        <FriendButton userId={profileUserId} username={cleanUsername} compact />
      )}
      <MessageButton userId={profileUserId} username={cleanUsername} compact />
    </div>
  );
}
