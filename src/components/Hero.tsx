import { ArrowRight, Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import defaultHeroImage from '../assets/images/erica_costa_bookshelf_1783981387672.jpg';

export default function Hero() {
  const { siteContent } = useSiteContent();
  const { name, bioShort, whatsappUrl, heroImageUrl } = siteContent.psychologist_info;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-28 pb-16 bg-gradient-to-br from-softblue-100/40 via-sand-50 to-white overflow-hidden animate-fade-in"
    >
      {/* Decorative background shapes */}
      <div className="absolute top-1/4 -left-32 w-[35rem] h-[35rem] rounded-full bg-softblue-200/20 blur-[100px] -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 -right-32 w-[35rem] h-[35rem] rounded-full bg-sand-200/30 blur-[100px] -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Column */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 bg-sage-100 text-sage-800 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide w-fit"
            >
              <Leaf size={14} className="text-sage-500 fill-sage-100" />
              <span>Espaço Acolhedor & Ético</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-serif text-sand-950 tracking-tight leading-[1.1]"
            >
              Psicóloga <span className="text-sage-600 font-medium italic">{name}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl sm:text-2xl font-serif text-sand-900 tracking-tight leading-relaxed max-w-xl font-medium border-l-2 border-sage-300 pl-4"
            >
              "{bioShort}"
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-base text-sand-800 font-normal leading-relaxed max-w-xl"
            >
              Atendimento psicológico online com acolhimento, ética, escuta qualificada e respeito à individualidade de cada pessoa.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <button
                onClick={() => scrollToSection('agendamento')}
                className="inline-flex items-center justify-center bg-softblue-600 hover:bg-softblue-700 text-white font-medium px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer text-base text-center group"
              >
                Agende sua primeira consulta
                <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-white hover:bg-sand-100 text-sand-950 font-medium px-8 py-4 rounded-xl shadow-sm hover:shadow-md border border-sand-300/80 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer text-base text-center"
              >
                Falar pelo WhatsApp
              </a>
            </motion.div>

            {/* Quick trust metrics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="pt-8 border-t border-sand-200 grid grid-cols-3 gap-6 max-w-md"
            >
              <div>
                <p className="text-2xl font-serif font-bold text-sage-800">100%</p>
                <p className="text-xs text-sand-700 font-medium">Sigiloso e Ético</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-sage-800">TCC</p>
                <p className="text-xs text-sand-700 font-medium">Prática Científica</p>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-sage-800">Online</p>
                <p className="text-xs text-sand-700 font-medium">Para todo o Brasil</p>
              </div>
            </motion.div>
          </div>

          {/* Image Column */}
          <div className="lg:col-span-5 relative flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full max-w-sm md:max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-sand-200/60 p-2.5 bg-white"
            >
              {/* Main welcoming image with elegant treatment */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden relative bg-sand-50">
                <img
                  src={heroImageUrl || defaultHeroImage}
                  alt="Psicóloga Erica Costa"
                  className="w-full h-full object-cover object-[center_20%] transition-transform duration-700 hover:scale-[1.03] brightness-[1.01] contrast-[1.02] saturate-[1.01]"
                  referrerPolicy="no-referrer"
                />
                
                {/* Soft overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-sage-950/30 via-transparent to-transparent pointer-events-none" />
              </div>
              
              {/* Float Badge */}
              <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-sand-100 flex items-center space-x-3">
                <div className="p-2 bg-sage-50 text-sage-600 rounded-xl border border-sage-100 shrink-0">
                  <Leaf size={18} className="fill-sage-200" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-sand-950 font-serif leading-none mb-1">{name}</h3>
                  {siteContent.psychologist_info.crp ? (
                    <p className="text-xs text-sand-700 font-mono leading-none">{siteContent.psychologist_info.crp}</p>
                  ) : (
                    <p className="text-xs text-sage-600 font-sans font-medium leading-none">Psicoterapia Online</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Organic plant accent or float details */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-softblue-50 border border-softblue-100 rounded-full -z-10 flex items-center justify-center animate-bounce duration-1000">
              <span className="text-3xl">🍃</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
