// Интеграция с Resend для отправки email
// Бесплатный тариф: 3,000 писем/месяц, 100 писем/день

import { EmailOptions, EmailSendResult } from './send-email';

/**
 * Отправка email через Resend API
 * 
 * Настройка:
 * 1. Зарегистрируйтесь на https://resend.com
 * 2. Создайте API ключ в API Keys
 * 3. Добавьте домен и настройте DNS записи (SPF, DKIM, DMARC)
 * 4. Добавьте в .env:
 *    RESEND_API_KEY=re_your_api_key_here
 *    RESEND_FROM_EMAIL=noreply@yourdomain.com
 * 5. Включите использование Resend:
 *    EMAIL_PROVIDER=resend
 */
export async function sendEmailViaResend(options: EmailOptions): Promise<EmailSendResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!apiKey) {
      console.error('❌ RESEND_API_KEY not configured!');
      return {
        success: false,
        error: {
          message: 'Resend API key not configured',
        },
      };
    }

    if (!fromEmail) {
      console.error('❌ RESEND_FROM_EMAIL not configured!');
      return {
        success: false,
        error: {
          message: 'Resend from email not configured',
        },
      };
    }

    // Улучшенная текстовая версия
    const plainText = options.text || options.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    console.log(`📤 Sending email via Resend to ${options.to}...`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: plainText,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        const errorText = await response.text();
        errorData = { message: errorText };
      }
      
      console.error('❌ Resend API error:', errorData);
      
      return {
        success: false,
        error: {
          code: 'RESEND_API_ERROR',
          responseCode: response.status,
          response: JSON.stringify(errorData),
          message: errorData.message || 'Resend API error',
        },
      };
    }

    const result = await response.json();
    console.log(`✅ Email sent successfully via Resend to ${options.to}`);
    console.log(`📬 Email ID: ${result.id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending email via Resend:', error);
    
    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
      },
    };
  }
}

