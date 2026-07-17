import { motion } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { ArrowDown, HelpCircle } from 'lucide-react';

export default function HowItWorks() {
  const { siteContent } = useSiteContent();
  const { process_steps } = siteContent;
  return (
    <section id="como-funciona" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">PROCESSO</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Como Funciona a Psicoterapia?
          </h2>
          <p className="text-base text-sand-800">
            Conheça o passo a passo simplificado, desde o seu primeiro contato até o desenvolvimento da sua autonomia emotional.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Decorative connector line on desktop */}
          <div className="hidden lg:block absolute top-[2.25rem] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-sage-200 via-softblue-200 to-sand-200 -z-10" />

          {process_steps.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative flex flex-col items-center lg:items-start text-center lg:text-left bg-sand-50 p-6 sm:p-8 rounded-2xl border border-sand-200/50 shadow-sm"
            >
              {/* Step bubble */}
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-600 text-white font-serif font-bold text-lg shadow-md mb-6 z-10">
                {step.step}
              </div>

              <h3 className="text-lg sm:text-xl font-serif font-bold text-sand-950 mb-3">
                {step.title}
              </h3>
              
              <p className="text-sm text-sand-800 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Informative Callout */}
        <div className="mt-16 bg-softblue-50 border border-softblue-100 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 max-w-4xl mx-auto">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white rounded-xl text-softblue-600 border border-softblue-100 shrink-0">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-base font-serif font-bold text-sand-950 mb-1">Dúvida sobre a sua queixa?</h4>
              <p className="text-sm text-sand-800">
                Você não precisa saber expressar exatamente o que sente para agendar. A primeira sessão serve precisamente para clarearmos as suas demandas juntos.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              const element = document.getElementById('contato');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="inline-flex items-center text-sm font-semibold text-softblue-700 hover:text-softblue-800 hover:underline shrink-0 cursor-pointer"
          >
            Fazer uma pergunta
            <ArrowDown size={16} className="ml-1" />
          </button>
        </div>

      </div>
    </section>
  );
}
