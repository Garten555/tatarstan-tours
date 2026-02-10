// Интеграция с SendGrid для отправки email
// Бесплатный тариф: 100 писем/день (3,000/месяц)

import { EmailOptions, EmailSendResult } from './send-email';

/**
 * Отправка email через SendGrid API
 * 
 * Настройка:
 * 1. Зарегистрируйтесь на https://sendgrid.com
 * 2. Создайте API ключ в Settings > API Keys
 * 3. Добавьте в .env:
 *    SENDGRID_API_KEY=your_api_key_here
 *    SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 *    SENDGRID_FROM_NAME=Туры по Татарстану
 * 4. Включите использование SendGrid:
 *    EMAIL_PROVIDER=sendgrid
 */
export async function sendEmailViaSendGrid(options: EmailOptions): Promise<EmailSendResult> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Туры по Татарстану';

    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY not configured!');
      return {
        success: false,
        error: {
          message: 'SendGrid API key not configured',
        },
      };
    }

    if (!fromEmail) {
      console.error('❌ SENDGRID_FROM_EMAIL not configured!');
      return {
        success: false,
        error: {
          message: 'SendGrid from email not configured',
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

    console.log(`📤 Sending email via SendGrid to ${options.to}...`);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName,
        },
        content: [
          {
            type: 'text/plain',
            value: plainText,
          },
          {
            type: 'text/html',
            value: options.html,
          },
        ],
        // Улучшаем доставляемость
        mail_settings: {
          sandbox_mode: {
            enable: process.env.NODE_ENV === 'development' && process.env.SENDGRID_SANDBOX === 'true',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('❌ SendGrid API error:', errorData);
      
      return {
        success: false,
        error: {
          code: 'SENDGRID_API_ERROR',
          responseCode: response.status,
          response: errorText,
          message: errorData.errors?.[0]?.message || errorData.message || 'SendGrid API error',
        },
      };
    }

    console.log(`✅ Email sent successfully via SendGrid to ${options.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending email via SendGrid:', error);
    
    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
      },
    };
  }
}

