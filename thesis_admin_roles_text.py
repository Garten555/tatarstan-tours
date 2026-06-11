# -*- coding: utf-8 -*-
"""Текст админ-панели: нумерация рисунков как в Ахунов_Диплом_ВКР_исправлен.docx."""

from __future__ import annotations

from dataclasses import dataclass

PANELS_MARKER = "Модератор поддержки (support_admin)"

ROLE_PROSE_AFTER_SQL: list[str] = [
    "Супер-администратор (`super_admin`) использует дашборд `/admin` со сводной статистикой, "
    "CRUD туров и выездов, бронирования, комнаты туров, модерацию отзывов и жалоб, чат поддержки, "
    "раздел «Пользователи» (роли и блокировки), апелляции, выдачу достижений. "
    "Общий вид панели показан на рисунке 12.",
    "Администратор туров (`tour_admin`) работает на том же `/admin` с основным дашбордом, "
    "но без пунктов «Чат поддержки» и «Пользователи» в боковом меню. Доступны туры и медиа (рисунок 28), "
    "бронирования и отзывы (рисунок 27), комнаты туров, модерация жалоб в чатах и на гидов, апелляции на бан "
    "и выдача достижений; управление ролями и банами всех пользователей — только у супер-админа и модератора "
    "(рисунок 29). Прямой переход на `/admin/users` перенаправляет на `/admin`; запросы к `/api/admin/support/*` "
    "отклоняются с кодом 403.",
    "Гид (`guide`) после входа попадает на `/admin/guide-dashboard` и видит только закреплённые туры; "
    "в разделе «Выдача достижений» (`/admin/award-achievements`) и в комнате тура может вручную выдать "
    "участнику экспертно назначаемое достижение из утверждённого перечня критериальных бейджей "
    "(активность в ходе очной экскурсионной программы, без автоматических цифровых наград паспорта). "
    "Пример выдачи достижения гидом — на рисунке 29.",
]

MODERATOR_COMPLAINTS_SECTION: list[str] = [
    "Модератор поддержки (`support_admin`).",
    (
        "При входе выполняется редирект на `/admin/moderator-dashboard`: сводка по чату поддержки, "
        "отзывам на модерации, заблокированным пользователям, комнатам туров и числу жалоб в чатах."
    ),
    (
        "Основной функционал модератора — разбор инцидентов и ограниченное администрирование пользователей. "
        "В разделе «Жалобы в чатах туров» (`/admin/tour-room-reports`) просматриваются сообщения, "
        "помеченные участниками; модератор меняет статус обращения и при необходимости блокирует автора "
        "(нельзя заблокировать super_admin, tour_admin и другого support_admin)."
    ),
    (
        "В разделе «Жалобы на гидов» (`/admin/guide-reports`) отображается реестр отчётов о поведении гида: "
        "фильтрация по статусу и факту бана, поиск, сортировка; список обновляется по Pusher без перезагрузки "
        "страницы. Для подтверждённых нарушений доступна блокировка гида (с теми же ограничениями по ролям)."
    ),
    (
        "В разделе «Отзывы» (`/admin/reviews`) модератор просматривает очередь неопубликованных отзывов, "
        "одобряет отзыв для публикации на сайте или снимает его с публикации; при жалобе на отзыв доступна "
        "пометка и снятие с публикации."
    ),
    (
        "Дополнительно модератор ведёт чат поддержки, работает с апелляциями на бан "
        "и может открывать комнаты туров для проверки контекста. "
        "Модератор не создаёт и не редактирует туры, не управляет бронированиями как tour_admin."
    ),
]

FIGURE_29_GUIDE_ACHIEVEMENT = (
    "Рисунок 29 — Выдача экспертно назначаемого достижения гидом участнику тура"
)
FIGURE_30_COMPLAINTS = (
    "Рисунок 30 — Модерация жалоб в чатах туров и на гидов"
)
FIGURE_29_PLACEHOLDER = "[МЕСТО ДЛЯ РИСУНКА: выдача достижения гидом в комнате тура или /admin/award-achievements]"

COMPLAINTS_SECTION_HEADING = "Жалобы в чатах туров и отчёты о гиде"
COMPLAINTS_SECTION_INTRO = (
    "Жалоба на сообщение в комнате тура фиксируется полями в таблице `tour_room_messages` (признак жалобы, "
    "время, автор жалобы, текст причины). Отдельная таблица `guide_reports` хранит обращения участников "
    "на гида; записи обрабатываются в админ-панели модератора."
)

LISTING_41_TITLE = "Листинг 41. Жалобы в чатах туров и отчёты о гиде: структура таблиц и SQL"
LISTING_41_SQL = """-- Жалоба на сообщение в комнате тура
UPDATE tour_room_messages
SET is_reported = true,
    reported_at = now(),
    reported_by = $2,
    report_reason = $3
WHERE id = $1 AND room_id = $4;

-- Отчёт о гиде (guide_reports)
CREATE TABLE IF NOT EXISTS guide_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES tour_rooms(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO guide_reports (guide_id, reporter_id, room_id, reason, status)
VALUES ($1, $2, $3, $4, 'open');"""

LISTING_42_TITLE = "Листинг 42. Жалобы в чатах туров и отчёты о гиде: фрагмент программного кода"
LISTING_42_EXTRA_INTRO = (
    "Клиент `GuideReportsPanel` дополняет серверный список: фильтры, поиск и подписка на Pusher "
    "(`admin-moderation`) для обновления реестра жалоб на гидов."
)

BOOKINGS_REVIEWS_PROSE = (
    "Администратор и модератор просматривают бронирования, меняют статусы заказов, открывают карточку тура. "
    "Модерация отзывов выполняется в `/admin/reviews`: одобрение (`approve`) выставляет `is_approved` и "
    "`is_published`, снятие с публикации (`unpublish`) скрывает отзыв без удаления записи. "
    "Доступ к API имеют роли `super_admin`, `support_admin` и `tour_admin`. "
    "Определения таблиц и SQL — в листинге 39; фрагмент программы — в листинге 40; интерфейс — на рисунке 27."
)


@dataclass
class RoleListing:
    title: str
    intro: str
    code_hint: str


ROLE_SECTIONS: list = []
ADMIN_ROLES_PARAGRAPHS = ROLE_PROSE_AFTER_SQL
ROLE_MENU_PARAGRAPHS: list[str] = []
MODERATOR_PANEL_PARAGRAPHS = MODERATOR_COMPLAINTS_SECTION
TOUR_ADMIN_PANEL_PARAGRAPHS: list[str] = []
GUIDE_PANEL_PARAGRAPHS: list[str] = []
SIDEBAR_FIGURE_PARAGRAPHS: list[str] = []

NEW_LISTING_INTROS: list[tuple[str, str, str]] = []

FIGURE_PLACEHOLDER_CAPTIONS: dict[str, str] = {
    "выдача достижения": FIGURE_29_GUIDE_ACHIEVEMENT,
    "award-achievements": FIGURE_29_GUIDE_ACHIEVEMENT,
    "редактирование тура": "Рисунок 28 — Форма создания и редактирования тура в админ-панели",
    "админ-дашборд": "Рисунок 12 — Обзор административной панели (дашборд)",
    "список пользователей": "Рисунок 29 — Управление пользователями, ролями и блокировками",
    "брони": "Рисунок 27 — Бронирования и модерация отзывов в админке",
    "модерация жалоб": FIGURE_30_COMPLAINTS,
    "жалоб": FIGURE_30_COMPLAINTS,
    "guide-reports": FIGURE_30_COMPLAINTS,
}
