import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { contentService } from '../services/contentService';
import { ContactMessage } from '../types';

interface ContactProps {
  onMessageAdded?: () => void;
}

export default function Contact({ onMessageAdded }: ContactProps) {
  const { siteContent } = useSiteContent();
  const { location, email, phoneFormatted, whatsappUrl, instagramUrl } = siteContent.psychologist_info;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Agendamento de Sessão",
    message: ""
  });

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus('error');
      setErrorMessage("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    try {
      const newMessage = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        date: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: 'pending' as const
      };

      await contentService.createLeadMessage(newMessage);

      // Update state and call callback
      setStatus('success');
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "Agendamento de Sessão",
        message: ""
      });
      onMessageAdded?.();

      // Clear success state after 6 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 6000);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage("Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    }
  };

  return (
    <section id="contato" className="py-20 bg-sand-50/70 relative">
      <div className="absolute inset-0 bg-radial-gradient from-white/30 to-transparent -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-dusty-600 font-mono">CONTATO & AGENDAMENTO</span>
          <h2 className="text-3xl sm:text-4xl font-serif text-sand-950 font-bold">
            Dê o Primeiro Passo Hoje
          </h2>
          <p className="text-sm text-sand-800">
            Preencha o formulário abaixo ou fale diretamente via WhatsApp. Responderei sua mensagem de forma sigilosa em até 24 horas úteis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Info Side Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white border border-sand-200/50 p-8 rounded-3xl shadow-sm space-y-6">
              <h3 className="text-2xl font-serif font-bold text-sand-950">Atendimento 100% Online</h3>
              <p className="text-sm text-sand-850 leading-relaxed">
                A psicoterapia online é regulamentada pelo Conselho Federal de Psicologia (CFP) e permite que você receba suporte profissional qualificado, sigiloso e humanizado diretamente da sua casa, sem barreiras geográficas.
              </p>

              <div className="space-y-4 pt-4 border-t border-sand-100">
                {/* Modality Status */}
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-dusty-50 text-dusty-600 rounded-xl shrink-0 border border-dusty-100">
                    <CheckCircle2 size={20} className="text-dusty-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-sand-950 font-serif">Modalidade de Atendimento</h4>
                    <p className="text-xs text-sand-800 leading-relaxed mt-0.5">{location}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-dusty-50 text-dusty-600 rounded-xl shrink-0 border border-dusty-100">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-sand-950 font-serif">E-mail Profissional</h4>
                    <p className="text-xs text-sand-800 leading-relaxed mt-0.5">{email}</p>
                  </div>
                </div>

                {/* Phone */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start space-x-3.5 group hover:bg-dusty-50/20 p-2 -m-2 rounded-2xl transition-all duration-300"
                >
                  <div className="p-3 bg-dusty-50 text-dusty-600 rounded-xl shrink-0 border border-dusty-100 group-hover:bg-dusty-100 transition-colors">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-sand-950 font-serif group-hover:text-dusty-700 transition-colors">WhatsApp / Telefone</h4>
                    <p className="text-xs text-sand-800 leading-relaxed mt-0.5 font-medium group-hover:underline">{phoneFormatted}</p>
                  </div>
                </a>

                {/* Instagram */}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start space-x-3.5 group hover:bg-dusty-50/20 p-2 -m-2 rounded-2xl transition-all duration-300"
                >
                  <div className="p-3 bg-dusty-50 text-dusty-600 rounded-xl shrink-0 border border-dusty-100 group-hover:bg-dusty-100 transition-colors">
                    <Instagram size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-sand-950 font-serif group-hover:text-dusty-700 transition-colors">Instagram Oficial</h4>
                    <p className="text-xs text-sand-800 leading-relaxed mt-0.5 font-medium group-hover:underline">
                      {instagramUrl && instagramUrl.includes('instagram.com/') ? `@${instagramUrl.split('instagram.com/')[1].replace('/', '')}` : 'Instagram'}
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Ethical Board Guidance */}
            <div className="bg-dusty-50/60 border border-dusty-100 p-6 rounded-3xl shadow-sm space-y-3">
              <h4 className="text-sm font-serif font-bold text-dusty-900 font-serif">Segurança &amp; Ética</h4>
              <p className="text-xs text-sand-800 leading-relaxed">
                Suas sessões ocorrem por meio de uma plataforma com criptografia de ponta a ponta, assegurando total sigilo, privacidade e segurança para você partilhar o que precisar.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 bg-white border border-sand-200/50 p-8 rounded-3xl shadow-sm">
            <h3 className="text-2xl font-serif font-bold text-sand-950 mb-6">Formulário de Mensagem</h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-sand-900">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-1 focus:ring-dusty-400 focus:border-dusty-400"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-sand-900">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-1 focus:ring-dusty-400 focus:border-dusty-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-sand-900">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-1 focus:ring-dusty-400 focus:border-dusty-400"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-xs font-semibold text-sand-900">
                    Assunto do Contato
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-1 focus:ring-dusty-400 focus:border-dusty-400 bg-white"
                  >
                    <option value="Agendamento de Sessão">Agendamento de Sessão</option>
                    <option value="Dúvida Geral">Dúvida Geral</option>
                    <option value="Psicoterapia Online">Psicoterapia Online</option>
                    <option value="Orientação de Carreira">Orientação de Carreira</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label htmlFor="message" className="text-xs font-semibold text-sand-900">
                  Sua Mensagem <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Escreva brevemente o que te traz por aqui..."
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-sand-300 focus:outline-none focus:ring-1 focus:ring-dusty-400 focus:border-dusty-400"
                />
              </div>

              {/* Status Alert displays */}
              <AnimatePresence mode="wait">
                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center space-x-2.5"
                  >
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span>
                      Mensagem enviada com sucesso! Erica retornará o contato o mais rápido possível através do seu e-mail ou WhatsApp.
                    </span>
                  </motion.div>
                )}

                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center space-x-2.5"
                  >
                    <AlertCircle size={18} className="text-rose-500 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-6 bg-dusty-600 hover:bg-dusty-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Enviar Mensagem</span>
                <Send size={16} />
              </button>

            </form>
          </div>

        </div>

      </div>
    </section>
  );
}
