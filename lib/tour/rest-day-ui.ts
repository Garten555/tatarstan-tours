/** Общие стили «выходной гида» — календарь и авторасписание. */
export const GUIDE_REST = {
  section: 'border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50',
  dayButtonOn:
    'bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-violet-600 shadow-sm shadow-violet-200/60',
  dayButtonOff: 'bg-white text-gray-700 border-gray-300 hover:border-violet-300 hover:bg-violet-50/40',
  dayButtonDisabled: 'opacity-80 cursor-default',
  calendarCell:
    'border-violet-200/90 bg-gradient-to-br from-violet-50 to-indigo-50/70 hover:border-violet-300 hover:shadow-sm hover:shadow-violet-100/80',
  calendarCellSelected:
    'border-violet-500 bg-gradient-to-br from-violet-100 to-indigo-100 shadow-md ring-2 ring-violet-200/80',
  badge:
    'inline-flex items-center gap-0.5 rounded-md bg-violet-100/90 px-1.5 py-0.5 text-[9px] font-bold leading-tight text-violet-800 ring-1 ring-violet-200/80',
  panel: 'rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-indigo-50/40 p-3',
  panelTitle: 'text-xs font-bold uppercase tracking-wide text-violet-700',
  legendDot: 'bg-violet-500',
  legendText: 'text-violet-800',
} as const;
