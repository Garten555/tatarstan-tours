type AttendeeInput = {
  source?: string | null;
};

/** Бронирование включает самого пользователя как участника («Я»). */
export function bookingIncludesSelfAttendee(attendees: unknown, numPeople: number): boolean {
  if (attendees && Array.isArray(attendees) && attendees.length > 0) {
    return attendees.some((a: AttendeeInput) => a?.source === 'self');
  }
  return numPeople === 1;
}
