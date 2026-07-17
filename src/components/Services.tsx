import { useState } from 'react';
import { User, Heart, Compass, Wind, Clock, Calendar, Laptop, X, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { Service } from '../types';

export default function Services() {
  const { siteContent } = useSiteContent();
  const { services } = siteContent;
  const { whatsappUrl } = siteContent.psychologist_info;
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Map icon strings to Lucide components
  const getIcon = (name: string) => {
    switch (name) {
      case 'User':
        return <User className="h-6 w-6" />;
      case 'Heart':
        return <Heart className="h-6 w-6" />;
      case 'Compass':
        return <Compass className="h-6 w-6" />;
      case 'Wind':
        return <Wind className="h-6 w-6" />;
      default:
        return <User className="h-6 w-6" />;
    }
  };

  const handleOpenModal = (service: Service) => {
    setSelectedService(service);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
  };

  return (
    <section id="servicos" className="py-20 bg-sand-100/50 relative">
      <div className="absolute inset-0 bg-radial-gradient from-white/30 to-transparent -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">SERVIÇOS CLÍNICOS</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Especialidades e Áreas de Atendimento
          </h2>
          <p className="text-base text-sand-800">
            Atendimento 100% online, seguro e confidencial para apoiar sua jornada de desenvolvimento emocional e autoconhecimento.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-sand-200/50 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="p-3.5 bg-sage-50 text-sage-700 w-fit rounded-2xl border border-sage-100">
                  {getIcon(service.iconName)}
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-sand-950">
                  {service.title}
                </h3>
                <p className="text-sand-700 text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-sand-100 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs font-medium text-sand-700">
                  <span className="flex items-center">
                    <Clock size={14} className="mr-1 text-sage-500" />
                    {service.duration}
                  </span>
                  <span className="flex items-center">
                    <Laptop size={14} className="mr-1 text-sage-500" />
                    {service.format}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenModal(service)}
                  className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-sage-700 hover:text-sage-800 hover:underline cursor-pointer group"
                >
                  Saiba mais
                  <ArrowUpRight size={14} className="ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-sand-950/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-sand-200 z-10 flex flex-col max-h-[90vh]"
            >
              {/* Decorative top bar */}
              <div className="h-2 bg-gradient-to-r from-sage-400 to-softblue-300" />

              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-sand-100 text-sand-700 hover:text-sand-950 transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>

              {/* Modal Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 bg-sage-50 text-sage-700 rounded-xl border border-sage-100">
                    {getIcon(selectedService.iconName)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-wider text-sage-600 uppercase font-semibold">SERVIÇO DISPONÍVEL</span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-sand-950">{selectedService.title}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-widest text-sand-700 mb-1.5 font-semibold">Sobre o Tratamento</h4>
                    <p className="text-sand-800 text-sm leading-relaxed whitespace-pre-line">
                      {selectedService.detailedDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-sand-100">
                    <div className="bg-sand-50 p-4 rounded-2xl border border-sand-200/40">
                      <div className="flex items-center space-x-2 text-sage-700 mb-1">
                        <Clock size={16} />
                        <h5 className="text-xs font-semibold">Duração</h5>
                      </div>
                      <p className="text-sm text-sand-800">{selectedService.duration}</p>
                    </div>

                    <div className="bg-sand-50 p-4 rounded-2xl border border-sand-200/40">
                      <div className="flex items-center space-x-2 text-sage-700 mb-1">
                        <Laptop size={16} />
                        <h5 className="text-xs font-semibold">Formato</h5>
                      </div>
                      <p className="text-sm text-sand-800">{selectedService.format}</p>
                    </div>

                    <div className="bg-sand-50 p-4 rounded-2xl border border-sand-200/40">
                      <div className="flex items-center space-x-2 text-sage-700 mb-1">
                        <User size={16} />
                        <h5 className="text-xs font-semibold">Público Alvo</h5>
                      </div>
                      <p className="text-sm text-sand-800">{selectedService.targetAudience}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-sand-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <p className="text-xs text-sand-700">
                    Tem dúvidas adicionais? Podemos conversar diretamente.
                  </p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCloseModal}
                    className="inline-flex items-center justify-center bg-sage-600 hover:bg-sage-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-all duration-300 cursor-pointer shadow-sm text-center"
                  >
                    Agendar Horário
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
