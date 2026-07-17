import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Check, X, Trash2, ChevronLeft, ChevronRight, Plus, 
  MapPin, AlertCircle, Edit3, DollarSign, Filter, FileText, CheckCircle, ArrowRight, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment, Patient, FinancialTransaction } from '../../types';
import { contentService } from '../../services/contentService';

interface AgendaTabProps {
  patients: Patient[];
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
  siteContent: any;
}

export default function AgendaTab({ patients, appointments, onRefresh, siteContent }: AgendaTabProps) {
  // Navigation states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  
  // Weekly Schedule Toggle
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [agendaSeg, setAgendaSeg] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaTer, setAgendaTer] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaQua, setAgendaQua] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaQui, setAgendaQui] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaSex, setAgendaSex] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaSab, setAgendaSab] = useState({ enabled: false, start: '08:00', end: '12:00' });
  const [agendaDom, setAgendaDom] = useState({ enabled: false, start: '08:00', end: '12:00' });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Form states for booking/rescheduling
  const [formPatientId, setFormPatientId] = useState('');
  const [formCustomName, setFormCustomName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formDuration, setFormDuration] = useState(50);
  const [formModality, setFormModality] = useState<'Online' | 'Presencial'>('Online');
  const [formAmount, setFormAmount] = useState(150);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<any>('confirmada');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'PIX' | 'Cartão' | 'Dinheiro' | 'Transferência'>('PIX');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load configuration if available
  useEffect(() => {
    if (siteContent && siteContent.agenda_config) {
      const cfg = siteContent.agenda_config;
      setAgendaSeg(cfg.segunda || { enabled: true, start: '08:00', end: '18:00' });
      setAgendaTer(cfg.terca || { enabled: true, start: '08:00', end: '18:00' });
      setAgendaQua(cfg.quarta || { enabled: true, start: '08:00', end: '18:00' });
      setAgendaQui(cfg.quinta || { enabled: true, start: '08:00', end: '18:00' });
      setAgendaSex(cfg.sexta || { enabled: true, start: '08:00', end: '18:00' });
      setAgendaSab(cfg.sabado || { enabled: false, start: '08:00', end: '12:00' });
      setAgendaDom(cfg.domingo || { enabled: false, start: '08:00', end: '12:00' });
    }
  }, [siteContent]);

  // Calculate duration when start/end times change
  useEffect(() => {
    if (formStartTime && formEndTime) {
      const [startH, startM] = formStartTime.split(':').map(Number);
      const [endH, endM] = formEndTime.split(':').map(Number);
      if (!isNaN(startH) && !isNaN(endH)) {
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        if (endTotal > startTotal) {
          setFormDuration(endTotal - startTotal);
        }
      }
    }
  }, [formStartTime, formEndTime]);

  // Handle Weekly Grid Save
  const handleSaveWeeklySchedule = async () => {
    setLoading(true);
    try {
      const config = {
        segunda: agendaSeg,
        terca: agendaTer,
        quarta: agendaQua,
        quinta: agendaQui,
        sexta: agendaSex,
        sabado: agendaSab,
        domingo: agendaDom
      };
      await contentService.updateSiteContent({ agenda_config: config });
      setSuccessMsg('Grade Semanal atualizada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar grade semanal: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Map appointment status to Portuguese labels & colors
  const statusConfig: Record<string, { label: string, badge: string, color: string, indicator: string }> = {
    'confirmed': { label: 'Confirmada', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', color: '#10b981', indicator: '🟢' },
    'confirmada': { label: 'Confirmada', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', color: '#10b981', indicator: '🟢' },
    'pending_payment': { label: 'Pendente', badge: 'bg-amber-50 text-amber-800 border-amber-200', color: '#f59e0b', indicator: '🟡' },
    'pendente': { label: 'Pendente', badge: 'bg-amber-50 text-amber-800 border-amber-200', color: '#f59e0b', indicator: '🟡' },
    'remarcada': { label: 'Remarcada', badge: 'bg-sky-50 text-sky-800 border-sky-200', color: '#0ea5e9', indicator: '🔵' },
    'cancelled': { label: 'Cancelada', badge: 'bg-rose-50 text-rose-800 border-rose-200', color: '#ef4444', indicator: '🔴' },
    'cancelada': { label: 'Cancelada', badge: 'bg-rose-50 text-rose-800 border-rose-200', color: '#ef4444', indicator: '🔴' },
    'nao_compareceu': { label: 'Não Compareceu', badge: 'bg-slate-100 text-slate-800 border-slate-300', color: '#64748b', indicator: '⚫' }
  };

  const getStatusDetails = (status: string) => {
    return statusConfig[status] || { label: 'Pendente', badge: 'bg-amber-50 text-amber-800 border-amber-200', color: '#f59e0b', indicator: '🟡' };
  };

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Fetch current week date range
  const getWeekDays = () => {
    const days = [];
    const temp = new Date(currentDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    temp.setDate(diff);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return days;
  };

  // Open modal for a new slot click
  const handleCellClick = (dateStr: string, timeStr?: string) => {
    setSelectedAppointment(null);
    setFormPatientId('');
    setFormCustomName('');
    setFormDate(dateStr);
    setFormStartTime(timeStr || '09:00');
    // Default 1 hour later
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      const nextHour = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setFormEndTime(nextHour);
    } else {
      setFormEndTime('10:00');
    }
    setFormModality('Online');
    setFormAmount(150);
    setFormDiscount(0);
    setFormNotes('');
    setFormStatus('confirmada');
    setFormPaymentMethod('PIX');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open modal for editing an appointment
  const handleEditAppointment = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setFormPatientId(appt.patientId || '');
    setFormCustomName(appt.patientName);
    setFormDate(appt.date);
    setFormStartTime(appt.timeSlot);
    setFormEndTime(appt.endTime || appt.timeSlot);
    setFormModality(appt.modality || 'Online');
    setFormAmount(appt.amount || 150);
    setFormDiscount(appt.discount || 0);
    setFormNotes(appt.notes || '');
    setFormStatus(appt.status || 'confirmada');
    setFormPaymentMethod((appt.paymentType as any) || 'PIX');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Submit appointment creation or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Form validation
    if (!formPatientId && !formCustomName) {
      setErrorMsg('Selecione um paciente cadastrado ou insira o nome de um novo paciente.');
      setLoading(false);
      return;
    }

    let finalPatientName = formCustomName;
    let finalPatientEmail = '';
    let finalPatientPhone = '';

    if (formPatientId) {
      const pt = patients.find(p => p.id === formPatientId);
      if (pt) {
        finalPatientName = pt.nome || pt.name;
        finalPatientEmail = pt.email || '';
        finalPatientPhone = pt.whatsapp || pt.telefone || pt.phone || '';
      }
    }

    const apptData: Omit<Appointment, 'id'> = {
      serviceId: 'session',
      serviceTitle: `Sessão de Psicoterapia - ${formModality}`,
      patientName: finalPatientName,
      patientEmail: finalPatientEmail,
      patientPhone: finalPatientPhone,
      patientId: formPatientId || undefined,
      date: formDate,
      timeSlot: formStartTime,
      endTime: formEndTime,
      duration: formDuration,
      modality: formModality,
      amount: formAmount,
      discount: formDiscount,
      status: formStatus,
      paymentType: formPaymentMethod,
      notes: formNotes,
      createdAt: selectedAppointment ? selectedAppointment.createdAt : Date.now()
    };

    try {
      let savedAppt: Appointment;
      
      if (selectedAppointment) {
        // Update Appointment in Firestore
        await contentService.updateAppointment(selectedAppointment.id, apptData);
        savedAppt = { ...apptData, id: selectedAppointment.id };

        // Real-time Finance Integration: Sync matching financial transaction
        const txs = await contentService.getFinancialTransactions();
        const existingTx = txs.find(t => t.appointmentId === selectedAppointment.id);
        
        const finalTxStatus = (formStatus === 'confirmada' || formStatus === 'confirmed') ? 'Pago' :
                              (formStatus === 'cancelada' || formStatus === 'cancelled') ? 'Cancelado' :
                              (formStatus === 'remarcada') ? 'Pendente' : 'Pendente';

        if (existingTx) {
          await contentService.updateFinancialTransaction(existingTx.id, {
            amount: formAmount - formDiscount,
            discount: formDiscount,
            status: finalTxStatus,
            paymentMethod: formPaymentMethod,
            date: formDate,
            notes: formNotes,
            patientName: finalPatientName,
            patientId: formPatientId || 'avulso'
          });
        } else {
          // If transaction didn't exist, create it now
          await contentService.createFinancialTransaction({
            appointmentId: selectedAppointment.id,
            patientId: formPatientId || 'avulso',
            patientName: finalPatientName,
            amount: formAmount - formDiscount,
            discount: formDiscount,
            date: formDate,
            status: finalTxStatus,
            paymentMethod: formPaymentMethod,
            notes: formNotes,
            createdAt: Date.now()
          });
        }
      } else {
        // Create new Appointment in Firestore
        savedAppt = await contentService.createAppointment(apptData);

        // Real-time Finance Integration: Auto-generate financial transaction
        const finalTxStatus = (formStatus === 'confirmada' || formStatus === 'confirmed') ? 'Pago' : 'Pendente';
        await contentService.createFinancialTransaction({
          appointmentId: savedAppt.id,
          patientId: formPatientId || 'avulso',
          patientName: finalPatientName,
          amount: formAmount - formDiscount,
          discount: formDiscount,
          date: formDate,
          status: finalTxStatus,
          paymentMethod: formPaymentMethod,
          notes: formNotes,
          createdAt: Date.now()
        });
      }

      setSuccessMsg(selectedAppointment ? 'Consulta remarcada com sucesso!' : 'Consulta agendada com sucesso!');
      setIsModalOpen(false);
      await onRefresh();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao agendar consulta: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Delete appointment
  const handleDelete = async () => {
    if (!selectedAppointment) return;
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente este agendamento?')) return;
    
    setLoading(true);
    try {
      // Delete appointment
      await contentService.deleteAppointment(selectedAppointment.id);

      // Delete linked financial transaction
      const txs = await contentService.getFinancialTransactions();
      const linkedTx = txs.find(t => t.appointmentId === selectedAppointment.id);
      if (linkedTx) {
        await contentService.deleteFinancialTransaction(linkedTx.id);
      }

      setSuccessMsg('Agendamento excluído com sucesso.');
      setIsModalOpen(false);
      await onRefresh();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg('Erro ao deletar: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(appt => {
    if (selectedStatusFilter === 'all') return true;
    return appt.status === selectedStatusFilter;
  });

  // Render DAY view
  const renderDayView = () => {
    const dateStr = currentDate.toISOString().substring(0, 10);
    const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
    const hours = Array.from({ length: 13 }).map((_, i) => `${String(8 + i).padStart(2, '0')}:00`);

    return (
      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-sand-50/50 p-4 border-b border-sand-200 flex justify-between items-center">
          <span className="text-xs font-mono font-bold text-sand-500 uppercase">Horários da Grade</span>
          <span className="text-xs font-serif font-semibold text-sand-950">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="divide-y divide-sand-100">
          {hours.map((hour) => {
            const hourAppts = dayAppts.filter(a => a.timeSlot.startsWith(hour.substring(0, 3)));
            return (
              <div key={hour} className="flex min-h-[70px] hover:bg-sand-50/20 transition-all group">
                <div className="w-20 p-3 text-right font-mono text-xs font-semibold text-sand-400 border-r border-sand-100 flex items-start justify-end pt-4">
                  {hour}
                </div>
                <div className="flex-1 p-3 flex flex-wrap gap-2 relative">
                  {hourAppts.map((appt) => {
                    const statusInfo = getStatusDetails(appt.status);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => handleEditAppointment(appt)}
                        className={`p-3 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all w-full md:max-w-xl text-xs ${statusInfo.badge}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-serif font-bold text-sand-900">{appt.patientName}</span>
                            <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full font-mono font-semibold">{appt.modality || 'Online'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-sand-500">
                            <span className="flex items-center gap-1"><Clock size={11} /> {appt.timeSlot} - {appt.endTime || appt.timeSlot} ({appt.duration || 50}m)</span>
                            {appt.amount && <span className="font-semibold text-sand-700">R$ {appt.amount - (appt.discount || 0)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider">{statusInfo.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {hourAppts.length === 0 && (
                    <button
                      onClick={() => handleCellClick(dateStr, hour)}
                      className="opacity-0 group-hover:opacity-100 absolute inset-2 bg-sand-50 border border-dashed border-sand-300 rounded-xl flex items-center justify-center text-[10px] font-bold font-mono uppercase text-sand-600 transition-all cursor-pointer"
                    >
                      + Agendar Sessão em {hour}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render WEEK view
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 11 }).map((_, i) => `${String(8 + i).padStart(2, '0')}:00`);

    return (
      <div className="bg-white border border-sand-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full min-w-[800px] border-collapse table-fixed">
          <thead>
            <tr className="bg-sand-50/50 border-b border-sand-200">
              <th className="w-20 py-4 border-r border-sand-150"></th>
              {weekDays.map((day, idx) => {
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <th key={idx} className={`py-3 px-1 text-center border-r border-sand-150 last:border-r-0 ${isToday ? 'bg-softblue-50/40' : ''}`}>
                    <p className="text-[10px] font-bold font-mono text-sand-400 uppercase tracking-widest leading-none">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </p>
                    <p className={`mt-1 text-sm font-serif font-bold h-7 w-7 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-softblue-500 text-white shadow-sm' : 'text-sand-950'}`}>
                      {day.getDate()}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {hours.map((hour) => (
              <tr key={hour} className="group min-h-[55px]">
                <td className="p-2 text-right border-r border-sand-150 text-[10px] font-mono font-bold text-sand-400 align-top">
                  {hour}
                </td>
                {weekDays.map((day, idx) => {
                  const dateStr = day.toISOString().substring(0, 10);
                  const dayAppts = filteredAppointments.filter(a => a.date === dateStr && a.timeSlot.startsWith(hour.substring(0, 3)));
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <td key={idx} className={`p-1.5 border-r border-sand-150 last:border-r-0 vertical-align-top relative ${isToday ? 'bg-softblue-50/10' : ''}`}>
                      <div className="space-y-1.5">
                        {dayAppts.map((appt) => {
                          const statusInfo = getStatusDetails(appt.status);
                          return (
                            <div
                              key={appt.id}
                              onClick={() => handleEditAppointment(appt)}
                              className={`p-2 rounded-xl border border-sand-200 shadow-xs cursor-pointer hover:shadow-sm transition-all text-[10px] leading-snug font-medium text-left ${statusInfo.badge}`}
                            >
                              <div className="font-serif font-bold text-sand-900 truncate">{appt.patientName}</div>
                              <div className="flex items-center gap-1 text-[9px] text-sand-500 mt-0.5 font-mono">
                                <Clock size={9} /> {appt.timeSlot} • {appt.modality || 'Online'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {dayAppts.length === 0 && (
                        <button
                          onClick={() => handleCellClick(dateStr, hour)}
                          className="opacity-0 group-hover:opacity-100 w-full h-8 bg-sand-50/50 hover:bg-sand-100/50 border border-dashed border-sand-300 rounded-lg text-[9px] font-mono uppercase text-sand-500 flex items-center justify-center transition-all cursor-pointer"
                        >
                          + Agendar
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render MONTH view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Index of first day (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Days in current month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const monthDaysGrid = [];

    // Prior month days
    const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to Monday start
    for (let i = startDayOffset; i > 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i + 1);
      monthDaysGrid.push({ date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      monthDaysGrid.push({ date: d, isCurrentMonth: true });
    }

    // Next month days to pad grid to multiple of 7
    const totalSlots = 42; // standard 6 rows
    const remainingSlots = totalSlots - monthDaysGrid.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      monthDaysGrid.push({ date: d, isCurrentMonth: false });
    }

    return (
      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-sand-200 text-center font-mono text-[10px] font-bold text-sand-400 uppercase tracking-widest bg-sand-50/50 py-3">
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-sand-100 border-t border-sand-100 bg-sand-50/10">
          {monthDaysGrid.map((cell, idx) => {
            const dateStr = cell.date.toISOString().substring(0, 10);
            const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
            const isToday = new Date().toDateString() === cell.date.toDateString();

            return (
              <div 
                key={idx} 
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors relative group border-r border-b border-sand-100 ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-sand-50/40 text-sand-400'
                } ${isToday ? 'bg-softblue-50/10' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-semibold font-mono p-1 h-6 w-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-softblue-500 text-white shadow-xs font-bold' : cell.isCurrentMonth ? 'text-sand-950' : 'text-sand-400'
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  
                  <button
                    onClick={() => handleCellClick(dateStr)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-sand-100 text-sand-500 hover:text-sand-800 rounded transition-all cursor-pointer"
                    title="Novo agendamento"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] pr-0.5 custom-scrollbar">
                  {dayAppts.map((appt) => {
                    const statusInfo = getStatusDetails(appt.status);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => handleEditAppointment(appt)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold truncate border flex items-center justify-between cursor-pointer ${statusInfo.badge}`}
                        title={`${appt.patientName} - ${appt.timeSlot}`}
                      >
                        <span className="truncate">{appt.patientName}</span>
                        <span className="font-mono scale-90 opacity-75">{appt.timeSlot}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert Messaging */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-sand-200 shadow-xs">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-sand-100/80 p-1 rounded-xl flex items-center border border-sand-200">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-white text-sand-700 rounded-lg transition-all cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 hover:bg-white text-sand-800 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer font-mono"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-white text-sand-700 rounded-lg transition-all cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <h3 className="text-sm font-serif font-bold text-sand-950 capitalize md:ml-2">
            {viewMode === 'month' 
              ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              : viewMode === 'week'
                ? `Semana de ${getWeekDays()[0].getDate()} a ${getWeekDays()[6].getDate()} de ${currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
                : currentDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
            }
          </h3>
        </div>

        {/* Filters and Views Select */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-sand-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-sand-200 rounded-xl text-xs bg-sand-50/50 text-sand-800 font-mono focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="confirmada">🟢 Confirmadas</option>
              <option value="pendente">🟡 Pendentes</option>
              <option value="remarcada">🔵 Remarcadas</option>
              <option value="cancelada">🔴 Canceladas</option>
              <option value="nao_compareceu">⚫ Não compareceu</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="bg-sand-50 border border-sand-200 p-0.5 rounded-xl flex">
            {[
              { id: 'day', label: 'Dia' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  viewMode === v.id
                    ? 'bg-white text-sand-900 shadow-xs border border-sand-150'
                    : 'text-sand-500 hover:text-sand-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Quick Schedule Button */}
          <button
            onClick={() => handleCellClick(new Date().toISOString().substring(0, 10))}
            className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Agendar Consulta</span>
          </button>
        </div>
      </div>

      {/* CORE CALENDAR GRID */}
      <div className="relative">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* WEEKLY SCHEDULE SETTINGS SECTION (Collapsible) */}
      <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-xs space-y-4">
        <button
          onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sand-950 font-mono flex items-center gap-1.5">
              <Calendar size={13} className="text-sage-600" /> Grade Semanal de Atendimento Clínico
            </h4>
            <p className="text-[11px] text-sand-500 mt-0.5 leading-normal">Defina os dias da semana e os intervalos padrão em que você atende.</p>
          </div>
          <span className="text-xs font-mono font-bold text-sage-600 bg-sage-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {showWeeklySchedule ? 'Ocultar Painel' : 'Gerenciar Grade'}
          </span>
        </button>

        <AnimatePresence>
          {showWeeklySchedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-5 pt-3 border-t border-sand-100"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Segunda-feira', state: agendaSeg, setState: setAgendaSeg },
                  { label: 'Terça-feira', state: agendaTer, setState: setAgendaTer },
                  { label: 'Quarta-feira', state: agendaQua, setState: setAgendaQua },
                  { label: 'Quinta-feira', state: agendaQui, setState: setAgendaQui },
                  { label: 'Sexta-feira', state: agendaSex, setState: setAgendaSex },
                  { label: 'Sábado', state: agendaSab, setState: setAgendaSab },
                  { label: 'Domingo', state: agendaDom, setState: setAgendaDom }
                ].map((day, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-sand-150 bg-sand-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sand-900">{day.label}</span>
                      <input
                        type="checkbox"
                        checked={day.state.enabled}
                        onChange={(e) => day.setState({ ...day.state, enabled: e.target.checked })}
                        className="h-4 w-4 text-sage-600 focus:ring-sage-500 border-sand-300 rounded cursor-pointer"
                      />
                    </div>
                    {day.state.enabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Início</span>
                          <input
                            type="text"
                            value={day.state.start}
                            onChange={(e) => day.setState({ ...day.state, start: e.target.value })}
                            className="w-full px-2 py-1 border border-sand-200 rounded text-xs focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-sand-500 uppercase font-mono">Fim</span>
                          <input
                            type="text"
                            value={day.state.end}
                            onChange={(e) => day.setState({ ...day.state, end: e.target.value })}
                            className="w-full px-2 py-1 border border-sand-200 rounded text-xs focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-sand-100">
                <button
                  onClick={handleSaveWeeklySchedule}
                  disabled={loading}
                  className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{loading ? 'Salvando...' : 'Salvar Grade Semanal'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL: SCHEDULING / BOOKING FORM */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl border border-sand-200 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-sand-50 border-b border-sand-200/80 px-6 py-4 flex justify-between items-center">
                <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                  <Calendar size={15} className="text-sage-600" />
                  {selectedAppointment ? 'Detalhes e Reagendamento' : 'Novo Agendamento Clínico'}
                </h4>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-sand-150 rounded-full transition-colors cursor-pointer text-sand-500 hover:text-sand-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Patient Selection */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Paciente Cadastrado</label>
                  <select
                    value={formPatientId}
                    onChange={(e) => {
                      setFormPatientId(e.target.value);
                      if (e.target.value) setFormCustomName(''); // Clear custom name if registered selected
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                  >
                    <option value="">-- Selecione um paciente cadastrado ou digite abaixo --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nome || p.name} ({p.whatsapp || p.telefone || 'Sem telefone'})</option>
                    ))}
                  </select>
                </div>

                {/* Manual Name Input (If not registered) */}
                {!formPatientId && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome do Paciente (Novo/Avulso)</label>
                    <input
                      type="text"
                      value={formCustomName}
                      onChange={(e) => setFormCustomName(e.target.value)}
                      placeholder="Ex: João Silva de Souza"
                      required={!formPatientId}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                )}

                {/* Date & Time block */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1.5">
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Início</label>
                    <input
                      type="text"
                      required
                      placeholder="09:00"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Fim</label>
                    <input
                      type="text"
                      required
                      placeholder="09:50"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Modality, Duration, Status */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Modalidade</label>
                    <select
                      value={formModality}
                      onChange={(e: any) => setFormModality(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none"
                    >
                      <option value="Online">Online</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Duração (Min)</label>
                    <input
                      type="number"
                      value={formDuration}
                      disabled
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-sand-50 focus:outline-none font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 bg-white focus:outline-none font-mono font-bold"
                    >
                      <option value="confirmada">🟢 Confirmada</option>
                      <option value="pendente">🟡 Pendente</option>
                      <option value="remarcada">🔵 Remarcada</option>
                      <option value="cancelada">🔴 Cancelada</option>
                      <option value="nao_compareceu">⚫ Não compareceu</option>
                    </select>
                  </div>
                </div>

                {/* Financial integration details */}
                <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-sand-500">Lançamento Financeiro Automático</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">INTEGRADO</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-sand-600 font-mono mb-0.5">Valor Bruto</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[10px] text-sand-400 font-bold font-mono">R$</span>
                        <input
                          type="number"
                          value={formAmount}
                          onChange={(e) => setFormAmount(Number(e.target.value))}
                          className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-sand-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-sand-600 font-mono mb-0.5">Desconto</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[10px] text-sand-400 font-bold font-mono">R$</span>
                        <input
                          type="number"
                          value={formDiscount}
                          onChange={(e) => setFormDiscount(Number(e.target.value))}
                          className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-sand-200 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-sand-600 font-mono mb-0.5">Meio de Pagamento</label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e: any) => setFormPaymentMethod(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-sand-200 bg-white focus:outline-none"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência">TED/DOC</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Observações / Notas da Consulta</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Sintomas, queixas principais ou avisos específicos"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-serif leading-relaxed"
                  />
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-sand-100 flex justify-between gap-2.5">
                  {selectedAppointment ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleDelete}
                      className="px-4 py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Check size={14} />
                      <span>{selectedAppointment ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
