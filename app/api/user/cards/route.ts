// Сохранение карт отключено (PCI DSS / 54-ФЗ — нельзя хранить реквизиты без сертификации).
import { NextResponse } from 'next/server';

const DISABLED_MESSAGE =
  'Сохранение банковских карт отключено. Данные карты вводятся только при оплате и не хранятся.';

export async function GET() {
  return NextResponse.json({ cards: [], disabled: true, message: DISABLED_MESSAGE });
}

export async function POST() {
  return NextResponse.json({ error: DISABLED_MESSAGE }, { status: 403 });
}
