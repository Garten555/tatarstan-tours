# 💬 Архитектура чата с AI-агентом

## 📋 Оглавление
1. [Обзор системы](#обзор-системы)
2. [Технологический стек](#технологический-стек)
3. [Архитектура](#архитектура)
4. [AI-агент (OpenRouter)](#ai-агент-openrouter)
5. [WebSocket соединение](#websocket-соединение)
6. [Передача чата оператору](#передача-чата-оператору)
7. [Реализация](#реализация)

---

## 🎯 Обзор системы

Система чата поддержки предоставляет пользователям возможность получать помощь в режиме реального времени через:
- **AI-агента** (первая линия поддержки) - отвечает на типовые вопросы
- **Живого оператора** (вторая линия) - для сложных случаев

### Основные возможности:
- ✅ Мгновенные ответы от AI
- ✅ Передача чата живому оператору
- ✅ История сообщений
- ✅ Поддержка анонимных пользователей
- ✅ Real-time обновления через WebSocket
- ✅ Typing indicators (индикатор набора текста)
- ✅ Контекстная осведомленность AI о турах и бронированиях

---

## 🛠️ Технологический стек

| Компонент | Технология |
|-----------|------------|
| **Frontend** | React, WebSocket Client (socket.io-client) |
| **Backend** | Next.js API Routes, Socket.io |
| **AI** | OpenRouter API (GPT-4, Claude, Llama) |
| **Database** | Supabase (PostgreSQL) |
| **State Management** | Zustand |

---

## 🏗️ Архитектура

### High-Level диаграмма

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                 │
│  │  Chat Widget   │◄────────┤   Chat Store   │                 │
│  │  (Component)   │         │    (Zustand)   │                 │
│  └────────┬───────┘         └────────────────┘                 │
└───────────┼──────────────────────────────────────────────────────┘
            │ WebSocket (Socket.io)
            │
┌───────────▼──────────────────────────────────────────────────────┐
│                     SERVER (Next.js API)                         │
│                                                                  │
│  ┌────────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │  WebSocket     │      │   Message    │     │   Support    │ │
│  │  Handler       │─────►│   Router     │────►│   Queue      │ │
│  │  (Socket.io)   │      │              │     │              │ │
│  └────────────────┘      └──────┬───────┘     └──────────────┘ │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
               ┌─────────────────┴──────────────────┐
               │                                    │
      ┌────────▼─────────┐              ┌─────────▼────────┐
      │  OpenRouter AI   │              │    Supabase      │
      │                  │              │                  │
      │  • GPT-4         │              │  • chat_messages │
      │  • Claude        │              │  • profiles      │
      │  • Context       │              │  • tours         │
      └──────────────────┘              └──────────────────┘
```

### Поток сообщений

#### 1. Сценарий: AI отвечает на вопрос

```
User: "Какие туры доступны в июне?"
  │
  │ (WebSocket emit: 'message')
  │
  ▼
Server: Получает сообщение
  │
  ├─► Сохраняет в БД (chat_messages)
  │
  ├─► Загружает контекст (последние 10 сообщений)
  │
  ├─► Запрос к OpenRouter API
  │   Context: "Ты - помощник платформы туров по Татарстану..."
  │   User message: "Какие туры доступны в июне?"
  │
  ├─► Получает ответ от AI
  │   "В июне у нас доступны следующие туры:..."
  │
  ├─► Сохраняет ответ в БД
  │
  └─► Отправляет клиенту (WebSocket emit: 'ai_response')
  │
  ▼
User: Видит ответ AI в чате
```

#### 2. Сценарий: Передача оператору

```
User: "Хочу поговорить с оператором"
  │
  │ (WebSocket emit: 'request_support')
  │
  ▼
Server: Обработка запроса
  │
  ├─► Проверяет доступность операторов
  │
  ├─► Добавляет чат в очередь поддержки
  │
  ├─► Уведомляет доступного оператора
  │   (WebSocket emit: 'new_support_request')
  │
  └─► Уведомляет пользователя
  │   (WebSocket emit: 'support_pending')
  │
  ▼
Support Admin: Принимает чат
  │
  │ (WebSocket emit: 'join_support_chat')
  │
  ▼
Server: Связывает пользователя с оператором
  │
  └─► Уведомляет пользователя
  │   (WebSocket emit: 'support_joined')
  │
  ▼
User: "Оператор подключился к чату"
  │
  │ Далее все сообщения идут напрямую
  │ между User <-> Support Admin
  │
```

---

## 🤖 AI-агент (OpenRouter)

### Настройка AI

```typescript
// lib/ai/openrouter.ts
import { ChatMessage } from '@/types';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getAIResponse(
  userMessage: string,
  context: ChatMessage[],
  tourContext?: any // Опциональный контекст о текущем туре
): Promise<string> {
  // Системный промпт
  const systemPrompt = `Ты - виртуальный ассистент платформы "Туры по Татарстану".

Твоя задача:
- Помогать пользователям найти подходящий тур
- Отвечать на вопросы о бронировании
- Предоставлять информацию о достопримечательностях Татарстана
- Объяснять процесс бронирования и оплаты
- Быть вежливым, дружелюбным и профессиональным

Если пользователь просит связаться с живым оператором или вопрос выходит за рамки
твоей компетенции, предложи передать чат оператору.

Отвечай на русском языке, используя эмодзи где уместно.`;

  // Формируем сообщения для API
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Добавляем контекст предыдущих сообщений (последние 10)
  const recentContext = context.slice(-10);
  for (const msg of recentContext) {
    messages.push({
      role: msg.is_ai ? 'assistant' : 'user',
      content: msg.message,
    });
  }

  // Добавляем контекст о туре, если есть
  if (tourContext) {
    messages.push({
      role: 'system',
      content: `Контекст: Пользователь сейчас смотрит тур "${tourContext.title}".
        Цена: ${tourContext.price} ₽/чел, Дата: ${tourContext.startDate}.
        Доступно мест: ${tourContext.availableSpots}.`,
    });
  }

  // Добавляем текущее сообщение пользователя
  messages.push({
    role: 'user',
    content: userMessage,
  });

  // Запрос к OpenRouter API
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
        'X-Title': 'Tatarstan Tours',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4', // Можно менять модель
        messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      // Fallback на другую модель
      return await getAIResponseFallback(messages);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw new Error('Не удалось получить ответ от AI');
  }
}

// Fallback на более дешевую модель
async function getAIResponseFallback(messages: OpenRouterMessage[]): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct', // Более дешевая модель
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Обогащение контекста

AI может использовать данные из БД для более точных ответов:

```typescript
// lib/ai/context-enrichment.ts
import { createClient } from '@/lib/supabase/server';

export async function enrichAIContext(message: string): Promise<any | null> {
  const supabase = createClient();

  // Если пользователь спрашивает о турах
  if (message.toLowerCase().includes('тур') || message.toLowerCase().includes('экскурси')) {
    const { data: tours } = await supabase
      .from('tours')
      .select('title, price_per_person, start_date, max_participants, current_bookings')
      .eq('status', 'published')
      .gte('start_date', new Date().toISOString())
      .limit(5);

    return { type: 'tours', data: tours };
  }

  // Если пользователь спрашивает о бронировании
  if (message.toLowerCase().includes('бронирова') || message.toLowerCase().includes('забронирова')) {
    return {
      type: 'booking_info',
      data: {
        process: 'Выберите тур → Укажите количество человек → Введите данные → Оплата',
        cancellation: 'Отмена возможна за 48 часов до начала тура',
      },
    };
  }

  return null;
}
```

---

## 🔌 WebSocket соединение

### Server (Socket.io)

```typescript
// app/api/chat/socket/route.ts
import { Server as SocketIOServer } from 'socket.io';
import { NextRequest } from 'next/server';
import { getAIResponse, enrichAIContext } from '@/lib/ai/openrouter';
import { createClient } from '@/lib/supabase/server';

// Хранилище активных соединений
const activeConnections = new Map<string, any>();

export async function GET(req: NextRequest) {
  const res = req as any;
  if (res.socket.server.io) {
    return new Response('Socket server already running', { status: 200 });
  }

  const io = new SocketIOServer(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Регистрация пользователя
    socket.on('register', (data: { userId?: string; sessionId: string }) => {
      activeConnections.set(socket.id, data);
      console.log('User registered:', data);
    });

    // Получение сообщения от пользователя
    socket.on('message', async (data: { sessionId: string; message: string; tourContext?: any }) => {
      try {
        const supabase = createClient();
        const { sessionId, message, tourContext } = data;

        // Сохранение сообщения пользователя
        const { data: userMessage } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            message,
            is_ai: false,
          })
          .select()
          .single();

        // Получение контекста (последние сообщения)
        const { data: context } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Обогащение контекста
        const enrichedContext = await enrichAIContext(message);

        // Индикатор набора текста
        socket.emit('ai_typing', true);

        // Получение ответа от AI
        const aiResponse = await getAIResponse(
          message,
          context?.reverse() || [],
          tourContext || enrichedContext
        );

        socket.emit('ai_typing', false);

        // Сохранение ответа AI
        const { data: aiMessage } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            message: aiResponse,
            is_ai: true,
          })
          .select()
          .single();

        // Отправка ответа клиенту
        socket.emit('ai_response', {
          id: aiMessage.id,
          message: aiResponse,
          timestamp: aiMessage.created_at,
        });
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Произошла ошибка при обработке сообщения' });
      }
    });

    // Запрос на живого оператора
    socket.on('request_support', async (data: { sessionId: string; userId?: string }) => {
      try {
        // Добавление в очередь поддержки
        // Уведомление доступных операторов
        const supportAdmins = Array.from(activeConnections.entries())
          .filter(([_, user]) => user.role === 'support_admin')
          .map(([socketId]) => socketId);

        supportAdmins.forEach((adminSocketId) => {
          io.to(adminSocketId).emit('new_support_request', {
            sessionId: data.sessionId,
            userId: data.userId,
          });
        });

        socket.emit('support_pending', { message: 'Ожидание оператора...' });
      } catch (error) {
        console.error('Error requesting support:', error);
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      activeConnections.delete(socket.id);
      console.log('Client disconnected:', socket.id);
    });
  });

  return new Response('Socket server initialized', { status: 200 });
}
```

### Client (React Component)

```typescript
// components/chat/ChatWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/store/chat';

export function ChatWidget() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { messages, addMessage, setTyping } = useChatStore();
  const [input, setInput] = useState('');

  useEffect(() => {
    // Инициализация WebSocket
    const socketInstance = io({
      path: '/api/chat/socket',
    });

    socketInstance.on('connect', () => {
      console.log('Connected to chat server');
      
      // Регистрация с session ID
      const sessionId = getOrCreateSessionId();
      socketInstance.emit('register', { sessionId });
    });

    socketInstance.on('ai_response', (data) => {
      addMessage({
        id: data.id,
        message: data.message,
        isAi: true,
        timestamp: new Date(data.timestamp),
      });
      setTyping(false);
    });

    socketInstance.on('ai_typing', (isTyping: boolean) => {
      setTyping(isTyping);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (!socket || !input.trim()) return;

    const sessionId = getOrCreateSessionId();
    
    // Добавляем сообщение в UI сразу
    addMessage({
      id: Date.now().toString(),
      message: input,
      isAi: false,
      timestamp: new Date(),
    });

    // Отправляем на сервер
    socket.emit('message', {
      sessionId,
      message: input,
    });

    setInput('');
  };

  return (
    <div className="chat-widget">
      {/* Реализация UI чата */}
    </div>
  );
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('chat_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('chat_session_id', sessionId);
  }
  return sessionId;
}
```

---

## 🔄 Передача чата оператору

### Админ панель поддержки

```typescript
// app/admin/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function SupportAdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pendingChats, setPendingChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io({ path: '/api/chat/socket' });

    socketInstance.on('connect', () => {
      // Регистрация как support admin
      socketInstance.emit('register', {
        userId: 'current-admin-id',
        role: 'support_admin',
      });
    });

    socketInstance.on('new_support_request', (data) => {
      setPendingChats((prev) => [...prev, data]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const acceptChat = (sessionId: string) => {
    socket?.emit('join_support_chat', { sessionId });
    setActiveChat(sessionId);
  };

  return (
    <div>
      <h1>Чаты поддержки</h1>
      
      <div className="pending-chats">
        <h2>Ожидают ответа ({pendingChats.length})</h2>
        {pendingChats.map((chat) => (
          <div key={chat.sessionId}>
            <button onClick={() => acceptChat(chat.sessionId)}>
              Принять чат
            </button>
          </div>
        ))}
      </div>

      {activeChat && (
        <ChatInterface sessionId={activeChat} socket={socket} />
      )}
    </div>
  );
}
```

---

## 📊 Метрики и аналитика

### Отслеживаемые метрики:

1. **Среднее время ответа AI**
2. **Процент успешных решений через AI**
3. **Количество переданных чатов операторам**
4. **Популярные вопросы/темы**
5. **Удовлетворенность пользователей**

---

## 🔒 Безопасность

- Rate limiting на сообщения (макс 20 сообщений/минуту)
- Модерация контента (фильтрация оскорблений)
- Защита от спама
- Шифрование WebSocket соединений (WSS)

---

**Версия:** 1.0.0

