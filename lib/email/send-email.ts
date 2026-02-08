// Утилита для отправки email уведомлений
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Создаем transporter для отправки email
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPassword) {
    console.warn('⚠️ SMTP credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn('⚠️ Email transporter not available. Skipping email send.');
      return false;
    }

    const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;

    await transporter.sendMail({
      from: smtpFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    console.log(`✅ Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
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
          <h1>🔐 Код восстановления пароля</h1>
        </div>
        <div class="content">
          <p>Здравствуйте, ${userName || 'пользователь'}!</p>
          <p>Вы запросили сброс пароля. Используйте код ниже для восстановления доступа:</p>
          <div class="code-box">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Ваш код восстановления:</p>
            <div class="code">${code}</div>
          </div>
          <div class="warning">
            <strong>⚠️ Важно:</strong> Код действителен в течение 15 минут. Не передавайте его никому!
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
            Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
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






