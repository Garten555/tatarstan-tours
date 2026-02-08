import { Button } from '@/components/ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-8 md:px-12 py-12 md:py-16 text-white shadow-2xl">
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Начните путешествие</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight">
                Готовы открыть Татарстан?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl font-medium leading-relaxed">
                Выберите тур, забронируйте места и отправляйтесь в путешествие уже сегодня.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 md:justify-end">
              <Button 
                href="/tours" 
                variant="primary" 
                size="lg" 
                className="group bg-emerald-900 hover:bg-emerald-950 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Выбрать тур
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                href="/auth" 
                variant="outline" 
                size="lg" 
                className="border-2 border-white/50 text-white hover:bg-white hover:text-emerald-600 transition-all duration-300 hover:scale-105"
              >
                Войти или зарегистрироваться
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
