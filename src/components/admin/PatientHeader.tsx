import React from 'react';
import { User, Phone, Mail, Calendar, CreditCard, ShieldAlert } from 'lucide-react';
import { Patient } from '../../types';

interface PatientHeaderProps {
  patient: Patient;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient }) => {
  const getAge = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return 'Não informada';
    try {
      const [year, month, day] = dateString.split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const age = getAge(patient.dataNascimento || patient.dateOfBirth);

  return (
    <div id="patient-header-card" className="bg-gradient-to-br from-sand-50/50 to-white p-6 rounded-2xl border border-sand-200/65 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-softblue-50 text-softblue-600 border border-softblue-100 flex items-center justify-center font-bold text-lg font-serif">
            {patient.nome ? patient.nome.charAt(0).toUpperCase() : patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-serif font-bold text-sand-950">
                {patient.nome || patient.name}
              </h2>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                (patient.status || 'Ativo') === 'Ativo'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-sand-100 text-sand-600 border-sand-200'
              }`}>
                {patient.status || 'Ativo'}
              </span>
            </div>
            <p className="text-[10px] text-sand-500 font-mono mt-0.5 font-semibold uppercase tracking-widest">
              Prontuário de Paciente • ID: {patient.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
        <div className="flex items-center gap-2.5 text-sand-700">
          <Phone size={14} className="text-sand-400 shrink-0" />
          <div>
            <p className="text-[9px] uppercase font-mono font-bold text-sand-400 tracking-wider">Telefone</p>
            <p className="font-semibold font-mono">{patient.telefone || patient.phone || 'Não informado'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-sand-700">
          <Mail size={14} className="text-sand-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase font-mono font-bold text-sand-400 tracking-wider">E-mail</p>
            <p className="font-semibold truncate" title={patient.email || 'Não informado'}>{patient.email || 'Não informado'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-sand-700">
          <Calendar size={14} className="text-sand-400 shrink-0" />
          <div>
            <p className="text-[9px] uppercase font-mono font-bold text-sand-400 tracking-wider">Nascimento</p>
            <p className="font-semibold">
              {formatBirthDate(patient.dataNascimento || patient.dateOfBirth)}
              {age !== null && <span className="text-sand-500 font-mono text-[10px] ml-1">({age} anos)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-sand-700">
          <CreditCard size={14} className="text-sand-400 shrink-0" />
          <div>
            <p className="text-[9px] uppercase font-mono font-bold text-sand-400 tracking-wider">Convênio / CPF</p>
            <p className="font-semibold">
              {patient.convenio || 'Particular'}
              {patient.cpf && <span className="text-sand-400 font-mono text-[10px] block font-normal">{patient.cpf}</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
