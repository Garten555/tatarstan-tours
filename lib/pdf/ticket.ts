// Генерация PDF билета с поддержкой русского языка
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { effectiveBookingStartIso } from '@/lib/booking/booking-display-dates';

interface Booking {
  id: string;
  tour_id: string;
  num_people: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  /** Слот выезда; даты на билете берутся отсюда, если есть */
  tour_session?: { start_at: string; end_at?: string | null } | null;
  tour: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date?: string;
    cover_image: string;
    city?: {
      name: string;
    };
  };
}

// Генерация простого QR-кода (текстовый паттерн)
function generateQRCode(text: string): string {
  // Простой текстовый QR-код паттерн для демонстрации
  // В реальном проекте можно использовать библиотеку qrcode
  const qrPattern = `
█████████████████████████████████
█                               █
█   ████  ██  ████  ██  ████   █
█   █  █  ██  █  █  ██  █  █   █
█   ████  ██  ████  ██  ████   █
█                               █
█   ████  ████  ████  ████     █
█   █  █  █  █  █  █  █  █     █
█   ████  ████  ████  ████     █
█                               █
█████████████████████████████████
  `.trim();
  return qrPattern;
}

export async function generateTicketPDF(booking: Booking) {
  // Создаем временный элемент для рендеринга билета
  const ticketElement = document.createElement('div');
  ticketElement.style.width = '794px'; // A4 width in pixels at 96 DPI
  ticketElement.style.padding = '0';
  ticketElement.style.backgroundColor = '#f8fafc';
  ticketElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ticketElement.style.position = 'absolute';
  ticketElement.style.left = '-9999px';
  ticketElement.style.top = '0';

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Получение названия способа оплаты
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      card: 'Банковская карта',
      cash: 'Наличными',
      qr_code: 'QR-код',
    };
    return methods[method] || method;
  };

  // Загружаем логотип как base64
  let logoBase64 = '';
  try {
    const logoResponse = await fetch('/logo.svg');
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob();
      logoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logoBlob);
      });
    }
  } catch (error) {
    console.warn('Не удалось загрузить логотип:', error);
  }

  const bookingId = booking.id.substring(0, 8).toUpperCase();
  const qrCode = generateQRCode(booking.id);
  const tourStartIso = effectiveBookingStartIso({
    sessionSlot: booking.tour_session?.start_at
      ? { start_at: booking.tour_session.start_at, end_at: booking.tour_session.end_at ?? null }
      : null,
    tourStart: booking.tour.start_date,
  });

  // HTML содержимое билета - оптимизированный для одной страницы
  ticketElement.innerHTML = `
    <div style="max-width: 714px; margin: 0 auto; background: #ffffff; border-radius: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.05);">
      
      <!-- Основная часть билета -->
      <div style="padding: 18px 25px; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #10b981 100%); position: relative; overflow: hidden;">
        <!-- Декоративные элементы -->
        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
        <div style="position: absolute; bottom: -15px; left: -15px; width: 70px; height: 70px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
        
        <!-- Шапка -->
        <div style="position: relative; z-index: 1; text-align: center; margin-bottom: 15px;">
          ${logoBase64 ? `
            <div style="margin-bottom: 8px;">
              <img src="${logoBase64}" alt="Логотип" style="width: 50px; height: 50px; object-fit: contain; background: white; padding: 6px; border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.2);" />
            </div>
          ` : ''}
          <h1 style="margin: 0 0 3px 0; font-size: 28px; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            Билет
          </h1>
          <div style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.95); letter-spacing: 1px;">
            ТУРЫ ПО ТАТАРСТАНУ
          </div>
        </div>

        <!-- Основная информация -->
        <div style="position: relative; z-index: 1; background: white; border-radius: 14px; padding: 20px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); margin-bottom: 15px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #e5e7eb;">
            <div style="flex: 1;">
              <div style="font-size: 10px; color: #4b5563; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Номер билета</div>
              <div style="font-size: 22px; font-weight: 900; color: #0f766e; font-family: monospace; letter-spacing: 2px;">
                ${bookingId}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #4b5563; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Статус</div>
              <div style="display: inline-block; padding: 6px 12px; background: #10b981; color: white; border-radius: 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                ОПЛАЧЕН
              </div>
            </div>
          </div>

          <h2 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 900; color: #111827; line-height: 1.2;">
            ${booking.tour.title}
          </h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
            ${booking.tour.city ? `
              <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; border: 2px solid #10b981;">
                <div style="font-size: 9px; color: #047857; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">📍 Город</div>
                <div style="font-size: 16px; font-weight: 900; color: #065f46;">${booking.tour.city.name}</div>
              </div>
            ` : ''}
            <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; border: 2px solid #10b981;">
              <div style="font-size: 9px; color: #047857; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">📅 Дата</div>
              <div style="font-size: 16px; font-weight: 900; color: #065f46;">${formatDateShort(tourStartIso)}</div>
              <div style="font-size: 11px; color: #047857; margin-top: 2px; font-weight: 600;">${new Date(tourStartIso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; border: 2px solid #10b981;">
              <div style="font-size: 9px; color: #047857; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">👥 Участники</div>
              <div style="font-size: 16px; font-weight: 900; color: #065f46;">${booking.num_people} ${booking.num_people === 1 ? 'человек' : 'человека'}</div>
            </div>
            <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; border: 2px solid #10b981;">
              <div style="font-size: 9px; color: #047857; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">💳 Оплата</div>
              <div style="font-size: 14px; font-weight: 900; color: #065f46;">${getPaymentMethodLabel(booking.payment_method)}</div>
            </div>
          </div>

          <!-- Цена -->
          <div style="padding: 16px; background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); border-radius: 10px; text-align: center; box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);">
            <div style="font-size: 10px; color: rgba(255,255,255,0.95); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Общая стоимость</div>
            <div style="font-size: 34px; font-weight: 900; color: white; text-shadow: 0 2px 6px rgba(0,0,0,0.2); line-height: 1;">
              ${parseFloat(booking.total_price.toString()).toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        <!-- QR-код и дополнительная информация -->
        <div style="position: relative; z-index: 1; display: flex; gap: 14px; align-items: flex-start;">
          <div style="flex: 1; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 14px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.4);">
            <div style="font-size: 10px; color: white; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">QR-код для проверки</div>
            <div style="background: white; padding: 8px; border-radius: 8px; display: inline-block; font-family: monospace; font-size: 6px; line-height: 1.1; color: #111827; white-space: pre; border: 2px solid #e5e7eb;">
${qrCode}
            </div>
            <div style="margin-top: 8px; font-size: 9px; color: white; font-family: monospace; letter-spacing: 0.5px; font-weight: 600;">
              ID: ${bookingId}
            </div>
          </div>
          <div style="flex: 1; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 14px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.4);">
            <div style="font-size: 10px; color: white; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">Информация</div>
            <div style="margin-bottom: 10px;">
              <div style="font-size: 9px; color: rgba(255,255,255,0.85); margin-bottom: 4px; font-weight: 600;">Дата бронирования</div>
              <div style="font-size: 12px; color: white; font-weight: 700;">${formatDate(booking.created_at)}</div>
            </div>
            <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
              <div style="font-size: 9px; color: white; line-height: 1.4; font-weight: 500;">
                ⚠️ Предъявите этот билет при регистрации на тур. При возникновении вопросов обращайтесь в службу поддержки.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Отрывная часть билета -->
      <div style="padding: 14px 25px; background: #f8fafc; border-top: 2px dashed #cbd5e1; position: relative;">
        <div style="position: absolute; top: -2px; left: 0; right: 0; height: 4px; background: repeating-linear-gradient(to right, transparent 0, transparent 6px, #cbd5e1 6px, #cbd5e1 12px);"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 8px; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Номер билета</div>
            <div style="font-size: 16px; font-weight: 900; color: #0f766e; font-family: monospace; letter-spacing: 1.5px;">
              ${bookingId}
            </div>
          </div>
          <div style="text-align: center; flex: 1; padding: 0 12px;">
            <div style="font-size: 8px; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Тур</div>
            <div style="font-size: 12px; font-weight: 800; color: #1e293b; line-height: 1.2;">
              ${booking.tour.title}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 8px; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Дата</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f766e;">
              ${formatDateShort(tourStartIso)}
            </div>
          </div>
        </div>
      </div>

      <!-- Футер -->
      <div style="padding: 12px 25px; background: #1e293b; color: white; text-align: center;">
        <div style="font-size: 8px; color: rgba(255,255,255,0.8); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Документ сгенерирован автоматически • ${new Date().toLocaleString('ru-RU')}
        </div>
        <div style="font-size: 11px; font-weight: 800; color: white;">
          Туры по Татарстану
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(ticketElement);

  try {
    // Конвертируем HTML в canvas
    const canvas = await html2canvas(ticketElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#f8fafc',
      logging: false,
      height: ticketElement.scrollHeight,
      windowHeight: ticketElement.scrollHeight,
    });

    // Создаем PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Если контент помещается на одну страницу
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      // Если контент не помещается, разбиваем на страницы
      let heightLeft = imgHeight;
      let position = 0;

      // Добавляем первую страницу
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Добавляем дополнительные страницы если нужно
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    // Сохраняем PDF
    const fileName = `Билет_${booking.tour.title.substring(0, 20).replace(/[^a-zа-яё0-9]/gi, '_')}_${bookingId}.pdf`;
    pdf.save(fileName);
  } finally {
    // Удаляем временный элемент
    document.body.removeChild(ticketElement);
  }
}
