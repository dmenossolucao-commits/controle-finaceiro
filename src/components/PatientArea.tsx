import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, CheckCircle2, AlertCircle, XCircle, Search, Copy, Printer, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { contentService } from '../services/contentService';

interface PatientAreaProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PatientArea({ isOpen, onClose }: PatientAreaProps) {
  const { siteContent } = useSiteContent();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  
  // Reschedule state
  const [reschedulingAppt, setReschedulingAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Receipt state
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  // Copy meeting link feedback
  const [copiedApptId, setCopiedApptId] = useState<string | null>(null);

  // Load agenda metadata for rescheduling
  useEffect(() => {
    if (reschedulingAppt) {
      const loadMetadata = async () => {
        try {
          const blocks = await contentService.getBlockedSlots();
          const bookings = await contentService.getAppointments();
          setBlockedSlots(blocks);
          setExistingBookings(bookings);
        } catch (err) {
          console.error("Error loading metadata:", err);
        }
      };
      loadMetadata();
    }
  }, [reschedulingAppt]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Por favor, informe seu e-mail ou telefone.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const allAppts = await contentService.getAppointments();
      const query = searchQuery.toLowerCase().trim();
      const cleanedPhone = query.replace(/\D/g, '');

      const matched = allAppts.filter(appt => {
        const apptEmail = (appt.patientEmail || '').toLowerCase().trim();
        const apptPhone = (appt.patientPhone || '').replace(/\D/g, '');
        
        return (
          apptEmail === query || 
          (cleanedPhone && apptPhone.includes(cleanedPhone)) ||
          appt.id.toLowerCase().includes(query)
        );
      });

      setAppointments(matched);
      setIsSearched(true);
    } catch (err: any) {
      setError('Erro ao buscar consultas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta consulta? O horário será liberado para outros pacientes.')) {
      return;
    }
    setLoading(true);
    try {
      await contentService.updateAppointment(apptId, { status: 'cancelled' });
      // Refresh list
      const allAppts = await contentService.getAppointments();
      const query = searchQuery.toLowerCase().trim();
      const cleanedPhone = query.replace(/\D/g, '');
      const matched = allAppts.filter(appt => {
        const apptEmail = (appt.patientEmail || '').toLowerCase().trim();
        const apptPhone = (appt.patientPhone || '').replace(/\D/g, '');
        return apptEmail === query || (cleanedPhone && apptPhone.includes(cleanedPhone)) || appt.id.toLowerCase().includes(query);
      });
      setAppointments(matched);
    } catch (err) {
      alert('Erro ao cancelar consulta.');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleSlot) {
      setRescheduleError('Por favor, selecione data e horário.');
      return;
    }
    setLoading(true);
    setRescheduleError('');

    try {
      await contentService.updateAppointment(reschedulingAppt.id, {
        date: rescheduleDate,
        timeSlot: rescheduleSlot
      });
      
      setReschedulingAppt(null);
      setRescheduleDate('');
      setRescheduleSlot('');
      
      // Refresh list
      const allAppts = await contentService.getAppointments();
      const query = searchQuery.toLowerCase().trim();
      const cleanedPhone = query.replace(/\D/g, '');
      const matched = allAppts.filter(appt => {
        const apptEmail = (appt.patientEmail || '').toLowerCase().trim();
        const apptPhone = (appt.patientPhone || '').replace(/\D/g, '');
        return apptEmail === query || (cleanedPhone && apptPhone.includes(cleanedPhone)) || appt.id.toLowerCase().includes(query);
      });
      setAppointments(matched);
    } catch (err: any) {
      setRescheduleError('Erro ao reagendar consulta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyMeetingLink = (apptId: string) => {
    const link = `https://meet.jit.si/EricaCosta_Consulta_${apptId}`;
    navigator.clipboard.writeText(link);
    setCopiedApptId(apptId);
    setTimeout(() => setCopiedApptId(null), 2000);
  };

  const getDayOfWeekName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayIndex = date.getDay();
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
    return days[dayIndex];
  };

  const getAvailableSlotsForReschedule = () => {
    if (!rescheduleDate) return [];
    
    const dayOfWeekName = getDayOfWeekName(rescheduleDate);
    const defaultAgenda = {
      segunda: { enabled: true, start: "08:00", end: "12:00" },
      terca: { enabled: true, start: "14:00", end: "18:00" },
      quarta: { enabled: true, start: "08:00", end: "18:00" },
      quinta: { enabled: true, start: "08:00", end: "18:00" },
      sexta: { enabled: true, start: "09:00", end: "16:00" },
      sabado: { enabled: false, start: "08:00", end: "12:00" },
      domingo: { enabled: false, start: "08:00", end: "12:00" }
    };
    
    const dayConfig = siteContent.agenda_config?.[dayOfWeekName] || defaultAgenda[dayOfWeekName];
    if (!dayConfig || !dayConfig.enabled) return [];

    const slots: string[] = [];
    try {
      const startHour = parseInt(dayConfig.start.split(':')[0], 10);
      const endHour = parseInt(dayConfig.end.split(':')[0], 10);
      for (let hour = startHour; hour < endHour; hour++) {
        const formattedHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
        slots.push(formattedHour);
      }
    } catch (e) {
      return [];
    }
    
    return slots.filter(slot => {
      const isBlocked = blockedSlots.some(b => b.date === rescheduleDate && b.timeSlot === slot);
      if (isBlocked) return false;

      const isBooked = existingBookings.some(appt => 
        appt.date === rescheduleDate && 
        appt.timeSlot === slot && 
        appt.id !== reschedulingAppt?.id && // allow original slot
        (appt.status === 'confirmed' || appt.status === 'pending_payment')
      );
      if (isBooked) return false;

      return true;
    });
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-sand-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl border border-sand-200/60 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-sand-50 border-b border-sand-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-serif font-bold text-sand-950 flex items-center gap-2">
              <Calendar className="text-sage-600" size={20} />
              Área do Paciente
            </h2>
            <p className="text-xs text-sand-600">Consulte, reagende ou cancele seus atendimentos</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-sand-200 text-sand-500 hover:text-sand-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isSearched ? (
            /* Lookup screen */
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="bg-sage-50/50 rounded-2xl p-5 border border-sage-100/50">
                <p className="text-sm text-sand-800 leading-relaxed">
                  Digite o <strong>e-mail</strong> ou <strong>telefone</strong> informado no momento do agendamento para localizar suas sessões marcadas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2 font-mono">
                  E-mail ou WhatsApp
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="exemplo@email.com ou (85) 99999-9999"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-600 bg-white text-sand-900 text-sm font-medium"
                  />
                  <Search className="absolute left-4 top-3.5 text-sand-400" size={18} />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Localizar Consultas</span>
                </button>
              </div>
            </form>
          ) : (
            /* Dashboard screen */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sand-500">
                  {appointments.length} CONSULTA(S) ENCONTRADA(S)
                </span>
                <button
                  onClick={() => {
                    setIsSearched(false);
                    setAppointments([]);
                    setSearchQuery('');
                  }}
                  className="text-xs text-sage-600 hover:text-sage-700 font-semibold flex items-center gap-1"
                >
                  <Search size={12} />
                  Buscar com outro e-mail
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-sand-200 bg-sand-50/30 rounded-2xl">
                  <XCircle className="mx-auto text-sand-300 mb-2" size={40} />
                  <p className="text-sm text-sand-800 font-semibold">Nenhum agendamento encontrado.</p>
                  <p className="text-xs text-sand-500 mt-1">Verifique se informou o mesmo e-mail/celular usado na reserva.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt) => {
                    const isUpcoming = new Date(appt.date + 'T23:59:59') >= new Date();
                    
                    return (
                      <div
                        key={appt.id}
                        className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          appt.status === 'cancelled'
                            ? 'bg-sand-50/50 border-sand-200 text-sand-400'
                            : 'bg-white border-sand-200/80 shadow-sm'
                        }`}
                      >
                        {/* Status badge */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-serif font-bold text-sand-950">
                            {appt.serviceTitle}
                          </span>
                          
                          {appt.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle2 size={12} /> Confirmado
                            </span>
                          )}
                          {appt.status === 'pending_payment' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                              <AlertCircle size={12} /> Aguardando Pagamento
                            </span>
                          )}
                          {appt.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sand-100 text-sand-500 border border-sand-200">
                              <XCircle size={12} /> Cancelado
                            </span>
                          )}
                        </div>

                        {/* Date and hour details */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono text-sand-700 mb-4 bg-sand-50/60 p-3 rounded-xl border border-sand-100/50">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-sand-400" />
                            <span>{formatDateBR(appt.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-sand-400" />
                            <span>{appt.timeSlot}</span>
                          </div>
                        </div>

                        {/* Actions row */}
                        {appt.status !== 'cancelled' && (
                          <div className="pt-2 border-t border-sand-100/60 flex flex-wrap gap-2 justify-between items-center">
                            
                            {/* Copy video meet link for confirmed */}
                            {appt.status === 'confirmed' && (
                              <div className="flex items-center gap-1.5 w-full sm:w-auto mb-2 sm:mb-0">
                                <span className="p-1.5 bg-sage-50 text-sage-600 rounded-lg">
                                  <Video size={14} />
                                </span>
                                <button
                                  onClick={() => copyMeetingLink(appt.id)}
                                  className="text-xs font-semibold text-sage-700 hover:text-sage-800 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedApptId === appt.id ? 'Copiado!' : 'Copiar link da chamada'}
                                  <Copy size={12} />
                                </button>
                              </div>
                            )}

                            {appt.status === 'pending_payment' && (
                              <p className="text-xs text-amber-800 font-medium">
                                Realize o pagamento para confirmar este horário.
                              </p>
                            )}

                            {/* Standard actions */}
                            <div className="flex gap-2 ml-auto">
                              {appt.status === 'confirmed' && (
                                <button
                                  onClick={() => setViewingReceipt(appt)}
                                  className="px-3 py-1.5 border border-sand-200 hover:bg-sand-50 rounded-lg text-[11px] font-bold text-sand-700 flex items-center gap-1 cursor-pointer"
                                  title="Visualizar Recibo"
                                >
                                  <FileText size={12} />
                                  <span>Recibo</span>
                                </button>
                              )}

                              {isUpcoming && (
                                <>
                                  <button
                                    onClick={() => {
                                      setReschedulingAppt(appt);
                                      setRescheduleDate(appt.date);
                                      setRescheduleSlot(appt.timeSlot);
                                    }}
                                    className="px-3 py-1.5 border border-sage-200 text-sage-700 hover:bg-sage-50 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    Reagendar
                                  </button>
                                  <button
                                    onClick={() => handleCancelAppointment(appt.id)}
                                    className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reschedule Panel Drawer Modal */}
        <AnimatePresence>
          {reschedulingAppt && (
            <div className="fixed inset-0 z-55 bg-sand-950/40 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl border border-sand-200 max-w-md w-full overflow-hidden"
              >
                <div className="px-5 py-4 bg-sand-50 border-b border-sand-150 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-sand-950 text-base">Reagendar Consulta</h3>
                    <p className="text-[11px] text-sand-600">Selecione uma nova data e horário livre</p>
                  </div>
                  <button
                    onClick={() => setReschedulingAppt(null)}
                    className="p-1 rounded-full hover:bg-sand-200 text-sand-500"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleRescheduleSubmit} className="p-5 space-y-4">
                  {rescheduleError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl">
                      {rescheduleError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-1.5 font-mono">
                      Nova Data
                    </label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setRescheduleDate(e.target.value);
                        setRescheduleSlot('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 text-sm font-medium focus:outline-none focus:border-sage-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-1.5 font-mono">
                      Horários Disponíveis
                    </label>
                    {!rescheduleDate ? (
                      <p className="text-xs text-sand-500">Selecione uma data para carregar os horários.</p>
                    ) : getAvailableSlotsForReschedule().length === 0 ? (
                      <p className="text-xs text-rose-700 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100">
                        Nenhum horário livre para esta data.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {getAvailableSlotsForReschedule().map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setRescheduleSlot(slot)}
                            className={`py-1.5 rounded-lg text-center font-mono text-xs font-semibold border transition-all ${
                              rescheduleSlot === slot
                                ? 'bg-sage-600 border-sage-600 text-white font-bold'
                                : 'bg-white border-sand-200 text-sand-800 hover:border-sage-500'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-sand-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReschedulingAppt(null)}
                      className="px-4 py-2 border border-sand-200 text-sand-700 rounded-xl text-xs font-bold uppercase"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !rescheduleSlot}
                      className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50"
                    >
                      Confirmar Alteração
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Receipt Print Dialog */}
        <AnimatePresence>
          {viewingReceipt && (
            <div className="fixed inset-0 z-55 bg-sand-950/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col"
              >
                {/* Receipt actions bar */}
                <div className="px-5 py-3 bg-sand-50 border-b border-sand-150 flex justify-between items-center shrink-0">
                  <span className="text-xs font-mono font-bold text-sand-500">RECIBO DIGITAL</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-sage-700 hover:bg-sage-50 rounded-lg flex items-center gap-1 text-xs font-bold cursor-pointer"
                      title="Imprimir Recibo"
                    >
                      <Printer size={16} /> Imprimir
                    </button>
                    <button
                      onClick={() => setViewingReceipt(null)}
                      className="p-1.5 hover:bg-sand-200 text-sand-500 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Styled Printable Receipt Block */}
                <div id="printable-receipt" className="p-8 md:p-12 text-sand-950 bg-white leading-relaxed font-sans text-left space-y-8">
                  
                  {/* Receipt Header */}
                  <div className="text-center pb-6 border-b border-sand-300">
                    <h1 className="text-xl font-serif font-extrabold tracking-wide text-sand-900 uppercase">
                      Recibo de Prestação de Serviços
                    </h1>
                    <p className="text-xs text-sand-600 mt-1 font-mono uppercase">
                      Psicologia Clínica & Acolhimento Online
                    </p>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-6 text-sm">
                    <p>
                      Declaramos para os devidos fins de direito e reembolso de convênio médico que a paciente{' '}
                      <strong>{viewingReceipt.patientName}</strong> realizou consulta psicoterapêutica online com duração de 50 minutos.
                    </p>

                    <table className="w-full text-left border-collapse border border-sand-200 rounded-lg overflow-hidden">
                      <tbody>
                        <tr className="border-b border-sand-200">
                          <td className="p-3 bg-sand-50 font-semibold w-1/3 text-sand-700">Serviço Prestado:</td>
                          <td className="p-3 text-sand-950">{viewingReceipt.serviceTitle}</td>
                        </tr>
                        <tr className="border-b border-sand-200">
                          <td className="p-3 bg-sand-50 font-semibold text-sand-700">Data do Atendimento:</td>
                          <td className="p-3 text-sand-950">{formatDateBR(viewingReceipt.date)} às {viewingReceipt.timeSlot}</td>
                        </tr>
                        <tr className="border-b border-sand-200">
                          <td className="p-3 bg-sand-50 font-semibold text-sand-700">Valor Pago:</td>
                          <td className="p-3 font-mono text-emerald-800 font-bold">R$ {viewingReceipt.amount},00</td>
                        </tr>
                        <tr>
                          <td className="p-3 bg-sand-50 font-semibold text-sand-700">Forma de Pagamento:</td>
                          <td className="p-3 uppercase text-sand-950">{viewingReceipt.paymentType || 'Pix'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Psychologist details & signature line */}
                  <div className="pt-10 flex flex-col items-center justify-center text-center space-y-2 border-t border-sand-150">
                    <div className="w-48 h-px bg-sand-400" />
                    <p className="text-sm font-bold text-sand-900">Psicóloga {siteContent.psychologist_info.name}</p>
                    {siteContent.psychologist_info.crp && (
                      <p className="text-xs text-sand-600 font-mono">CRP: {siteContent.psychologist_info.crp}</p>
                    )}
                    <p className="text-[10px] text-sand-500 italic max-w-xs mt-1 leading-normal">
                      Documento assinado digitalmente nos termos do CFP. Válido para declaração de imposto de renda.
                    </p>
                  </div>

                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
