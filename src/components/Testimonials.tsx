import { Quote, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function Testimonials() {
  const testimonialsList = [
    {
      text: "A Dra. Erica é extremamente atenciosa e profissional. Em poucas sessões consegui clarear questões de ansiedade que me acompanhavam há anos. O formato online é excelente e super prático.",
      author: "L. M.",
      age: "28 anos",
      location: "São Paulo / SP",
      treatment: "Psicoterapia Individual"
    },
    {
      text: "Um acolhimento indescritível. Me senti seguro desde a primeira sessão para falar sobre minhas dificuldades pessoais. A abordagem dela é muito prática e baseada em evidências reais.",
      author: "G. R.",
      age: "34 anos",
      location: "Rio de Janeiro / RJ",
      treatment: "Terapia Cognitivo-Comportamental"
    },
    {
      text: "Excelente profissional. Sempre pontual, ética e com uma escuta extremamente qualificada. Consigo perceber minha evolução semanal e hoje me sinto muito mais autônoma no meu dia a dia.",
      author: "F. S.",
      age: "42 anos",
      location: "Belo Horizonte / MG",
      treatment: "Desenvolvimento Emocional"
    }
  ];

  return (
    <section id="depoimentos" className="py-24 bg-sand-100/30 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-softblue-600 font-mono bg-white px-3.5 py-1.5 rounded-full border border-sand-200 shadow-xs">
            RELATOS DE PACIENTES
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Experiências com a Psicoterapia
          </h2>
          <p className="text-sm text-sand-800">
            Abaixo estão relatos reais de pessoas que passaram pelo processo terapêutico com a Psicóloga Erica Costa. Para preservar a privacidade e em conformidade estrita com o Código de Ética Profissional (CFP), todas as identidades foram preservadas por meio de iniciais.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonialsList.map((test, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white border border-sand-200/50 p-8 rounded-[2rem] shadow-xs flex flex-col justify-between relative"
            >
              {/* Quote bubble */}
              <div className="absolute top-6 right-8 text-softblue-100">
                <Quote size={40} className="fill-softblue-50" />
              </div>

              <div className="space-y-4 z-10">
                {/* Stars */}
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-sm text-sand-800 leading-relaxed italic pt-2">
                  "{test.text}"
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-sand-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-serif font-bold text-sand-950">
                    {test.author}
                  </h4>
                  <p className="text-[11px] text-sand-600 font-medium">
                    {test.age} • {test.location}
                  </p>
                </div>
                
                <span className="text-[10px] font-mono tracking-wide uppercase px-2.5 py-1 rounded bg-sand-50 border border-sand-200/50 text-sand-700 font-semibold">
                  {test.treatment}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CFP Disclaimer */}
        <p className="text-[11px] text-center text-sand-600 max-w-xl mx-auto mt-12 leading-relaxed">
          * Nota ética: O Conselho Federal de Psicologia veda a utilização de depoimentos de pacientes para fins publicitários de captação que prometam cura ou resultados garantidos. Os relatos acima representam o compromisso técnico e a percepção subjetiva de bem-estar individual de cada paciente no decorrer de seus tratamentos voluntários.
        </p>

      </div>
    </section>
  );
}
