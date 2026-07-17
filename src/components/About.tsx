import { Heart, ShieldCheck, Award, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import defaultAboutImage from '../assets/images/erica_costa_office_1783981376005.jpg';

export default function About() {
  const { siteContent } = useSiteContent();
  const { bioLong, crp, aboutImageUrl } = siteContent.psychologist_info;

  const values = [
    {
      icon: <Heart className="h-6 w-6 text-sage-600" />,
      title: "Escuta Empática",
      description: "Um espaço seguro livre de julgamentos, focado na escuta sincera e atenta ao seu sofrimento."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-sage-600" />,
      title: "Sigilo e Ética",
      description: "Compromisso integral com as diretrizes do Conselho Federal de Psicologia e confidencialidade total."
    },
    {
      icon: <Award className="h-6 w-6 text-sage-600" />,
      title: "Evidência Científica",
      description: "Práticas psicológicas amparadas por estudos, focadas na eficácia clínica comprovada."
    },
    {
      icon: <GraduationCap className="h-6 w-6 text-sage-600" />,
      title: "Desenvolvimento Contínuo",
      description: "Formação acadêmica de excelência e constante atualização técnica para garantir práticas seguras."
    }
  ];

  return (
    <section id="sobre" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main profile row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-20">
          
          {/* Portrait Column */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-sm md:max-w-md aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-sand-200/60 p-2.5 bg-white">
              <img
                src={aboutImageUrl || defaultAboutImage}
                alt="Retrato profissional de Erica Costa"
                className="w-full h-full object-cover rounded-[2rem] object-[center_20%] transition-transform duration-500 hover:scale-[1.02] brightness-[1.01] contrast-[1.02] saturate-[1.01]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-2.5 bg-gradient-to-t from-sand-950/20 via-transparent to-transparent pointer-events-none rounded-[2rem]" />
            </div>
            
            {/* Soft decorative ring */}
            <div className="absolute -inset-4 border border-sage-200/50 rounded-[3.5rem] -z-10 scale-95" />
          </div>

          {/* Biography Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">SOBRE MIM</span>
              <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
                Caminhando ao seu lado em busca de equilíbrio emocional
              </h2>
            </div>

            <p className="text-sand-800 text-base leading-relaxed whitespace-pre-line">
              {bioLong}
            </p>

            {/* Quick credentials tag */}
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="bg-sage-50 text-sage-800 text-xs font-semibold px-4 py-2 rounded-full border border-sage-100">
                Abordagem Humanizada
              </span>
              <span className="bg-softblue-50 text-softblue-800 text-xs font-semibold px-4 py-2 rounded-full border border-softblue-100">
                Atendimento Online
              </span>
              {crp && (
                <span className="bg-sand-50 text-sand-800 text-xs font-semibold px-4 py-2 rounded-full border border-sand-200">
                  {crp}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Values Block */}
        <div className="pt-16 border-t border-sand-100">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">VALORES E PILARES</span>
            <h3 className="text-2xl sm:text-3xl font-serif text-sand-950 font-bold">
              Como conduzo meu trabalho clínico
            </h3>
            <p className="text-sm text-sand-700">
              Diretrizes indispensáveis para garantir que você tenha um atendimento humano, técnico e seguro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((val, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-sand-50 border border-sand-200/60 p-6 rounded-2xl hover:bg-sage-50/40 hover:border-sage-200 transition-all duration-300"
              >
                <div className="p-3 bg-white w-fit rounded-xl shadow-sm mb-4 border border-sand-100">
                  {val.icon}
                </div>
                <h4 className="text-lg font-serif font-bold text-sand-950 mb-2">{val.title}</h4>
                <p className="text-sm text-sand-800 leading-relaxed">{val.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
