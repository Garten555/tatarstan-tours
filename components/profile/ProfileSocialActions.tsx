'use client';

import { useEffect, useState } from 'react';
import { FollowButton } from './FollowButton';
import { FriendButton } from './FriendButton';
import { MessageButton } from './MessageButton';

interface ProfileSocialActionsProps {
  profileUsername: string;
  profileUserId: string;
  cleanUsername: string;
  canFollow: boolean;
  canAddFriend: boolean;
  isFollowing: boolean;
}

/**
 * Одна строка действий на чужом профиле: подписка скрыта, пока активен
 * входящий/исходящий запрос в друзья — чтобы не дублировать «Подписаться» с блоком дружбы.
 */
export function ProfileSocialActions({
  profileUsername,
  profileUserId,
  cleanUsername,
  canFollow,
  canAddFriend,
  isFollowing,
}: ProfileSocialActionsProps) {
  const [friendPending, setFriendPending] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/users/friends/status?user_id=${encodeURIComponent(profileUserId)}`
        );
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const pending = data.friendship?.status === 'pending';
        if (!cancelled) setFriendPending(!!pending);
      } catch {
        if (!cancelled) setFriendPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  const showFollow = canFollow && friendPending !== true;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      {canFollow && friendPending === null && (
        <div
          className="h-10 w-28 rounded-xl bg-gray-100 animate-pulse shrink-0"
          aria-hidden
        />
      )}
      {friendPending !== null && showFollow && (
        <FollowButton
          username={profileUsername}
          isFollowing={isFollowing}
          userId={profileUserId}
          compact
        />
      )}
      {canAddFriend && (
        <FriendButton userId={profileUserId} username={cleanUsername} compact />
      )}
      <MessageButton userId={profileUserId} username={cleanUsername} compact />
    </div>
  );
}
