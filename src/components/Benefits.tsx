import { Shield, Sparkles, BrainCircuit, HeartHandshake, Laptop } from 'lucide-react';
import { motion } from 'motion/react';

export default function Benefits() {
  const benefitList = [
    {
      icon: <Shield className="h-6 w-6 text-softblue-500" />,
      title: "Sigilo Ético Absoluto",
      description: "Suas sessões ocorrem sob o mais rigoroso compromisso de confidencialidade médica e psicoterapêutica, em conformidade integral com o código de ética profissional."
    },
    {
      icon: <Laptop className="h-6 w-6 text-softblue-500" />,
      title: "Praticidade do Atendimento Online",
      description: "Realize suas consultas de onde estiver, com total flexibilidade de horários, economizando tempo com trânsito e mantendo a mesma eficácia científica do consultório presencial."
    },
    {
      icon: <BrainCircuit className="h-6 w-6 text-softblue-500" />,
      title: "Abordagem Baseada em Evidências",
      description: "Utilização de métodos clínicos modernos, focados em técnicas cientificamente validadas para clarear pensamentos, regular emoções e construir soluções práticas sustentáveis."
    },
    {
      icon: <HeartHandshake className="h-6 w-6 text-softblue-500" />,
      title: "Acolhimento Genuíno",
      description: "Um espaço seguro, livre de qualquer tipo de julgamento ou crítica, estruturado unicamente para acolher sua história e amparar suas vulnerabilidades com sensibilidade."
    },
    {
      icon: <Sparkles className="h-6 w-6 text-softblue-500" />,
      title: "Desenvolvimento de Autonomia",
      description: "Muito além do alívio de sintomas pontuais, o tratamento visa capacitar você com ferramentas cognitivas e comportamentais para lidar com futuros desafios com segurança."
    }
  ];

  return (
    <section id="beneficios" className="py-24 bg-white relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-softblue-50/40 blur-3xl -z-10" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Title block */}
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-softblue-600 font-mono bg-softblue-50 px-3.5 py-1.5 rounded-full border border-softblue-100">
            DIFERENCIAIS CLÍNICOS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-sand-950 font-bold leading-tight">
            Por que escolher a psicoterapia online?
          </h2>
          <p className="text-base text-sand-800">
            Um processo terapêutico pensado minuciosamente para oferecer o máximo em suporte emocional, flexibilidade, bem-estar e rigor técnico.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefitList.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-sand-50 border border-sand-200/50 p-8 rounded-[2rem] shadow-sm hover:shadow-md hover:bg-white hover:border-softblue-200 transition-all duration-300 flex flex-col space-y-4"
            >
              <div className="p-4 bg-white text-softblue-600 rounded-2xl border border-sand-100 w-fit shadow-xs">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-serif font-bold text-sand-950 pt-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-sand-800 leading-relaxed flex-1">
                {benefit.description}
              </p>
            </motion.div>
          ))}
          
          {/* Visual Callout as the last card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-gradient-to-br from-softblue-100 to-softblue-50 border border-softblue-200/40 p-8 rounded-[2rem] flex flex-col justify-between"
          >
            <div className="space-y-3">
              <span className="text-xl">🌟</span>
              <h3 className="text-xl font-serif font-bold text-sand-950 pt-2">
                Pronto(a) para começar?
              </h3>
              <p className="text-sm text-sand-800 leading-relaxed">
                Investir na sua saúde mental é o passo mais importante em direção a uma vida equilibrada e autêntica.
              </p>
            </div>
            
            <button
              onClick={() => {
                const element = document.getElementById('agendamento');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="mt-6 w-full text-center bg-softblue-600 hover:bg-softblue-700 text-white font-medium text-sm py-3 px-6 rounded-xl transition-all duration-300 shadow-sm cursor-pointer"
            >
              Iniciar Agendamento
            </button>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
