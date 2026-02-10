// Интеграция с SendPulse для отправки email
// Бесплатный тариф: 15,000 писем/месяц
// НЕ требует номер телефона при регистрации!

import { EmailOptions, EmailSendResult } from './send-email';

/**
 * Отправка email через SendPulse API
 * 
 * Настройка:
 * 1. Зарегистрируйтесь на https://sendpulse.com (только email, без телефона!)
 * 2. Создайте API ключ в Settings → API
 * 3. Добавьте в .env:
 *    SENDPULSE_API_USER_ID=your_user_id
 *    SENDPULSE_API_SECRET=your_api_secret
 *    SENDPULSE_FROM_EMAIL=noreply@yourdomain.com
 *    SENDPULSE_FROM_NAME=Туры по Татарстану
 * 4. Включите использование SendPulse:
 *    EMAIL_PROVIDER=sendpulse
 */
export async function sendEmailViaSendPulse(options: EmailOptions): Promise<EmailSendResult> {
  try {
    const apiUserId = process.env.SENDPULSE_API_USER_ID;
    const apiSecret = process.env.SENDPULSE_API_SECRET;
    const fromEmail = process.env.SENDPULSE_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SENDPULSE_FROM_NAME || 'Туры по Татарстану';

    if (!apiUserId || !apiSecret) {
      console.error('❌ SENDPULSE_API_USER_ID or SENDPULSE_API_SECRET not configured!');
      return {
        success: false,
        error: {
          message: 'SendPulse API credentials not configured',
        },
      };
    }

    if (!fromEmail) {
      console.error('❌ SENDPULSE_FROM_EMAIL not configured!');
      return {
        success: false,
        error: {
          message: 'SendPulse from email not configured',
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

    console.log(`📤 Sending email via SendPulse to ${options.to}...`);

    // Получаем токен доступа
    const tokenResponse = await fetch('https://api.sendpulse.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: apiUserId,
        client_secret: apiSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ SendPulse token error:', errorText);
      return {
        success: false,
        error: {
          code: 'SENDPULSE_TOKEN_ERROR',
          responseCode: tokenResponse.status,
          response: errorText,
          message: 'Failed to get SendPulse access token',
        },
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Отправляем письмо
    const emailResponse = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: {
          html: options.html,
          text: plainText,
          subject: options.subject,
          from: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: options.to,
            },
          ],
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('❌ SendPulse API error:', errorData);
      
      return {
        success: false,
        error: {
          code: 'SENDPULSE_API_ERROR',
          responseCode: emailResponse.status,
          response: errorText,
          message: errorData.message || 'SendPulse API error',
        },
      };
    }

    const result = await emailResponse.json();
    console.log(`✅ Email sent successfully via SendPulse to ${options.to}`);
    console.log(`📬 Result:`, result);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending email via SendPulse:', error);
    
    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
      },
    };
  }
}

