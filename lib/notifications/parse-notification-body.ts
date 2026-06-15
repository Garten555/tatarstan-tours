export type NotificationBodyMeta = {
  displayText: string;
  senderId: string | null;
  senderUsername: string | null;
  senderAvatar: string | null;
  roomId: string | null;
  badgeType: string | null;
  achievementId: string | null;
};

export function parseNotificationBodyMeta(body: string | null): NotificationBodyMeta {
  if (!body) {
    return {
      displayText: '',
      senderId: null,
      senderUsername: null,
      senderAvatar: null,
      roomId: null,
      badgeType: null,
      achievementId: null,
    };
  }
  const lines = body.split('\n');
  const meta = new Map<string, string>();
  const textLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('sender_id:')) {
      meta.set('sender_id', line.slice('sender_id:'.length).trim());
      continue;
    }
    if (line.startsWith('sender_username:')) {
      meta.set('sender_username', line.slice('sender_username:'.length).trim());
      continue;
    }
    if (line.startsWith('sender_avatar:')) {
      meta.set('sender_avatar', line.slice('sender_avatar:'.length).trim());
      continue;
    }
    if (line.startsWith('room_id:')) {
      meta.set('room_id', line.slice('room_id:'.length).trim());
      continue;
    }
    if (line.startsWith('badge_type:')) {
      meta.set('badge_type', line.slice('badge_type:'.length).trim());
      continue;
    }
    if (line.startsWith('achievement_id:')) {
      meta.set('achievement_id', line.slice('achievement_id:'.length).trim());
      continue;
    }
    textLines.push(rawLine);
  }
  return {
    displayText: textLines.join('\n').trim(),
    senderId: meta.get('sender_id') || null,
    senderUsername: meta.get('sender_username') || null,
    senderAvatar: meta.get('sender_avatar') || null,
    roomId: meta.get('room_id') || null,
    badgeType: meta.get('badge_type') || null,
    achievementId: meta.get('achievement_id') || null,
  };
}
