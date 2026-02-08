# Использование кастомных диалогов

Все стандартные `confirm()` и `alert()` заменены на красивые кастомные модальные окна.

## Как использовать

### 1. Импортируйте хук

```tsx
import { useDialog } from '@/hooks/useDialog';
```

### 2. Используйте в компоненте

```tsx
export default function MyComponent() {
  const { confirm, alert, prompt, DialogComponents } = useDialog();

  // В JSX добавьте DialogComponents
  return (
    <div>
      {/* Ваш контент */}
      
      {/* Обязательно добавьте в конец */}
      {DialogComponents}
    </div>
  );
}
```

### 3. Замена confirm()

**Было:**
```tsx
if (!confirm('Вы уверены?')) return;
```

**Стало:**
```tsx
const confirmed = await confirm('Вы уверены?', 'Подтвердите действие');
if (!confirmed) return;
```

### 4. Замена alert()

**Было:**
```tsx
alert('Ошибка!');
```

**Стало:**
```tsx
await alert('Ошибка!', 'Ошибка', 'error');
// Варианты: 'success', 'error', 'warning', 'info'
```

### 5. Замена prompt()

**Было:**
```tsx
const value = prompt('Введите значение:') || '';
```

**Стало:**
```tsx
const value = await prompt('Введите значение:', 'Ввод', 'Введите значение...', '') || '';
```

## Примеры

### Удаление с подтверждением
```tsx
const handleDelete = async () => {
  const confirmed = await confirm(
    'Вы уверены, что хотите удалить этот элемент?',
    'Удаление',
    'danger'
  );
  if (!confirmed) return;
  
  // Выполнить удаление
};
```

### Показ ошибки
```tsx
try {
  // какой-то код
} catch (error: any) {
  await alert(error.message, 'Ошибка', 'error');
}
```

### Показ успеха
```tsx
await alert('Операция выполнена успешно!', 'Успешно', 'success');
```

## Компоненты уже обновлены

- ✅ `components/blog/BlogPostFeedItem.tsx`
- ✅ `components/layout/UserMenu.tsx`

## Нужно обновить

- `components/reviews/TourReviews.tsx`
- `components/profile/UserBookings.tsx`
- `components/profile/ProfileContent.tsx`
- `components/admin/*.tsx`
- И другие файлы с `confirm()` или `alert()`










