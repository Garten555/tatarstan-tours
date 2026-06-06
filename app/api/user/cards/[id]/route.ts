import { NextResponse } from 'next/server';

const DISABLED_MESSAGE =
  'Сохранение банковских карт отключено. Данные карты вводятся только при оплате и не хранятся.';

export async function DELETE() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 403 });
}

export async function PATCH() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 403 });
}
