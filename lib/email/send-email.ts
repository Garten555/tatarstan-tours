// Утилита для отправки email уведомлений
import nodemailer from 'nodemailer';
import { sendEmailViaSendGrid } from './sendgrid';
import { sendEmailViaResend } from './resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  success: boolean;
  error?: {
    code?: string;
    response?: string;
    responseCode?: number;
    message?: string;
  };
}

// Создаем transporter для отправки email
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPassword) {
    console.error('❌ SMTP credentials not configured!');
    console.error('Required environment variables:');
    console.error('  - SMTP_USER or EMAIL_USER');
    console.error('  - SMTP_PASSWORD or EMAIL_PASSWORD');
    console.error('Optional: SMTP_HOST, SMTP_PORT, SMTP_FROM');
    return null;
  }

  console.log(`📧 Creating SMTP transporter: ${smtpHost}:${smtpPort} (user: ${smtpUser})`);

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    connectionTimeout: 10000, // 10 секунд на подключение
    greetingTimeout: 5000, // 5 секунд на приветствие
    socketTimeout: 10000, // 10 секунд на операции
    debug: process.env.NODE_ENV === 'development', // Включаем debug в dev режиме
  });
}

export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  // Проверяем, какой провайдер использовать
  const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'smtp';
  
  // Используем SendGrid, если указан
  if (emailProvider === 'sendgrid') {
    return await sendEmailViaSendGrid(options);
  }
  
  // Используем Resend, если указан
  if (emailProvider === 'resend') {
    return await sendEmailViaResend(options);
  }
  
  // По умолчанию используем SMTP (nodemailer)
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('❌ Email transporter not available. Cannot send email.');
      return {
        success: false,
        error: {
          message: 'Email transporter not configured',
        },
      };
    }

    const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

    console.log(`📤 Attempting to send email to ${options.to}...`);
    console.log(`📧 From: ${smtpFrom}`);
    console.log(`📝 Subject: ${options.subject}`);

    // Улучшенная текстовая версия (удаляем HTML теги и форматируем)
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

    const result = await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: plainText,
      headers: {
        'X-Mailer': 'Tatarstan Tours',
        'X-Priority': '1',
        'Importance': 'high',
        // Убрали 'Precedence': 'bulk' - может вызывать подозрения у спам-фильтров
        'List-Unsubscribe': '<mailto:support@tatarstan-tours.ru>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      // Улучшаем совместимость с почтовыми серверами
      date: new Date(),
      messageId: undefined, // Позволяем nodemailer сгенерировать messageId
    });

    console.log(`✅ Email sent successfully to ${options.to}`);
    console.log(`📬 Message ID: ${result.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    
    // Детальная информация об ошибке
    const errorDetails: EmailSendResult['error'] = {};
    
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
      errorDetails.code = error.code;
    }
    if (error.response) {
      console.error(`   SMTP response: ${error.response}`);
      errorDetails.response = error.response;
    }
    if (error.responseCode) {
      console.error(`   Response code: ${error.responseCode}`);
      errorDetails.responseCode = error.responseCode;
    }
    if (error.message) {
      errorDetails.message = error.message;
    }
    
    // Логируем полную ошибку в dev режиме
    if (process.env.NODE_ENV === 'development') {
      console.error('   Full error:', JSON.stringify(error, null, 2));
    }
    
    return {
      success: false,
      error: errorDetails,
    };
  }
}

// Шаблоны email для бронирований
export function getBookingConfirmationEmail(
  userName: string,
  tourTitle: string,
  tourDate: string,
  numPeople: number,
  totalPrice: number
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Бронирование подтверждено!</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName}!</p>
          <p>Ваше бронирование успешно создано и подтверждено.</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #059669;">Детали бронирования</h2>
            <p><strong>Тур:</strong> ${tourTitle}</p>
            <p><strong>Дата:</strong> ${tourDate}</p>
            <p><strong>Количество участников:</strong> ${numPeople}</p>
            <p><strong>Сумма:</strong> ${totalPrice.toLocaleString('ru-RU')} ₽</p>
          </div>
          
          <p>Мы свяжемся с вами перед началом тура для уточнения деталей.</p>
          
          <p>Если у вас возникли вопросы, пожалуйста, свяжитесь с нами.</p>
          
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getBookingCancellationEmail(
  userName: string,
  tourTitle: string,
  tourDate: string,
  numPeople: number,
  totalPrice: number
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Бронирование отменено</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName}!</p>
          <p>Ваше бронирование было отменено.</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #dc2626;">Детали отмененного бронирования</h2>
            <p><strong>Тур:</strong> ${tourTitle}</p>
            <p><strong>Дата:</strong> ${tourDate}</p>
            <p><strong>Количество участников:</strong> ${numPeople}</p>
            <p><strong>Сумма:</strong> ${totalPrice.toLocaleString('ru-RU')} ₽</p>
          </div>
          
          <p>Если бронирование было оплачено, средства будут возвращены в течение 5-10 рабочих дней.</p>
          
          <p>Если у вас возникли вопросы, пожалуйста, свяжитесь с нами.</p>
          
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmail(userName: string, actionLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Сброс пароля</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль.</p>
          <div class="info-box">
            <a class="button" href="${actionLink}" target="_blank" rel="noopener noreferrer">
              Сбросить пароль
            </a>
            <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">
              Если вы не запрашивали сброс, просто проигнорируйте это письмо.
            </p>
          </div>
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetCodeEmail(userName: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Код восстановления пароля - Туры по Татарстану</title>
      <style>
        body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { background: #ffffff; padding: 30px; }
        .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; }
        .intro { font-size: 15px; color: #555555; margin-bottom: 25px; }
        .code-box { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 25px 0; border: 2px solid #10b981; text-align: center; }
        .code-label { margin: 0 0 15px 0; color: #6b7280; font-size: 14px; font-weight: 500; }
        .code { font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #10b981; font-family: 'Courier New', 'Courier', monospace; margin: 10px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px; font-size: 13px; color: #92400e; }
        .warning strong { display: block; margin-bottom: 5px; }
        .instructions { font-size: 14px; color: #555555; margin: 20px 0; line-height: 1.8; }
        .instructions ol { margin: 10px 0; padding-left: 20px; }
        .instructions li { margin: 8px 0; }
        .security-note { font-size: 12px; color: #6b7280; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.6; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Код восстановления пароля</h1>
        </div>
        <div class="content">
          <div class="greeting">
            Здравствуйте, ${userName || 'пользователь'}!
          </div>
          <div class="intro">
            Вы запросили сброс пароля для вашего аккаунта на сайте "Туры по Татарстану". Для завершения процесса восстановления доступа используйте код, указанный ниже.
          </div>
          <div class="code-box">
            <p class="code-label">Ваш код восстановления:</p>
            <div class="code">${code}</div>
          </div>
          <div class="warning">
            <strong>⚠️ Важная информация:</strong>
            Код действителен в течение 15 минут с момента получения письма. После истечения срока действия вам потребуется запросить новый код. Никому не передавайте этот код, даже сотрудникам службы поддержки.
          </div>
          <div class="instructions">
            <strong>Как использовать код:</strong>
            <ol>
              <li>Вернитесь на страницу восстановления пароля</li>
              <li>Введите полученный код в соответствующее поле</li>
              <li>После подтверждения кода задайте новый пароль</li>
            </ol>
          </div>
          <div class="security-note">
            <strong>Безопасность:</strong> Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш аккаунт остается в безопасности. Если вы получаете подобные письма регулярно без вашего запроса, пожалуйста, свяжитесь с нашей службой поддержки.
          </div>
          <div class="footer">
            <p><strong>Туры по Татарстану</strong></p>
            <p>Это автоматическое письмо. Пожалуйста, не отвечайте на него.</p>
            <p>Если у вас возникли вопросы, свяжитесь с нами через форму обратной связи на сайте.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getEmailVerificationCodeEmail(userName: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .code-box { background: white; padding: 30px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; text-align: center; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; font-family: 'Courier New', monospace; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 12px; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Код подтверждения email</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>Спасибо за регистрацию! Используйте код ниже для подтверждения вашего email:</p>
          <div class="code-box">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Ваш код подтверждения:</p>
            <div class="code">${code}</div>
          </div>
          <div class="warning">
            <strong>⚠️ Важно:</strong> Код действителен в течение 15 минут. Не передавайте его никому!
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
            Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
          </p>
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getBanNotificationEmail(
  userName: string,
  reason: string | null,
  banUntil: string | null
): string {
  const isPermanent = !banUntil;
  const banUntilDate = banUntil ? new Date(banUntil).toLocaleString('ru-RU') : null;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚫 Ваш аккаунт заблокирован</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>К сожалению, ваш аккаунт был заблокирован администрацией сайта.</p>
          
          <div class="info-box">
            <h2 style="margin-top: 0; color: #dc2626;">Информация о блокировке</h2>
            ${reason ? `<p><strong>Причина:</strong> ${reason}</p>` : ''}
            <p><strong>Тип блокировки:</strong> ${isPermanent ? 'Постоянная' : 'Временная'}</p>
            ${banUntilDate ? `<p><strong>Блокировка до:</strong> ${banUntilDate}</p>` : ''}
          </div>
          
          <div class="warning">
            <strong>⚠️ Важно:</strong> Во время блокировки вы не сможете использовать свой аккаунт для бронирования туров и других действий на сайте.
          </div>
          
          ${!isPermanent ? '<p>После окончания срока блокировки ваш аккаунт будет автоматически разблокирован.</p>' : ''}
          
          <p>Если вы считаете, что блокировка была применена по ошибке, вы можете подать апелляцию через форму на сайте.</p>
          
          <p>Если у вас возникли вопросы, пожалуйста, свяжитесь с нашей службой поддержки.</p>
          
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getAppealApprovedEmail(
  userName: string,
  reviewComment: string | null
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Апелляция одобрена</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>Мы рады сообщить, что ваша апелляция была рассмотрена и одобрена.</p>
          
          <div class="success">
            <strong>✓ Ваш аккаунт разблокирован!</strong> Теперь вы снова можете использовать все функции сайта.
          </div>
          
          ${reviewComment ? `
          <div class="info-box">
            <h2 style="margin-top: 0; color: #059669;">Комментарий модератора</h2>
            <p>${reviewComment}</p>
          </div>
          ` : ''}
          
          <p>Благодарим за ваше терпение. Мы надеемся, что в дальнейшем не возникнет подобных ситуаций.</p>
          
          <p>Если у вас возникли вопросы, пожалуйста, свяжитесь с нашей службой поддержки.</p>
          
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getAppealRejectedEmail(
  userName: string,
  reviewComment: string | null
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Апелляция отклонена</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>К сожалению, ваша апелляция была рассмотрена и отклонена.</p>
          
          <div class="warning">
            <strong>⚠️ Ваш аккаунт остается заблокированным.</strong> Блокировка будет действовать до окончания установленного срока.
          </div>
          
          ${reviewComment ? `
          <div class="info-box">
            <h2 style="margin-top: 0; color: #dc2626;">Комментарий модератора</h2>
            <p>${reviewComment}</p>
          </div>
          ` : ''}
          
          <p>Если вы считаете, что решение было принято несправедливо, вы можете связаться с нашей службой поддержки для дополнительного рассмотрения.</p>
          
          <p>Мы надеемся на ваше понимание и соблюдение правил использования сайта в будущем.</p>
          
          <div class="footer">
            <p>С уважением,<br>Команда туров по Татарстану</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}






