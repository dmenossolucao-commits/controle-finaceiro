import React from 'react';
import { Save } from 'lucide-react';
import { motion } from 'motion/react';

interface PerfilTabProps {
  handleSaveProfile: (e: React.FormEvent) => void;
  infoName: string;
  setInfoName: (v: string) => void;
  infoCrp: string;
  setInfoCrp: (v: string) => void;
  infoTagline: string;
  setInfoTagline: (v: string) => void;
  infoBio: string;
  setInfoBio: (v: string) => void;
  infoOfficeHours: string;
  setInfoOfficeHours: (v: string) => void;
  infoEmail: string;
  setInfoEmail: (v: string) => void;
  infoInstagram: string;
  setInfoInstagram: (v: string) => void;
  infoWhatsappMessage: string;
  setInfoWhatsappMessage: (v: string) => void;
}

export default function PerfilTab({
  handleSaveProfile,
  infoName,
  setInfoName,
  infoCrp,
  setInfoCrp,
  infoTagline,
  setInfoTagline,
  infoBio,
  setInfoBio,
  infoOfficeHours,
  setInfoOfficeHours,
  infoEmail,
  setInfoEmail,
  infoInstagram,
  setInfoInstagram,
  infoWhatsappMessage,
  setInfoWhatsappMessage
}: PerfilTabProps) {
  return (
    <motion.div
      key="tab-perfil"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl"
    >
      <form onSubmit={handleSaveProfile} className="bg-white p-8 rounded-3xl border border-sand-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome da Profissional</label>
            <input
              type="text"
              required
              value={infoName}
              onChange={(e) => setInfoName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Registro Profissional (CRP)</label>
            <input
              type="text"
              value={infoCrp}
              onChange={(e) => setInfoCrp(e.target.value)}
              placeholder="Ex: CRP 11/12345"
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Frase Principal / Slogan</label>
          <input
            type="text"
            value={infoTagline}
            onChange={(e) => setInfoTagline(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Biografia Completa (Apresentação)</label>
          <textarea
            rows={5}
            value={infoBio}
            onChange={(e) => setInfoBio(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 leading-relaxed font-serif"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Horário de Atendimento Clínico</label>
            <input
              type="text"
              value={infoOfficeHours}
              onChange={(e) => setInfoOfficeHours(e.target.value)}
              placeholder="Ex: Segunda a Sexta, das 08h às 20h"
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail Clínico de Contato</label>
            <input
              type="email"
              value={infoEmail}
              onChange={(e) => setInfoEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Instagram Clínico</label>
            <input
              type="text"
              value={infoInstagram}
              onChange={(e) => setInfoInstagram(e.target.value)}
              placeholder="Ex: https://instagram.com/dra.ericacosta"
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Mensagem Padrão do WhatsApp</label>
            <input
              type="text"
              value={infoWhatsappMessage}
              onChange={(e) => setInfoWhatsappMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-sand-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white font-bold uppercase text-xs tracking-wider rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Save size={14} />
            <span>Salvar Perfil Clínico</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
