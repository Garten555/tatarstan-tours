import {
  emailAlert,
  emailButton,
  emailCodeBox,
  emailDetailRow,
  emailInfoBox,
  emailParagraph,
  emailDataTable,
  escapeHtml,
  wrapEmailLayout,
} from '@/lib/email/email-layout';

export function getBookingConfirmationEmail(
  userName: string,
  tourTitle: string,
  tourDate: string,
  numPeople: number,
  totalPrice: number,
  options?: { pendingPayment?: boolean }
): string {
  const pending = options?.pendingPayment;
  const headline = pending ? 'Заявка на бронирование принята' : 'Бронирование подтверждено';
  const intro = pending
    ? 'Ваша заявка принята. Оплата наличными при встрече — мы подтвердим бронирование после проверки.'
    : 'Ваше бронирование успешно создано и подтверждено.';

  return wrapEmailLayout({
    headline,
    theme: 'success',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName)}!`),
      emailParagraph(intro),
      emailInfoBox(
        'Детали бронирования',
        [
          emailDetailRow('Тур', escapeHtml(tourTitle)),
          emailDetailRow('Дата', escapeHtml(tourDate)),
          emailDetailRow('Количество участников', escapeHtml(String(numPeople))),
          emailDetailRow('Сумма', `${escapeHtml(totalPrice.toLocaleString('ru-RU'))} ₽`),
        ].join(''),
        'success'
      ),
      emailParagraph('Мы свяжемся с вами перед началом тура для уточнения деталей.'),
      emailParagraph('Если у вас возникли вопросы, пожалуйста, свяжитесь с нами.'),
    ].join(''),
  });
}

export function getBookingCancellationEmail(
  userName: string,
  tourTitle: string,
  tourDate: string,
  numPeople: number,
  totalPrice: number
): string {
  return wrapEmailLayout({
    headline: 'Бронирование отменено',
    theme: 'danger',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName)}!`),
      emailParagraph('Ваше бронирование было отменено.'),
      emailInfoBox(
        'Детали отменённого бронирования',
        [
          emailDetailRow('Тур', escapeHtml(tourTitle)),
          emailDetailRow('Дата', escapeHtml(tourDate)),
          emailDetailRow('Количество участников', escapeHtml(String(numPeople))),
          emailDetailRow('Сумма', `${escapeHtml(totalPrice.toLocaleString('ru-RU'))} ₽`),
        ].join(''),
        'danger'
      ),
      emailParagraph('Если бронирование было оплачено, средства будут возвращены в течение 5–10 рабочих дней.'),
      emailParagraph('Если у вас возникли вопросы, пожалуйста, свяжитесь с нами.'),
    ].join(''),
  });
}

export function getPasswordResetEmail(userName: string, actionLink: string): string {
  return wrapEmailLayout({
    headline: 'Сброс пароля',
    theme: 'brand',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName || 'пользователь')}!`),
      emailParagraph('Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль.'),
      emailInfoBox(
        'Восстановление доступа',
        [
          emailButton(actionLink, 'Сбросить пароль'),
          emailParagraph(
            '<span style="font-size:12px;color:#6b7280;">Если вы не запрашивали сброс, просто проигнорируйте это письмо.</span>'
          ),
        ].join(''),
        'brand'
      ),
    ].join(''),
  });
}

export function getPasswordResetCodeEmail(userName: string, code: string): string {
  return wrapEmailLayout({
    headline: 'Код восстановления пароля',
    theme: 'brand',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName || 'пользователь')}!`),
      emailParagraph('Вы запросили сброс пароля. Используйте код ниже для восстановления доступа:'),
      emailCodeBox(code),
      emailAlert('<strong>Важно:</strong> код действителен 15 минут. Не передавайте его никому!', 'warning'),
      emailParagraph(
        '<span style="font-size:12px;color:#6b7280;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</span>'
      ),
    ].join(''),
  });
}

export function getBanNotificationEmail(
  userName: string,
  reason: string | null,
  banUntil: string | null
): string {
  const isPermanent = !banUntil;
  const banUntilDate = banUntil ? new Date(banUntil).toLocaleString('ru-RU') : null;

  return wrapEmailLayout({
    headline: 'Аккаунт заблокирован',
    theme: 'danger',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName || 'пользователь')}!`),
      emailParagraph('К сожалению, ваш аккаунт был заблокирован администрацией сайта.'),
      emailInfoBox(
        'Информация о блокировке',
        [
          reason ? emailDetailRow('Причина', escapeHtml(reason)) : '',
          emailDetailRow('Тип блокировки', isPermanent ? 'Постоянная' : 'Временная'),
          banUntilDate ? emailDetailRow('Блокировка до', escapeHtml(banUntilDate)) : '',
        ]
          .filter(Boolean)
          .join(''),
        'danger'
      ),
      emailAlert(
        '<strong>Важно:</strong> во время блокировки вы не сможете бронировать туры и пользоваться аккаунтом.',
        'danger'
      ),
      !isPermanent
        ? emailParagraph('После окончания срока блокировки аккаунт будет автоматически разблокирован.')
        : '',
      emailParagraph('Если вы считаете, что блокировка была применена по ошибке, подайте апелляцию на сайте.'),
      emailParagraph('При вопросах обратитесь в службу поддержки.'),
    ].join(''),
  });
}

export function getAppealApprovedEmail(userName: string, reviewComment: string | null): string {
  return wrapEmailLayout({
    headline: 'Апелляция одобрена',
    theme: 'success',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName || 'пользователь')}!`),
      emailParagraph('Мы рады сообщить, что ваша апелляция была рассмотрена и одобрена.'),
      emailAlert('<strong>Ваш аккаунт разблокирован!</strong> Теперь вы снова можете пользоваться сайтом.', 'success'),
      reviewComment
        ? emailInfoBox('Комментарий модератора', emailParagraph(escapeHtml(reviewComment)), 'success')
        : '',
      emailParagraph('Благодарим за терпение. Надеемся, что подобных ситуаций больше не возникнет.'),
      emailParagraph('При вопросах обратитесь в службу поддержки.'),
    ].join(''),
  });
}

export function getAppealRejectedEmail(userName: string, reviewComment: string | null): string {
  return wrapEmailLayout({
    headline: 'Апелляция отклонена',
    theme: 'danger',
    bodyHtml: [
      emailParagraph(`Здравствуйте, ${escapeHtml(userName || 'пользователь')}!`),
      emailParagraph('К сожалению, ваша апелляция была рассмотрена и отклонена.'),
      emailAlert(
        '<strong>Ваш аккаунт остаётся заблокированным.</strong> Блокировка действует до окончания установленного срока.',
        'danger'
      ),
      reviewComment
        ? emailInfoBox('Комментарий модератора', emailParagraph(escapeHtml(reviewComment)), 'danger')
        : '',
      emailParagraph('Если считаете решение несправедливым, свяжитесь со службой поддержки.'),
      emailParagraph('Надеемся на понимание и соблюдение правил сайта в будущем.'),
    ].join(''),
  });
}

export function getTourRescheduleEmail(opts: {
  tourTitle: string;
  oldRange: string;
  newRange: string;
}): string {
  return wrapEmailLayout({
    headline: 'Перенос дат тура',
    theme: 'warning',
    bodyHtml: [
      emailParagraph('Здравствуйте!'),
      emailParagraph(`Изменились даты выезда по туру <strong>${escapeHtml(opts.tourTitle)}</strong>.`),
      emailDataTable([
        { label: 'Было', value: escapeHtml(opts.oldRange) },
        { label: 'Стало', value: escapeHtml(opts.newRange) },
      ]),
      emailParagraph(
        '<span style="font-size:14px;color:#6b7280;">Если у вас есть вопросы, ответьте на это письмо или напишите в поддержку на сайте.</span>'
      ),
    ].join(''),
  });
}

export function getTourCancelledEmail(opts: {
  tourTitle: string;
  reason?: string;
  departureLabel?: string;
}): string {
  const extra = [
    opts.departureLabel ? emailDetailRow('Выезд', escapeHtml(opts.departureLabel)) : '',
    opts.reason?.trim() ? emailDetailRow('Причина', escapeHtml(opts.reason.trim())) : '',
  ]
    .filter(Boolean)
    .join('');

  return wrapEmailLayout({
    headline: 'Тур отменён',
    theme: 'danger',
    bodyHtml: [
      emailParagraph('Здравствуйте!'),
      emailParagraph(`Тур <strong>${escapeHtml(opts.tourTitle)}</strong> был отменён организатором.`),
      extra ? emailInfoBox('Подробности', extra, 'danger') : '',
      emailParagraph('Бронирование аннулировано. По возврату средств или замене тура мы свяжемся с вами при необходимости.'),
    ].join(''),
  });
}

export function getTourRemovedEmail(tourTitle: string): string {
  return wrapEmailLayout({
    headline: 'Тур удалён с площадки',
    theme: 'warning',
    bodyHtml: [
      emailParagraph('Здравствуйте!'),
      emailParagraph(
        `Тур <strong>${escapeHtml(tourTitle)}</strong> был удалён администратором. Ваша запись на этот тур больше не действует.`
      ),
      emailParagraph('При вопросах обратитесь в поддержку сайта.'),
    ].join(''),
  });
}
