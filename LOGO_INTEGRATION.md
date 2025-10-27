# 🎨 Интеграция логотипа

## 📋 Описание логотипа

Твой логотип представляет собой круглую SVG иконку с элементами:
- **Мечеть** с куполом (слева)
- **Минарет** (по центру)
- **Горы** (справа)
- **Полумесяц и звезды** (вверху справа)
- **Круглая рамка**

### Цветовая палитра:
- **Темно-зеленый:** `#1a4d2e` (основные контуры)
- **Золотой:** `#d4af37` (акценты, полумесяц, звезды)
- **Белый:** `#ffffff` (фон)

---

## 📂 Расположение файла

```
public/
└── logo.svg       ← Твой логотип здесь
```

**⚠️ ВАЖНО:** Сейчас там placeholder! Замени на свой настоящий логотип!

---

## 🔧 Как подключен

### 1. Компонент Logo (`components/ui/Logo.tsx`)

```typescript
import Image from 'next/image';

export function Logo({ className = 'w-12 h-12' }) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/logo.svg"
        alt="Туры по Татарстану - Логотип"
        width={48}
        height={48}
        className="object-contain"
        priority
      />
    </div>
  );
}
```

**Фичи:**
- ✅ Next.js Image (автоматическая оптимизация)
- ✅ SVG формат (бесконечное масштабирование)
- ✅ Priority loading (загружается первым)
- ✅ Accessibility (alt текст)

### 2. Использование в Header

```typescript
<Logo className="w-12 h-12 transition-transform group-hover:scale-105" />
```

**Эффекты:**
- 🎨 Анимация при hover (scale-105)
- 📱 Адаптивный размер
- ⚡ Плавные transition

### 3. Использование в Footer

```typescript
<Logo className="w-10 h-10" />
```

Меньший размер для футера.

---

## 📐 Размеры логотипа

| Контекст | Размер | CSS класс |
|----------|--------|-----------|
| **Header (десктоп)** | 48×48px | `w-12 h-12` |
| **Header (мобилка)** | 48×48px | `w-12 h-12` |
| **Footer** | 40×40px | `w-10 h-10` |
| **Favicon** | 32×32px | - |

---

## 🎨 CSS стилизация

### Hover эффект (в Header)
```css
.group:hover .logo {
  transform: scale(1.05);
}
```

### Адаптивность
```typescript
className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
```

---

## 🖼️ Как заменить на свой логотип

### Шаг 1: Подготовь SVG
1. Открой твой логотип в векторном редакторе (Figma, Illustrator)
2. Экспортируй как SVG
3. Оптимизируй на [SVGOMG.net](https://jakearchibald.github.io/svgomg/)

### Шаг 2: Настрой viewBox
```svg
<svg viewBox="0 0 48 48" width="48" height="48">
  <!-- твой код -->
</svg>
```

### Шаг 3: Замени файл
```bash
# Удали placeholder
rm public/logo.svg

# Скопируй свой логотип
cp /путь/к/твоему/logo.svg public/logo.svg
```

### Шаг 4: Проверь
```bash
npm run dev
# Открой http://localhost:3000
```

---

## 🎯 SEO оптимизация

### Alt текст
```typescript
alt="Туры по Татарстану - Логотип"
```

Описательный alt для поисковиков и скрин-ридеров.

### Schema.org разметка
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Туры по Татарстану",
  "logo": "https://tatarstan-tours.ru/logo.svg",
  "url": "https://tatarstan-tours.ru"
}
```

Добавим позже в layout.

---

## 📱 Адаптивные версии

### Для разных устройств можно создать:

```
public/
├── logo.svg           ← Основной (48×48)
├── logo-large.svg     ← Большой (64×64)
├── logo-small.svg     ← Маленький (32×32)
└── logo-favicon.svg   ← Favicon (16×16)
```

### Условный рендеринг:
```typescript
export function Logo({ size = 'md' }) {
  const sizes = {
    sm: { src: '/logo-small.svg', w: 32, h: 32 },
    md: { src: '/logo.svg', w: 48, h: 48 },
    lg: { src: '/logo-large.svg', w: 64, h: 64 },
  };
  
  const { src, w, h } = sizes[size];
  
  return <Image src={src} width={w} height={h} ... />;
}
```

---

## 🚀 Производительность

### Текущая оптимизация:
- ✅ SVG формат (~2-5KB)
- ✅ Priority loading
- ✅ Next.js Image оптимизация
- ✅ CSS transform (GPU-accelerated)

### Дополнительная оптимизация:
```typescript
<Image
  src="/logo.svg"
  width={48}
  height={48}
  loading="eager"  // Немедленная загрузка
  decoding="async" // Асинхронная декодировка
/>
```

---

## 🎨 Цветовые вариации

### Для темной темы (будущее):
```typescript
// components/ui/Logo.tsx
export function Logo({ theme = 'light' }) {
  return (
    <div className={theme === 'dark' ? 'invert' : ''}>
      <Image src="/logo.svg" ... />
    </div>
  );
}
```

### CSS фильтр:
```css
.logo.dark {
  filter: brightness(0) invert(1);
}
```

---

## 📋 Checklist перед деплоем

- [ ] Заменил placeholder на настоящий логотип
- [ ] Оптимизировал SVG (SVGOMG)
- [ ] Проверил на всех разрешениях экрана
- [ ] Создал favicon из логотипа
- [ ] Добавил Open Graph изображение
- [ ] Проверил accessibility (alt текст)
- [ ] Протестировал hover эффекты
- [ ] Убедился что загружается быстро

---

## 🆘 Troubleshooting

### Логотип не отображается
- Проверь путь: `public/logo.svg`
- Убедись что файл валидный SVG
- Проверь консоль на ошибки

### Логотип растянут
```typescript
className="object-contain" // Сохраняет пропорции
```

### Логотип размытый
- Используй SVG, не PNG/JPG
- Или используй PNG с двойным разрешением (@2x)

---

**Версия:** 1.0.0  
**Дата:** 2024

