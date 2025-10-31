import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tag = 'client', level = 'info', message = '', data = {} } = body || {};
    const prefix = `[${tag}]`;
    const payload = { message, data };
    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(prefix, payload);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(prefix, payload);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(prefix, payload);
        break;
      default:
        // eslint-disable-next-line no-console
        console.info(prefix, payload);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[client]', { message: 'log route error', error: e });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}



