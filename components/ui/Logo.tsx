import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export function Logo({ className = 'w-12 h-12' }: LogoProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 
        PLACEHOLDER - Замени на свой логотип!
        Путь: public/logo.svg
        
        Твой логотип:
        - Формат: SVG
        - Цвета: Темно-зеленый (#1a4d2e) + Золотой (#d4af37)
        - Элементы: Мечеть, минарет, горы, полумесяц, звезды
        - Форма: Круглая
      */}
      <Image
        src="/logo.svg"
        alt="Туры по Татарстану - Логотип"
        width={192}
        height={192}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  );
}

