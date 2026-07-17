import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';

export default function Faqs() {
  const { siteContent } = useSiteContent();
  const { faqs } = siteContent;
  const [openId, setOpenId] = useState<string | null>("primeira-consulta");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");

  const categories = ["Todos", "Geral", "Atendimento", "Ética e Segurança", "Financeiro"];

  const filteredFaqs = selectedCategory === "Todos" 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 bg-sand-100/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-sage-600 font-mono">DÚVIDAS FREQUENTES</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Perguntas Frequentes
          </h2>
          <p className="text-sm text-sand-800">
            Esclareça suas principais dúvidas sobre o processo terapêutico, sigilo ético, reembolsos e atendimentos online.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setOpenId(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                  : 'bg-white text-sand-800 border-sand-300/80 hover:bg-sand-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white border border-sand-200/50 rounded-2xl overflow-hidden shadow-sm hover:border-sand-300 transition-colors"
                >
                  {/* Trigger Header */}
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between p-6 text-left font-serif font-bold text-base sm:text-lg text-sand-950 hover:text-sage-700 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center pr-4">
                      <HelpCircle size={18} className="mr-3 text-sage-500 shrink-0" />
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={20} className="text-sage-600 shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-sand-700 shrink-0" />
                    )}
                  </button>

                  {/* Body Content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-6 pt-1 text-sm text-sand-800 leading-relaxed border-t border-sand-100">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </AnimatePresence>

          {filteredFaqs.length === 0 && (
            <p className="text-center text-sand-700 py-12">Nenhuma pergunta encontrada nesta categoria.</p>
          )}
        </div>

      </div>
    </section>
  );
}
