// Утилита для отправки email уведомлений
import nodemailer from 'nodemailer';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { formatEmailFrom } from '@/lib/email/email-layout';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const PROTON_MAIL_DOMAINS = ['proton.me', 'protonmail.com', 'protonmail.ch', 'pm.me'];

function isProtonMailbox(email: string | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && PROTON_MAIL_DOMAINS.includes(domain);
}

function isProtonSmtpProvider(): boolean {
  const provider = (process.env.SMTP_PROVIDER || process.env.EMAIL_PROVIDER || '').toLowerCase();
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  return provider === 'proton' || provider === 'protonmail' || isProtonMailbox(smtpUser);
}

function getSmtpHostDefault(): string {
  if (isProtonSmtpProvider()) {
    return 'smtp.protonmail.ch';
  }
  return 'smtp.gmail.com';
}

function readSmtpCredentials(): { user: string | undefined; password: string | undefined } {
  const user =
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER;
  const password =
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.MAIL_PASSWORD;
  return { user, password };
}

/** Проверка наличия SMTP-настроек (отдельно от Supabase Auth). */
export function isSmtpConfigured(): boolean {
  const { user, password } = readSmtpCredentials();
  return Boolean(user && password);
}

function readResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

function resolveEmailProvider(): 'resend' | 'smtp' {
  const explicit = (
    process.env.MAIL_PROVIDER ||
    process.env.EMAIL_PROVIDER ||
    process.env.SMTP_PROVIDER ||
    ''
  ).toLowerCase();
  if (explicit === 'resend') return 'resend';
  if (explicit === 'smtp') return 'smtp';
  if (readResendApiKey()) return 'resend';
  return 'smtp';
}

export function isResendConfigured(): boolean {
  return Boolean(readResendApiKey());
}

/** SMTP или Resend API (для VPS, где порты 587/465 заблокированы). */
export function isEmailConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

async function sendEmailViaResend(options: EmailOptions): Promise<boolean> {
  const apiKey = readResendApiKey();
  if (!apiKey) return false;

  const from = formatEmailFrom();
  if (!from) {
    console.error('❌ RESEND_FROM / SMTP_FROM not configured');
    return false;
  }

  console.log(`📤 Resend API → ${options.to} (from: ${from})`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };

  if (!res.ok) {
    console.error('❌ Resend API error:', res.status, body.message ?? body);
    return false;
  }

  console.log(`✅ Email sent via Resend to ${options.to} (id: ${body.id ?? 'ok'})`);
  return true;
}

function isSmtpNetworkError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}

function createTransporter(hostOverride?: string, tlsServerName?: string) {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST || getSmtpHostDefault();
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT || '587', 10);
  const { user: smtpUser, password: smtpPassword } = readSmtpCredentials();

  if (!smtpUser || !smtpPassword) {
    console.error('❌ SMTP credentials not configured!');
    console.error('Required environment variables:');
    console.error('  - SMTP_USER or EMAIL_USER');
    console.error('  - SMTP_PASSWORD or EMAIL_PASSWORD');
    console.error('Optional: SMTP_HOST, SMTP_PORT, SMTP_FROM, MAIL_FROM_NAME, SMTP_PROVIDER=proton');
    return null;
  }

  const effectiveHost = hostOverride || smtpHost;
  console.log(`📧 Creating SMTP transporter: ${effectiveHost}:${smtpPort} (user: ${smtpUser})`);

  return nodemailer.createTransport({
    host: effectiveHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    debug: process.env.NODE_ENV === 'development',
    tls: {
      minVersion: 'TLSv1.2',
      ...(tlsServerName ? { servername: tlsServerName } : {}),
    },
  });
}

async function resolveSmtpHost(): Promise<{ host: string; tlsServerName?: string }> {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || getSmtpHostDefault();
  if (isIP(smtpHost)) {
    return { host: smtpHost };
  }

  try {
    const resolved = await lookup(smtpHost, { family: 4 });
    console.log(`🌐 SMTP host resolved: ${smtpHost} -> ${resolved.address}`);
    return { host: resolved.address, tlsServerName: smtpHost };
  } catch (error) {
    console.warn(`⚠️ SMTP DNS lookup failed for ${smtpHost}, using host directly`);
    return { host: smtpHost };
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = resolveEmailProvider();

  if (provider === 'resend' && isResendConfigured()) {
    return sendEmailViaResend(options);
  }

  if (isSmtpConfigured()) {
    const smtpOk = await sendEmailViaSmtp(options);
    if (smtpOk) return true;
    if (isResendConfigured()) {
      console.warn('⚠️ SMTP failed — falling back to Resend API');
      return sendEmailViaResend(options);
    }
    return false;
  }

  if (isResendConfigured()) {
    return sendEmailViaResend(options);
  }

  console.error('❌ Email not configured (set RESEND_API_KEY or SMTP_USER/SMTP_PASSWORD)');
  return false;
}

async function sendEmailViaSmtp(options: EmailOptions): Promise<boolean> {
  try {
    const resolvedHost = await resolveSmtpHost();
    const transporter = createTransporter(resolvedHost.host, resolvedHost.tlsServerName);

    if (!transporter) {
      console.error('❌ Email transporter not available. Cannot send email.');
      return false;
    }

    const smtpFrom = formatEmailFrom();
    if (!smtpFrom) {
      console.error('❌ SMTP_FROM / SMTP_USER not configured');
      return false;
    }
    console.log(`📤 Attempting to send email to ${options.to}...`);
    console.log(`📧 From: ${smtpFrom}`);
    console.log(`📝 Subject: ${options.subject}`);

    const result = await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log(`📬 Message ID: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending email:', error);

    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.response) {
      console.error(`   SMTP response: ${error.response}`);
    }
    if (error.responseCode) {
      console.error(`   Response code: ${error.responseCode}`);
    }
    if (error.command) {
      console.error(`   Failed command: ${error.command}`);
    }
    if (isSmtpNetworkError(error)) {
      console.error('   Hint: VPS may block SMTP ports — set RESEND_API_KEY and MAIL_PROVIDER=resend');
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('   Full error:', JSON.stringify(error, null, 2));
    }

    try {
      const resolvedHost = await resolveSmtpHost();
      const retryTransporter = createTransporter(resolvedHost.host, resolvedHost.tlsServerName);
      const smtpUser = readSmtpCredentials().user;
      const fallbackFrom = smtpUser ? formatEmailFrom() ?? smtpUser : undefined;
      if (retryTransporter && fallbackFrom) {
        const retryResult = await retryTransporter.sendMail({
          from: fallbackFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
        });
        console.log(`✅ Email sent on retry to ${options.to}`);
        console.log(`📬 Retry message ID: ${retryResult.messageId}`);
        return true;
      }
    } catch (retryError) {
      console.error('❌ Retry email attempt failed:', retryError);
    }

    return false;
  }
}

export {
  getAppealApprovedEmail,
  getAppealRejectedEmail,
  getBanNotificationEmail,
  getBookingCancellationEmail,
  getBookingConfirmationEmail,
  getPasswordResetCodeEmail,
  getPasswordResetEmail,
} from '@/lib/email/email-templates';
