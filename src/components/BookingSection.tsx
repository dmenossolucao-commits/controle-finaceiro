import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Check, Copy, ArrowRight, ArrowLeft, Heart, Sparkles, CreditCard, Shield, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { contentService } from '../services/contentService';
import { Service } from '../types';

export default function BookingSection() {
  const { siteContent } = useSiteContent();
  const { services } = siteContent;
  const { name: psychologistName, phone: psychologistPhone } = siteContent.psychologist_info;

  // Form & Selection State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState<string>(''); // HH:MM
  
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');

  // Booking Progress / Flow State
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Service/Date/Time, 2: Form/Payment, 3: Checkout, 4: Confirmed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState<any>(null);
  
  // Real-time slot calculations
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [copiedPix, setCopiedPix] = useState(false);

  // Default Standard Slots
  const STANDARD_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  // Fetch blocked and booked slots to filter available hours
  useEffect(() => {
    async function loadAgendaData() {
      try {
        const blocks = await contentService.getBlockedSlots();
        const bookings = await contentService.getAppointments();
        setBlockedSlots(blocks);
        setExistingBookings(bookings);
      } catch (err) {
        console.error('Error loading agenda metadata:', err);
      }
    }
    loadAgendaData();
  }, [currentStep]);

  // Polling for payment confirmation when on step 3 (Checkout)
  useEffect(() => {
    if (currentStep !== 3 || !bookingResult?.id) return;

    const interval = setInterval(async () => {
      try {
        const details = await contentService.getAppointmentById(bookingResult.id);
        if (details.status === 'confirmed') {
          setBookingResult(details);
          setCurrentStep(4);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error polling appointment status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStep, bookingResult]);

  const getDayOfWeekName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00'); // avoid timezone shifts
    const dayIndex = date.getDay(); // 0: Sunday, 1: Monday, ...
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
    return days[dayIndex];
  };

  const getDayLabel = (dayKey: string) => {
    const labels: Record<string, string> = {
      segunda: 'Segunda-feira',
      terca: 'Terça-feira',
      quarta: 'Quarta-feira',
      quinta: 'Quinta-feira',
      sexta: 'Sexta-feira',
      sabado: 'Sábado',
      domingo: 'Domingo'
    };
    return labels[dayKey] || dayKey;
  };

  // Get available slots for the selected date
  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    
    const dayOfWeekName = getDayOfWeekName(selectedDate);
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
      console.error("Error generating dynamic slots:", e);
      return [];
    }
    
    return slots.filter(slot => {
      // Check if blocked by admin
      const isBlocked = blockedSlots.some(b => b.date === selectedDate && b.timeSlot === slot);
      if (isBlocked) return false;

      // Check if booked and confirmed/pending
      const isBooked = existingBookings.some(appt => 
        appt.date === selectedDate && 
        appt.timeSlot === slot && 
        (appt.status === 'confirmed' || appt.status === 'pending_payment')
      );
      if (isBooked) return false;

      return true;
    });
  };

  const getScheduleSummaryText = () => {
    if (!siteContent.agenda_config) {
      return 'Atendimentos conforme horários disponíveis no calendário.';
    }
    const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;
    const activeDays = days.filter(d => siteContent.agenda_config?.[d]?.enabled);
    if (activeDays.length === 0) return 'Nenhum dia de atendimento ativo atualmente.';
    
    return 'Expediente: ' + activeDays.map(d => {
      const config = siteContent.agenda_config![d];
      return `${getDayLabel(d)} (${config.start}h - ${config.end}h)`;
    }).join(', ');
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedService) {
        setError('Por favor, selecione um serviço.');
        return;
      }
      if (!selectedDate) {
        setError('Por favor, selecione uma data.');
        return;
      }
      if (!selectedSlot) {
        setError('Por favor, escolha um horário disponível.');
        return;
      }
      setError('');
      setCurrentStep(2);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientEmail || !patientPhone) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const payload = {
        serviceId: selectedService!.id,
        serviceTitle: selectedService!.title,
        patientName,
        patientEmail,
        patientPhone,
        date: selectedDate,
        timeSlot: selectedSlot,
        amount: selectedService!.price || 150,
        paymentMethod
      };

      const result = await contentService.bookAppointment(payload);
      setBookingResult(result.appointment);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePaymentConfirm = async () => {
    if (!bookingResult?.id) return;
    setLoading(true);
    try {
      await contentService.simulatePayment(bookingResult.id, paymentMethod);
      const updated = await contentService.getAppointmentById(bookingResult.id);
      setBookingResult(updated);
      setCurrentStep(4);
    } catch (err: any) {
      setError('Erro ao confirmar pagamento simulado.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixKey = () => {
    if (bookingResult?.qrCode) {
      navigator.clipboard.writeText(bookingResult.qrCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  // Helper to format date
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <section id="agendamento" className="py-20 bg-sand-50/50 border-y border-sand-100">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-sage-600 font-mono flex items-center justify-center gap-1">
            <CalendarIcon size={12} /> Agendamento Online
          </span>
          <h2 className="text-3xl font-serif font-bold text-sand-950 mt-2">
            Reserve sua Sessão na Agenda
          </h2>
          <p className="text-sm text-sand-800 mt-2">
            Escolha o melhor dia e horário, faça o pagamento seguro e confirme seu atendimento de forma automática.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-center space-x-2 mb-10 text-xs font-semibold font-mono uppercase text-sand-500">
          <span className={`px-2.5 py-1 rounded-md ${currentStep === 1 ? 'bg-dusty-600 text-white font-bold' : 'bg-sand-200 text-sand-700'}`}>1. Agenda</span>
          <ArrowRight size={12} className="text-sand-400" />
          <span className={`px-2.5 py-1 rounded-md ${currentStep === 2 ? 'bg-dusty-600 text-white font-bold' : 'bg-sand-200 text-sand-700'}`}>2. Identificação</span>
          <ArrowRight size={12} className="text-sand-400" />
          <span className={`px-2.5 py-1 rounded-md ${currentStep === 3 ? 'bg-dusty-600 text-white font-bold' : 'bg-sand-200 text-sand-700'}`}>3. Pagamento</span>
          <ArrowRight size={12} className="text-sand-400" />
          <span className={`px-2.5 py-1 rounded-md ${currentStep === 4 ? 'bg-dusty-600 text-white font-bold' : 'bg-sand-200 text-sand-700'}`}>4. Confirmado</span>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold underline text-[10px] uppercase">Fechar</button>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-3xl border border-sand-200 shadow-sm overflow-hidden min-h-[450px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* STEP 1: SERVICE & SLOT SELECT */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-6 md:p-8 flex-1 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-lg font-serif font-bold text-sand-950 mb-6 flex items-center gap-2">
                    <Sparkles size={18} className="text-dusty-500" /> 1. Escolha o Atendimento e Data
                  </h3>

                  {/* Services Selection */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2.5 font-mono">
                      Selecione o Serviço
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {services.map(service => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setError('');
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${
                            selectedService?.id === service.id
                              ? 'border-dusty-600 bg-dusty-50/40 shadow-sm ring-1 ring-dusty-600'
                              : 'border-sand-200 hover:border-sand-350 bg-white'
                          }`}
                        >
                          <div>
                            <h4 className="text-sm font-bold text-sand-950 font-serif leading-tight">
                              {service.title}
                            </h4>
                            <p className="text-[11px] text-sand-600 mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-2 border-t border-sand-100 flex items-center justify-between text-xs">
                            <span className="text-sand-500 font-mono">{service.duration}</span>
                            <span className="font-bold text-dusty-700 font-mono">
                              R$ {service.price || 150},00
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calendar & Hours Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-sand-100">
                    {/* Date select */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2.5 font-mono">
                        Escolha o Dia
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedSlot('');
                          setError('');
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-dusty-500/20 focus:border-dusty-600 bg-white text-sand-900 text-sm font-medium font-mono"
                      />
                      <p className="text-[10px] text-dusty-600 mt-1.5 leading-relaxed font-medium">
                        * {getScheduleSummaryText()}
                      </p>
                    </div>

                    {/* Available Time Slots */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2.5 font-mono">
                        Horários Disponíveis para {selectedDate ? formatDateBR(selectedDate) : 'o dia'}
                      </label>
                      {!selectedDate ? (
                        <div className="p-6 border border-dashed border-sand-200 bg-sand-50/50 rounded-2xl text-center text-xs text-sand-500">
                          Selecione um dia no calendário ao lado para carregar os horários.
                        </div>
                      ) : getAvailableSlots().length === 0 ? (
                        <div className="p-6 border border-dashed border-rose-200 bg-rose-50/20 rounded-2xl text-center text-xs text-rose-800 font-medium">
                          Nenhum horário disponível para esta data. Por favor, tente outro dia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {getAvailableSlots().map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setError('');
                              }}
                              className={`py-2 px-1.5 rounded-xl text-center font-mono text-xs font-semibold transition-all duration-200 border ${
                                selectedSlot === slot
                                  ? 'bg-dusty-600 border-dusty-600 text-white shadow-sm font-bold'
                                  : 'bg-white border-sand-200 text-sand-800 hover:border-dusty-500 hover:text-dusty-700'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-sand-100 flex justify-end">
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-3 bg-dusty-600 hover:bg-dusty-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <span>Continuar</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PATIENT FORM */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-6 md:p-8 flex-1 flex flex-col justify-between"
              >
                <form onSubmit={handleBook} className="space-y-6">
                  <h3 className="text-lg font-serif font-bold text-sand-950 mb-4 flex items-center gap-2">
                    <Heart size={18} className="text-dusty-500" /> 2. Preencha seus Dados para o Atendimento
                  </h3>

                  {/* Booking Summary Box */}
                  <div className="p-4 bg-sand-50 border border-sand-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-serif text-sand-950 font-bold text-sm">
                        {selectedService?.title}
                      </p>
                      <p className="text-sand-700 mt-0.5 flex items-center gap-1 font-mono">
                        <CalendarIcon size={12} /> {formatDateBR(selectedDate)} às {selectedSlot} ({selectedService?.duration})
                      </p>
                    </div>
                    <div className="font-mono font-bold text-dusty-800 text-sm md:text-right bg-white px-3.5 py-1.5 rounded-xl border border-sand-200">
                      R$ {selectedService?.price || 150},00
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2 font-mono">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full px-4 py-3 rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-dusty-500/20 focus:border-dusty-600 text-sand-950 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2 font-mono">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="exemplo@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-dusty-500/20 focus:border-dusty-600 text-sand-950 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2 font-mono">
                        WhatsApp / Celular *
                      </label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 rounded-xl border border-sand-200 focus:outline-none focus:ring-2 focus:ring-dusty-500/20 focus:border-dusty-600 text-sand-950 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sand-800 mb-2 font-mono">
                        Forma de Pagamento
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`py-3 rounded-xl border font-semibold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                            paymentMethod === 'pix'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 font-bold'
                              : 'bg-white border-sand-200 text-sand-700 hover:border-sand-300'
                          }`}
                        >
                          <QrCode size={14} />
                          <span>Pix</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`py-3 rounded-xl border font-semibold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all ${
                            paymentMethod === 'credit_card'
                              ? 'bg-softblue-50 border-softblue-500 text-softblue-800 ring-1 ring-softblue-500 font-bold'
                              : 'bg-white border-sand-200 text-sand-700 hover:border-sand-300'
                          }`}
                        >
                          <CreditCard size={14} />
                          <span>Cartão</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-sand-500 flex items-center gap-1.5 border-t border-sand-100 pt-4">
                    <Shield size={12} className="text-dusty-500 shrink-0" />
                    <span>Seus dados são criptografados de ponta a ponta e armazenados em servidores seguros.</span>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-sand-100">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-3 border border-sand-200 hover:bg-sand-50 text-sand-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-dusty-600 hover:bg-dusty-700 disabled:bg-dusty-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {loading ? (
                        <span>Processando...</span>
                      ) : (
                        <>
                          <span>Ir para Pagamento</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: CHECKOUT */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-6 md:p-8 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-6 text-center max-w-lg mx-auto">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-sand-950">
                      Aguardando Confirmação do Pagamento
                    </h3>
                    <p className="text-xs text-sand-700 mt-1">
                      Efetue o pagamento de <span className="font-bold text-dusty-800 font-mono">R$ {bookingResult?.amount},00</span> para confirmar automaticamente o horário de <span className="font-bold">{bookingResult?.timeSlot} do dia {formatDateBR(bookingResult?.date)}</span>.
                    </p>
                  </div>

                  {/* PIX DISPLAY */}
                  {bookingResult?.paymentType === 'pix' && (
                    <div className="p-5 border border-sand-200 rounded-2xl bg-sand-50 space-y-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-3 font-mono">Pix Copia e Cola</span>
                        
                        <div className="bg-white p-3 rounded-xl border border-sand-200 max-w-[200px] shadow-sm mb-4">
                          {/* Beautiful procedurally styled Pix QR Placeholder */}
                          <div className="w-40 h-40 bg-sand-50 rounded-lg flex flex-col items-center justify-center border border-dashed border-sand-300 relative group">
                            <QrCode size={56} className="text-sand-400 group-hover:scale-105 transition-transform" />
                            <span className="text-[10px] text-sand-500 font-semibold mt-2">QR Code de Teste</span>
                          </div>
                        </div>

                        <div className="w-full flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-sand-200">
                          <input
                            type="text"
                            readOnly
                            value={bookingResult?.qrCode || ''}
                            className="text-[10px] font-mono text-sand-600 bg-transparent flex-1 focus:outline-none select-all overflow-ellipsis truncate"
                          />
                          <button
                            type="button"
                            onClick={copyPixKey}
                            className={`p-1.5 rounded-lg border transition-all ${
                              copiedPix
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-sand-50 hover:bg-sand-100 border-sand-200 text-sand-700'
                            }`}
                            title="Copiar Pix"
                          >
                            {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-sand-500 space-y-1">
                        <p>1. Abra o app do seu banco e escolha "Pagar com Pix" / "Pix Copia e Cola".</p>
                        <p>2. O pagamento é processado instantaneamente em ambiente seguro.</p>
                      </div>
                    </div>
                  )}

                  {/* CREDIT CARD DISPLAY */}
                  {bookingResult?.paymentType === 'credit_card' && (
                    <div className="p-5 border border-sand-200 rounded-2xl bg-sand-50 space-y-4">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-softblue-800 uppercase bg-softblue-50 px-2 py-0.5 rounded border border-softblue-100 mb-3 font-mono">Cartão de Crédito</span>
                        <p className="text-xs text-sand-700 mb-4">
                          Clique no botão abaixo para preencher os dados do cartão de crédito no gateway seguro do Mercado Pago.
                        </p>
                        
                        <a
                          href={bookingResult?.initPoint || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex px-6 py-3 bg-softblue-600 hover:bg-softblue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <CreditCard size={14} />
                          <span>Pagar no Mercado Pago</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* DUAL MODE SIMULATOR TOGGLE */}
                  {bookingResult?.type === 'simulator' && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-left space-y-2.5">
                      <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-900 flex items-center gap-1">
                        ⚡ Simulador de Testes do Sistema
                      </h4>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Como o app está rodando no ambiente de demonstração, você pode clicar no botão abaixo para **simular instantaneamente** a confirmação do pagamento pelo gateway do Mercado Pago. Isso registrará a consulta na agenda.
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulatePaymentConfirm}
                        disabled={loading}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors duration-200"
                      >
                        {loading ? 'Confirmando...' : 'Confirmar Pagamento Simulado'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-sand-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-3 border border-sand-200 hover:bg-sand-50 text-sand-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Voltar</span>
                  </button>
                  <span className="text-[10px] font-mono text-sand-400 self-center">Identificador do Agendamento: {bookingResult?.id}</span>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CONFIRMED */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-10 flex-1 flex flex-col justify-between"
              >
                <div className="text-center max-w-lg mx-auto space-y-6 py-6">
                  <div className="w-14 h-14 bg-emerald-50 border-2 border-emerald-500 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Check size={32} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-sand-950">
                      Sua Consulta foi Agendada!
                    </h3>
                    <p className="text-xs text-sand-800 mt-2 leading-relaxed">
                      Olá, <span className="font-bold">{bookingResult?.patientName}</span>! O pagamento no valor de <span className="font-bold font-mono text-dusty-800">R$ {bookingResult?.amount},00</span> foi confirmado. Seu horário foi reservado com sucesso na agenda da psicóloga.
                    </p>
                  </div>

                  {/* Receipt summary */}
                  <div className="p-5 border border-sand-200 rounded-2xl bg-sand-50 text-left text-xs space-y-3">
                    <h4 className="font-serif font-bold text-sand-950 border-b border-sand-200 pb-2">Comprovante do Agendamento</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 font-medium text-sand-800 text-[11px]">
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Serviço</span>
                        {bookingResult?.serviceTitle}
                      </div>
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Psicóloga</span>
                        {psychologistName}
                      </div>
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Data</span>
                        {formatDateBR(bookingResult?.date)}
                      </div>
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Horário Reservado</span>
                        {bookingResult?.timeSlot} hs
                      </div>
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Status do Pagamento</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">Aprovado</span>
                      </div>
                      <div>
                        <span className="text-sand-500 font-mono text-[9px] uppercase tracking-wider block">Paciente</span>
                        {bookingResult?.patientName} ({bookingResult?.patientPhone})
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                    <a
                      href={`https://wa.me/${psychologistPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, Psicóloga ${psychologistName}! Acabei de confirmar meu agendamento no site para o serviço "${bookingResult?.serviceTitle}" no dia ${formatDateBR(bookingResult?.date)} às ${bookingResult?.timeSlot}. O comprovante de R$ ${bookingResult?.amount},00 já foi processado.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <span>Enviar WhatsApp para Psicóloga</span>
                    </a>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService(null);
                        setSelectedDate('');
                        setSelectedSlot('');
                        setPatientName('');
                        setPatientEmail('');
                        setPatientPhone('');
                        setCurrentStep(1);
                        setBookingResult(null);
                      }}
                      className="px-5 py-3 border border-sand-200 hover:bg-sand-50 text-sand-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Reservar outra sessão
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-sand-100 text-center text-[10px] text-sand-500">
                  Um e-mail de confirmação também foi enviado para <span className="font-semibold">{bookingResult?.patientEmail}</span> e para a psicóloga.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
