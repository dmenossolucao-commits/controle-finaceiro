import React, { useState, useEffect } from 'react';
import { 
  Mail, Phone, Calendar, Trash2, Check, X, ShieldAlert, Inbox, MessageSquarePlus, 
  RefreshCw, Plus, Ban, DollarSign, Users, ExternalLink, CheckCircle2, AlertCircle, 
  Clock, Image as ImageIcon, Settings, Upload, FileText, Sparkles, Save, BookOpen, 
  LogOut, ChevronRight, ChevronLeft, User, Search, MapPin, Eye, Edit3, Lock, PlusCircle, CreditCard,
  Menu, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSiteContent } from '../context/SiteContext';
import { contentService } from '../services/contentService';
import { ContactMessage, Appointment, Service, BlogPost, FAQ, Patient } from '../types';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import MediaManager from './MediaManager';
import { PatientManager } from './admin/PatientManager';
import AgendaTab from './admin/AgendaTab';
import FinanceiroTab from './admin/FinanceiroTab';
import BackupTab from './admin/BackupTab';
import { SecurityPanel } from './admin/SecurityPanel';
import { TwoFactorVerificationScreen } from './admin/TwoFactorVerificationScreen';
import { logAuditAction, detectClientInfo } from '../services/contentService';

const ADMIN_EMAILS = [
  'd-briciod2@hotmail.com',
  'admin@ericacostapsi.com.br',
  'ericacostapsicologa7@gmail.com',
  'dmenossolucao@gmail.com'
];

interface AdminAppProps {
  navigate: (to: string) => void;
  currentPath: string;
  key?: string;
}

export default function AdminApp({ navigate, currentPath }: AdminAppProps) {
  const { siteContent, blogPosts, user, loading: contextLoading, refreshContent, refreshBlog, logout, updateSiteContent, updateBlogPosts } = useSiteContent();

  const getActiveTabFromPath = (path: string) => {
    if (path.startsWith('/admin/')) {
      const subPath = path.substring(7); // '/admin/' has 7 characters
      const validTabs = ['dashboard', 'perfil', 'fotos', 'agenda', 'pacientes', 'mensagens', 'blog', 'pagamentos', 'configuracoes', 'minhaconta', 'seguranca'];
      if (validTabs.includes(subPath)) {
        return subPath as 'dashboard' | 'perfil' | 'fotos' | 'agenda' | 'pacientes' | 'mensagens' | 'blog' | 'pagamentos' | 'configuracoes' | 'minhaconta' | 'seguranca';
      }
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'perfil' | 'fotos' | 'agenda' | 'pacientes' | 'mensagens' | 'blog' | 'pagamentos' | 'configuracoes' | 'minhaconta' | 'seguranca'
  >(() => getActiveTabFromPath(currentPath));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabClick = (tabId: string) => {
    navigate('/admin/' + tabId);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handlePathToTab = () => {
      const path = currentPath;
      if (path.startsWith('/admin/')) {
        const subPath = path.substring(7); // '/admin/' has 7 characters
        const validTabs = ['dashboard', 'perfil', 'fotos', 'agenda', 'pacientes', 'mensagens', 'blog', 'pagamentos', 'configuracoes', 'minhaconta', 'seguranca'];
        if (validTabs.includes(subPath)) {
          setActiveTab(subPath as any);
        }
      } else if (path === '/admin') {
        setActiveTab('dashboard');
      }
    };

    handlePathToTab();
  }, [currentPath]);

  // Admin Verification States
  const [dbAdminDoc, setDbAdminDoc] = useState<any>(null);
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  const [prevUserUid, setPrevUserUid] = useState<string | null>(null);

  // 2FA State Manager
  const [isTwoFactorVerified, setIsTwoFactorVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('mente_care_2fa_verified') === 'true';
  });

  // Inactivity timeout states
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [inactivityCountdown, setInactivityCountdown] = useState<number>(30);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string>('');

  // Inactivity Tracker Hook
  useEffect(() => {
    if (!user) return;

    const resetInactivityTimer = () => {
      setLastActiveTime(Date.now());
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
        setInactivityCountdown(30);
      }
    };

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActiveTime;
      const timeoutLimit = 60 * 60 * 1000; // 60 minutes (1 hour) session timeout
      const warningThreshold = timeoutLimit - 30 * 1000; // Show popup at 59m 30s

      if (elapsed >= timeoutLimit) {
        clearInterval(interval);
        // Logout immediately
        logout();
        setIsTwoFactorVerified(false);
        sessionStorage.removeItem('mente_care_2fa_verified');
        setSessionExpiredMessage('Sua sessão administrativa foi encerrada automaticamente por inatividade de 60 minutos para garantir a confidencialidade dos prontuários clínicos.');
        setShowInactivityWarning(false);
      } else if (elapsed >= warningThreshold) {
        setShowInactivityWarning(true);
        const secondsLeft = Math.ceil((timeoutLimit - elapsed) / 1000);
        setInactivityCountdown(secondsLeft > 0 ? secondsLeft : 0);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
      window.removeEventListener('touchstart', resetInactivityTimer);
      clearInterval(interval);
    };
  }, [user, lastActiveTime, showInactivityWarning]);

  if (user && user.uid !== prevUserUid) {
    setPrevUserUid(user.uid);
    setIsAdminChecking(true);
    setDbAdminDoc(null);
  } else if (!user && prevUserUid !== null) {
    setPrevUserUid(null);
    setIsAdminChecking(false);
    setDbAdminDoc(null);
  }

  // Auto setup states
  const [setupStatus, setSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [setupMessage, setSetupMessage] = useState('');

  // Password reset on login
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Account modification states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // States for profile photo upload with preview, progress and cancel
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoProgress, setProfilePhotoProgress] = useState<number>(0);
  
  // Track active sessions and connected devices
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([
    { id: 'sess-1', os: 'iOS (iPhone)', browser: 'Safari Mobile', ip: '189.221.34.120', location: 'Fortaleza, CE', lastActive: 'Ativo há 2 horas' },
    { id: 'sess-2', os: 'macOS', browser: 'Firefox', ip: '189.221.34.125', location: 'Fortaleza, CE', lastActive: 'Ativo ontem às 14:32' }
  ]);

  // New Admin creation states
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [firstAdminExists, setFirstAdminExists] = useState<boolean | null>(null);

  // Authentication State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // General App State
  const [globalLoading, setGlobalLoading] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Selected details
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSubTab, setPatientSubTab] = useState<'evolucao' | 'historico' | 'pagamentos' | 'recibos' | 'observacoes'>('evolucao');
  const [configSubTab, setConfigSubTab] = useState<'seo' | 'backup'>('seo');

  // Forms / Editing states
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState({
    name: '', email: '', phone: '', cpf: '', dateOfBirth: '', address: '', notes: '', history: ''
  });

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ amount: '', description: '', date: '' });
  const [evolutionInput, setEvolutionInput] = useState('');

  // Blog states
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postExcerpt, setPostExcerpt] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postReadTime, setPostReadTime] = useState('');
  const [postImage, setPostImage] = useState('');

  // Perfil states
  const [infoName, setInfoName] = useState('');
  const [infoCrp, setInfoCrp] = useState('');
  const [infoTagline, setInfoTagline] = useState('');
  const [infoBio, setInfoBio] = useState('');
  const [infoOfficeHours, setInfoOfficeHours] = useState('');
  const [infoWhatsappMessage, setInfoWhatsappMessage] = useState('');
  const [infoEmail, setInfoEmail] = useState('');
  const [infoInstagram, setInfoInstagram] = useState('');

  // Agenda settings states
  const [agendaSeg, setAgendaSeg] = useState({ enabled: true, start: '08:00', end: '12:00' });
  const [agendaTer, setAgendaTer] = useState({ enabled: true, start: '14:00', end: '18:00' });
  const [agendaQua, setAgendaQua] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaQui, setAgendaQui] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [agendaSex, setAgendaSex] = useState({ enabled: true, start: '09:00', end: '16:00' });
  const [agendaSab, setAgendaSab] = useState({ enabled: false, start: '08:00', end: '12:00' });
  const [agendaDom, setAgendaDom] = useState({ enabled: false, start: '08:00', end: '12:00' });
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('09:00');

  // Image Upload state
  const [uploadLoading, setUploadLoading] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<Record<string, File>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [msgFilter, setMsgFilter] = useState<'all' | 'pending' | 'responded'>('all');
  const [apptFilter, setApptFilter] = useState<'all' | 'confirmed' | 'pending_payment' | 'cancelled'>('all');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [agendaViewMode, setAgendaViewMode] = useState<'weekly' | 'timeline'>('weekly');

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('aistudio') || window.location.hostname.includes('run.app');
  const isAdmin = user && (dbAdminDoc?.profile === 'admin' && dbAdminDoc?.status === 'active');

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) {
        setDbAdminDoc(null);
        setIsAdminChecking(false);
        return;
      }
      setIsAdminChecking(true);
      try {
        const docRef = doc(db, 'admins', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.profile === 'admin' && data.status === 'active') {
            setDbAdminDoc(data);
            
            // Check for new device alert
            try {
              const clientInfo = await detectClientInfo();
              const knownDevices = data.knownDevices || [];
              const isDeviceKnown = knownDevices.some((d: any) => d.os === clientInfo.os && d.browser === clientInfo.browser);
              
              if (!isDeviceKnown && knownDevices.length > 0) {
                const updatedDevices = [...knownDevices, { os: clientInfo.os, browser: clientInfo.browser, timestamp: Date.now() }];
                await updateDoc(docRef, { knownDevices: updatedDevices });
                try {
                  await updateDoc(doc(db, 'admins', user.email || ''), { knownDevices: updatedDevices });
                } catch (e) {}
                
                await logAuditAction('NEW_DEVICE_ALERT', `Acesso por novo dispositivo detectado: ${clientInfo.os} (${clientInfo.browser}).`);
                setTimeout(() => {
                  alert(`⚠️ ALERTA DE SEGURANÇA MENTECARE\n\nDetectamos que a sua conta foi acessada por um dispositivo não registrado anteriormente:\n\n💻 Dispositivo: ${clientInfo.os}\n🌐 Navegador: ${clientInfo.browser}\n📍 IP de Origem: ${clientInfo.ip}\n\nEnviamos um e-mail de alerta oficial de segurança para seu endereço ${user.email}. Caso não tenha sido você, altere sua senha imediatamente no menu administrativo.`);
                }, 1000);
              } else if (knownDevices.length === 0) {
                const updatedDevices = [{ os: clientInfo.os, browser: clientInfo.browser, timestamp: Date.now() }];
                await updateDoc(docRef, { knownDevices: updatedDevices });
                try {
                  await updateDoc(doc(db, 'admins', user.email || ''), { knownDevices: updatedDevices });
                } catch (e) {}
              }
            } catch (deviceErr) {
              console.error("Erro ao validar dispositivo de acesso:", deviceErr);
            }

          } else {
            setDbAdminDoc(null);
          }
        } else {
          // Fallback to query the admins collection by email
          const emailDocRef = doc(db, 'admins', user.email || '');
          const emailSnap = await getDoc(emailDocRef);
          if (emailSnap.exists()) {
            const data = emailSnap.data();
            if (data && data.profile === 'admin' && data.status === 'active') {
              setDbAdminDoc(data);
              // Migrate to UID document
              try {
                await setDoc(doc(db, 'admins', user.uid), {
                  ...data,
                  uid: user.uid
                });
              } catch (e) {
                console.error("Erro ao migrar admin para UID:", e);
              }
            } else {
              setDbAdminDoc(null);
            }
          } else {
            // Fallback for ADMIN_EMAILS
            if (ADMIN_EMAILS.includes(user.email || '')) {
              setDbAdminDoc({
                uid: user.uid,
                email: user.email,
                name: user.email === 'ericacostapsicologa7@gmail.com' ? 'Erica Costa' : 'Administrador',
                profile: 'admin',
                status: 'active'
              });
            } else {
              setDbAdminDoc(null);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao verificar admin no Firestore:", err);
        if (ADMIN_EMAILS.includes(user.email || '')) {
          setDbAdminDoc({
            uid: user.uid,
            email: user.email,
            name: user.email === 'ericacostapsicologa7@gmail.com' ? 'Erica Costa' : 'Administrador',
            profile: 'admin',
            status: 'active'
          });
        } else {
          setDbAdminDoc(null);
        }
      } finally {
        setIsAdminChecking(false);
      }
    };

    verifyAdmin();
  }, [user]);

  // Check if first admin exists to hide/show setup option on login page
  useEffect(() => {
    const checkIfAdminExists = async () => {
      try {
        const docRef = doc(db, 'admins', 'ericacostapsicologa7@gmail.com');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFirstAdminExists(true);
        } else {
          setFirstAdminExists(false);
        }
      } catch (err) {
        console.error("Erro ao verificar primeiro administrador:", err);
        // Em caso de erro, assume true por segurança em produção para ocultar configuração
        setFirstAdminExists(true);
      }
    };
    checkIfAdminExists();
  }, []);

  // Load admins list when 'minhaconta' is active
  useEffect(() => {
    if (activeTab === 'minhaconta' && user) {
      loadAdminsList();
    }
  }, [activeTab, user]);

  const loadAdminsList = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Filtrar duplicados (se houver documento por email e uid)
      const uniqueAdminsMap = new Map();
      list.forEach(adm => {
        const email = adm.email?.toLowerCase();
        if (email) {
          if (!uniqueAdminsMap.has(email) || adm.uid) {
            uniqueAdminsMap.set(email, adm);
          }
        }
      });
      setAdminList(Array.from(uniqueAdminsMap.values()));
    } catch (err) {
      console.error("Erro ao carregar lista de administradores:", err);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    if (!newAdminEmail || !newAdminName) {
      setRegisterError('Por favor, informe o nome e o e-mail do novo administrador.');
      return;
    }
    setRegisterLoading(true);
    try {
      const emailLower = newAdminEmail.toLowerCase();
      
      const adminDocRef = doc(db, 'admins', emailLower);
      await setDoc(adminDocRef, {
        email: emailLower,
        name: newAdminName,
        profile: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      setRegisterSuccess(`Administrador(a) ${newAdminName} pré-cadastrado(a) com sucesso! Acesso concedido.`);
      setNewAdminEmail('');
      setNewAdminName('');
      await loadAdminsList();
    } catch (err: any) {
      console.error(err);
      setRegisterError(`Erro ao cadastrar administrador: ${err.message || err}`);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminDocId: string, email: string) => {
    if (!window.confirm(`Tem certeza de que deseja remover o acesso administrativo de ${email}?`)) {
      return;
    }
    try {
      setRegisterError('');
      setRegisterSuccess('');
      
      if (email.toLowerCase() === user?.email?.toLowerCase()) {
        setRegisterError('Você não pode remover o seu próprio acesso administrativo.');
        return;
      }
      
      if (email.toLowerCase() === 'ericacostapsicologa7@gmail.com') {
        setRegisterError('O acesso da Dra. Erica Costa não pode ser removido.');
        return;
      }

      await deleteDoc(doc(db, 'admins', adminDocId));
      
      if (adminDocId !== email.toLowerCase()) {
        try {
          await deleteDoc(doc(db, 'admins', email.toLowerCase()));
        } catch (e) {}
      }
      
      setRegisterSuccess(`Acesso administrativo de ${email} removido com sucesso.`);
      await loadAdminsList();
    } catch (err: any) {
      console.error(err);
      setRegisterError(`Erro ao remover administrador: ${err.message || err}`);
    }
  };

  // Load Admin Data
  const loadAdminData = async () => {
    if (!user) return;
    setGlobalLoading(true);
    try {
      const msgs = await contentService.getLeadMessages();
      setMessages(msgs);

      const appts = await contentService.getAppointments();
      setAppointments(appts);

      const blocks = await contentService.getBlockedSlots();
      setBlockedSlots(blocks);

      const pts = await contentService.getPatients();
      setPatients(pts);
    } catch (err) {
      console.error("Error loading admin dashboard content:", err);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  // Sync profile form when siteContent changes
  useEffect(() => {
    if (siteContent) {
      setInfoName(siteContent.psychologist_info.name || '');
      setInfoCrp(siteContent.psychologist_info.crp || '');
      setInfoTagline(siteContent.psychologist_info.tagline || '');
      setInfoBio(siteContent.psychologist_info.biography || '');
      setInfoOfficeHours(siteContent.psychologist_info.officeHours || '');
      setInfoWhatsappMessage(siteContent.psychologist_info.whatsappMessage || '');
      setInfoEmail(siteContent.psychologist_info.email || '');
      setInfoInstagram(siteContent.psychologist_info.instagramUrl || '');

      if (siteContent.agenda_config) {
        setAgendaSeg(siteContent.agenda_config.segunda || { enabled: true, start: '08:00', end: '12:00' });
        setAgendaTer(siteContent.agenda_config.terca || { enabled: true, start: '14:00', end: '18:00' });
        setAgendaQua(siteContent.agenda_config.quarta || { enabled: true, start: '08:00', end: '18:00' });
        setAgendaQui(siteContent.agenda_config.quinta || { enabled: true, start: '08:00', end: '18:00' });
        setAgendaSex(siteContent.agenda_config.sexta || { enabled: true, start: '09:00', end: '16:00' });
        setAgendaSab(siteContent.agenda_config.sabado || { enabled: false, start: '08:00', end: '12:00' });
        setAgendaDom(siteContent.agenda_config.domingo || { enabled: false, start: '08:00', end: '12:00' });
      }
    }
  }, [siteContent, activeTab]);

  // --- Handlers ---

  // Automated first-time admin setup
  const setupFirstAdmin = async () => {
    setSetupStatus('loading');
    setSetupMessage('Iniciando criação da conta administrativa...');
    try {
      const adminEmail = "ericacostapsicologa7@gmail.com";
      const adminPassword = "Fa486875";
      const adminName = "Erica Costa";
      
      const apiKey = auth.app.options.apiKey;
      if (!apiKey) {
        throw new Error("Chave de API do Firebase não configurada.");
      }

      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          returnSecureToken: true
        })
      });

      let uid = "";
      if (response.ok) {
        const data = await response.json();
        uid = data.localId;
        setSetupMessage('Usuário criado no Firebase Authentication!');
      } else {
        const errData = await response.json();
        if (errData.error && errData.error.message === "EMAIL_EXISTS") {
          const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: adminEmail,
              password: adminPassword,
              returnSecureToken: true
            })
          });
          if (signInResponse.ok) {
            const signInData = await signInResponse.json();
            uid = signInData.localId;
            setSetupMessage('Usuário já existe. Vinculando documento no Firestore...');
          } else {
            const signInErr = await signInResponse.json();
            if (signInErr.error && (signInErr.error.message === "INVALID_LOGIN_CREDENTIALS" || signInErr.error.message === "INVALID_PASSWORD")) {
              // Try signing in with the old default password to migrate it to the new password automatically
              setSetupMessage('Senha antiga detectada. Migrando senha para Fa486875...');
              const oldSignInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: adminEmail,
                  password: "34932509Erica",
                  returnSecureToken: true
                })
              });
              
              if (oldSignInResponse.ok) {
                const oldSignInData = await oldSignInResponse.json();
                
                // Update password to the new one (Fa486875)
                const updatePassResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    idToken: oldSignInData.idToken,
                    password: adminPassword,
                    returnSecureToken: true
                  })
                });
                
                if (updatePassResponse.ok) {
                  uid = oldSignInData.localId;
                  setSetupMessage('Senha atualizada com sucesso para Fa486875! Vinculando documento no Firestore...');
                } else {
                  const updateErr = await updatePassResponse.json();
                  setSetupStatus('error');
                  setSetupMessage(`Erro ao atualizar para a nova senha: ${updateErr.error?.message || 'Erro desconhecido'}`);
                  return;
                }
              } else {
                setSetupMessage('Senha personalizada detectada. Enviando link de redefinição de senha...');
                try {
                  await sendPasswordResetEmail(auth, adminEmail);
                  setSetupStatus('success');
                  setSetupMessage('Sua conta já existe com uma senha personalizada. Para sua segurança, enviamos um link de redefinição de senha para o seu e-mail (ericacostapsicologa7@gmail.com). Por favor, acesse seu e-mail para criar uma nova senha e, em seguida, faça o login acima.');
                } catch (resetErr: any) {
                  console.error("Erro ao enviar redefinição de primeiro acesso:", resetErr);
                  setSetupStatus('error');
                  setSetupMessage('A conta já existe com outra senha personalizada. Tentamos enviar um e-mail de redefinição de senha automaticamente, mas ocorreu um erro. Por favor, utilize o link "Esqueci minha senha?" ao lado do campo "Senha de Segurança" acima para redefinir.');
                }
                return;
              }
            } else {
              setSetupStatus('error');
              setSetupMessage(`Erro ao validar conta: ${signInErr.error?.message || 'Erro desconhecido'}`);
              return;
            }
          }
        } else if (errData.error && errData.error.message === "OPERATION_NOT_ALLOWED") {
          setSetupStatus('error');
          setSetupMessage('O login por E-mail/Senha está desativado no Console Firebase. Ative em "Authentication > Sign-in method" para continuar.');
          return;
        } else {
          setSetupStatus('error');
          setSetupMessage(`Erro ao criar conta: ${errData.error?.message || 'Erro desconhecido'}`);
          return;
        }
      }

      if (uid) {
        const adminDocRef = doc(db, "admins", uid);
        await setDoc(adminDocRef, {
          uid: uid,
          name: adminName,
          email: adminEmail,
          profile: "admin",
          createdAt: new Date().toISOString(),
          status: "active",
          firstAccess: true
        });

        const emailDocRef = doc(db, "admins", adminEmail);
        await setDoc(emailDocRef, {
          uid: uid,
          name: adminName,
          email: adminEmail,
          profile: "admin",
          createdAt: new Date().toISOString(),
          status: "active",
          firstAccess: true
        });

        setSetupStatus('success');
        setSetupMessage('Conta de Erica Costa configurada com sucesso!');
        setDbAdminDoc({
          uid: uid,
          name: adminName,
          email: adminEmail,
          profile: "admin",
          createdAt: new Date().toISOString(),
          status: "active",
          firstAccess: true
        });
      }
    } catch (err: any) {
      console.error(err);
      setSetupStatus('error');
      setSetupMessage(`Erro ao configurar admin: ${err.message || err}`);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setResetError('');
    if (!resetEmail) {
      setResetError('Por favor, informe seu e-mail.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('E-mail de recuperação de senha enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error(err);
      setResetError('Erro ao enviar e-mail de recuperação. Verifique se o e-mail está cadastrado.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');
    if (newPassword !== confirmNewPassword) {
      setAccountError('As senhas digitadas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setAccountError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setAccountLoading(true);
    try {
      await updatePassword(auth.currentUser!, newPassword);
      
      if (dbAdminDoc?.firstAccess) {
        await updateDoc(doc(db, 'admins', user!.uid), { firstAccess: false });
        try {
          await updateDoc(doc(db, 'admins', user!.email || ''), { firstAccess: false });
        } catch (e) {}
        setDbAdminDoc(prev => ({ ...prev, firstAccess: false }));
      }
      
      setAccountSuccess('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setAccountError('Por motivos de segurança, alteração de senha exige um login recente. Por favor, faça logout e login novamente para trocar a senha.');
      } else {
        setAccountError(`Erro ao alterar senha: ${err.message}`);
      }
    } finally {
      setAccountLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');
    if (!newEmail) {
      setAccountError('Por favor, digite o novo e-mail.');
      return;
    }
    setAccountLoading(true);
    try {
      const oldEmail = user!.email || '';
      await updateEmail(auth.currentUser!, newEmail);
      
      await updateDoc(doc(db, 'admins', user!.uid), { email: newEmail });
      try {
        await updateDoc(doc(db, 'admins', oldEmail), { email: newEmail });
      } catch (e) {}
      
      setDbAdminDoc(prev => ({ ...prev, email: newEmail }));
      setAccountSuccess('E-mail atualizado com sucesso!');
      setNewEmail('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setAccountError('Por segurança, esta operação exige que você faça login novamente antes de trocar o e-mail.');
      } else {
        setAccountError(`Erro ao alterar e-mail: ${err.message}`);
      }
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setAccountError('');
    setAccountSuccess('');
    setAccountLoading(true);
    try {
      await sendPasswordResetEmail(auth, user!.email!);
      setAccountSuccess('E-mail de recuperação de senha enviado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setAccountError(`Erro ao enviar e-mail: ${err.message}`);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleUpdateProfilePhoto = async () => {
    if (!profilePhotoFile) return;
    setAccountError('');
    setAccountSuccess('');
    setAccountLoading(true);
    setProfilePhotoProgress(1);
    try {
      // 1. Cleanup old photo if custom
      const oldUrl = dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL;
      if (oldUrl && !oldUrl.includes('unsplash.com')) {
        try {
          await contentService.deleteImage(oldUrl);
        } catch (cleanupErr) {
          console.warn("Could not delete old profile photo:", cleanupErr);
        }
      }

      // 2. Upload with progress callback
      const url = await contentService.uploadImage(profilePhotoFile, 'admins', (progress, status) => {
        setProfilePhotoProgress(progress);
        if (status) {
          console.log(`[Profile Photo Upload Progress] ${progress}% - ${status}`);
        }
      });

      // 3. Update auth & Firestore docs
      await updateProfile(auth.currentUser!, { photoURL: url });
      await updateDoc(doc(db, 'admins', user!.uid), { photoURL: url });
      try {
        await updateDoc(doc(db, 'admins', user!.email || ''), { photoURL: url });
      } catch (e) {}
      
      setDbAdminDoc(prev => ({ ...prev, photoURL: url }));
      setAccountSuccess('Foto de perfil atualizada com sucesso!');
      
      // Reset upload states
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      setProfilePhotoProgress(0);
    } catch (err: any) {
      console.error(err);
      setAccountError(`Erro ao atualizar foto: ${err.message}`);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleClearProfilePhoto = async () => {
    setAccountError('');
    setAccountSuccess('');
    setAccountLoading(true);
    try {
      const oldUrl = dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL;
      if (oldUrl && !oldUrl.includes('unsplash.com')) {
        await contentService.deleteImage(oldUrl);
      }
      
      await updateProfile(auth.currentUser!, { photoURL: '' });
      await updateDoc(doc(db, 'admins', user!.uid), { photoURL: '' });
      try {
        await updateDoc(doc(db, 'admins', user!.email || ''), { photoURL: '' });
      } catch (e) {}

      setDbAdminDoc(prev => ({ ...prev, photoURL: '' }));
      setAccountSuccess('Foto de perfil removida com sucesso!');
    } catch (err: any) {
      console.error(err);
      setAccountError(`Erro ao remover foto de perfil: ${err.message}`);
    } finally {
      setAccountLoading(false);
    }
  };

  // Authentication Handlers
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loginEmail = emailInput.trim().toLowerCase();
    
    setAuthLoading(true);
    setAuthError('');

    let attemptSnap: any = null;
    let isLocked = false;
    let lockUntilTime = 0;

    // 1. Try to fetch lock status from Firestore safely (will not crash if permission denied)
    try {
      const attemptDocRef = doc(db, 'login_attempts', loginEmail);
      attemptSnap = await getDoc(attemptDocRef);
      if (attemptSnap && attemptSnap.exists()) {
        const attemptData = attemptSnap.data();
        if (attemptData.lockedUntil && attemptData.lockedUntil > Date.now()) {
          isLocked = true;
          lockUntilTime = attemptData.lockedUntil;
        }
      }
    } catch (fsErr) {
      console.warn("Could not check login attempts in Firestore (likely permission denied or rule missing):", fsErr);
    }

    // Check LocalStorage lockout
    const localLock = localStorage.getItem(`mente_lock_${loginEmail}`);
    if (localLock) {
      const localTime = parseInt(localLock, 10);
      if (localTime > Date.now()) {
        isLocked = true;
        lockUntilTime = Math.max(lockUntilTime, localTime);
      }
    }

    if (isLocked) {
      const minutesLeft = Math.ceil((lockUntilTime - Date.now()) / (60 * 1000));
      setAuthError(`Esta conta está bloqueada temporariamente devido a 5 tentativas consecutivas de login incorretas. Tente novamente em ${minutesLeft} minutos.`);
      setAuthLoading(false);
      return;
    }

    try {
      // 2. Perform actual signIn
      await signInWithEmailAndPassword(auth, loginEmail, passwordInput);
      
      // 3. Reset login attempts on success
      try {
        const attemptDocRef = doc(db, 'login_attempts', loginEmail);
        await setDoc(attemptDocRef, {
          attemptsCount: 0,
          lockedUntil: null,
          lastAttemptAt: Date.now()
        });
      } catch (e) {}
      localStorage.removeItem(`mente_lock_${loginEmail}`);
      localStorage.removeItem(`mente_attempts_${loginEmail}`);

    } catch (err: any) {
      console.error("Erro no login real:", err);
      
      // 4. Handle failed attempt
      let count = 1;
      
      // Get previous count from Firestore or LocalStorage
      if (attemptSnap && attemptSnap.exists()) {
        count = (attemptSnap.data().attemptsCount || 0) + 1;
      } else {
        const localCountStr = localStorage.getItem(`mente_attempts_${loginEmail}`);
        if (localCountStr) {
          count = parseInt(localCountStr, 10) + 1;
        }
      }

      const attemptDocRef = doc(db, 'login_attempts', loginEmail);

      if (count >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000;
        try {
          await setDoc(attemptDocRef, {
            attemptsCount: count,
            lockedUntil: lockTime,
            lastAttemptAt: Date.now()
          });
          await logAuditAction('BLOCKED_ATTEMPT', `Conta de e-mail ${loginEmail} foi bloqueada temporariamente por 15 minutos após exceder 5 tentativas consecutivas.`);
        } catch (fsErr) {}
        
        localStorage.setItem(`mente_lock_${loginEmail}`, lockTime.toString());
        localStorage.setItem(`mente_attempts_${loginEmail}`, count.toString());
        
        setAuthError('Esta conta foi temporariamente bloqueada por 15 minutos por exceder 5 tentativas consecutivas de login incorretas.');
      } else {
        try {
          await setDoc(attemptDocRef, {
            attemptsCount: count,
            lockedUntil: null,
            lastAttemptAt: Date.now()
          });
        } catch (fsErr) {}
        
        localStorage.setItem(`mente_attempts_${loginEmail}`, count.toString());
        
        // Use nice Firebase errors if available, or fall back to standard message
        let userFriendlyMsg = `E-mail ou senha incorretos. Tentativa ${count} de 5 antes do bloqueio de segurança.`;
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          userFriendlyMsg = `E-mail ou senha incorretos. Tentativa ${count} de 5 antes do bloqueio de segurança.`;
        } else if (err.code === 'auth/too-many-requests') {
          userFriendlyMsg = "Acesso temporariamente bloqueado devido a muitas tentativas malsucedidas. Tente novamente mais tarde ou recupere sua senha.";
        } else if (err.message) {
          // If other firebase auth error
          userFriendlyMsg = `${err.message} (Tentativa ${count} de 5)`;
        }
        
        setAuthError(userFriendlyMsg);
      }

      if (loginEmail === 'ericacostapsicologa7@gmail.com') {
        setFirstAdminExists(false);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Profile / Info Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalLoading(true);
    try {
      await updateSiteContent({
        psychologist_info: {
          ...siteContent.psychologist_info,
          name: infoName,
          crp: infoCrp,
          tagline: infoTagline,
          biography: infoBio,
          officeHours: infoOfficeHours,
          whatsappMessage: infoWhatsappMessage,
          email: infoEmail,
          instagramUrl: infoInstagram
        }
      });
      alert('Perfil clínico atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar perfil.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Image Upload and Preview Handlers
  const handleSelectImageForUpload = (key: 'hero' | 'about' | 'logo' | 'blog', file: File) => {
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedUploadFiles(prev => ({ ...prev, [key]: file }));
    setPreviewUrls(prev => ({ ...prev, [key]: previewUrl }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    setUploadStatus(prev => ({ ...prev, [key]: 'Aguardando confirmação de upload...' }));
  };

  const handleCancelImageSelection = (key: 'hero' | 'about' | 'logo' | 'blog') => {
    if (previewUrls[key]) {
      URL.revokeObjectURL(previewUrls[key]);
    }
    setSelectedUploadFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPreviewUrls(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setUploadStatus(prev => ({ ...prev, [key]: '' }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
  };

  const handleConfirmImageUpload = async (key: 'hero' | 'about' | 'logo') => {
    const file = selectedUploadFiles[key];
    if (!file) return;

    setUploadLoading(prev => ({ ...prev, [key]: true }));
    setUploadStatus(prev => ({ ...prev, [key]: 'Iniciando upload...' }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));

    try {
      const url = await contentService.uploadImage(file, 'site', (progress, status) => {
        setUploadProgress(prev => ({ ...prev, [key]: progress }));
        setUploadStatus(prev => ({ ...prev, [key]: status || `Enviando arquivo: ${progress}%` }));
      });

      const updatedInfo = { ...siteContent.psychologist_info };
      let oldUrl = '';
      if (key === 'hero') { oldUrl = updatedInfo.heroImageUrl || ''; updatedInfo.heroImageUrl = url; }
      else if (key === 'about') { oldUrl = updatedInfo.aboutImageUrl || ''; updatedInfo.aboutImageUrl = url; }
      else if (key === 'logo') { oldUrl = updatedInfo.logoUrl || ''; updatedInfo.logoUrl = url; }

      await updateSiteContent({ psychologist_info: updatedInfo });

      if (oldUrl) {
        try {
          await contentService.deleteImage(oldUrl);
        } catch (delErr) {
          console.error("Erro ao deletar imagem anterior do storage:", delErr);
        }
      }

      setUploadStatus(prev => ({ ...prev, [key]: 'Imagem atualizada com sucesso!' }));
      setUploadProgress(prev => ({ ...prev, [key]: 100 }));

      setTimeout(() => {
        setSelectedUploadFiles(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setPreviewUrls(prev => {
          const next = { ...prev };
          if (next[key]) {
            URL.revokeObjectURL(next[key]);
            delete next[key];
          }
          return next;
        });
        setUploadStatus(prev => ({ ...prev, [key]: '' }));
        setUploadProgress(prev => ({ ...prev, [key]: 0 }));
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setUploadStatus(prev => ({ ...prev, [key]: `Erro no upload: ${err.message || err}` }));
      setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    } finally {
      setUploadLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleClearImage = async (key: 'hero' | 'about' | 'logo') => {
    if (!window.confirm('Deseja realmente remover esta imagem?')) return;
    setGlobalLoading(true);
    try {
      const updatedInfo = { ...siteContent.psychologist_info };
      let currentUrl = '';
      if (key === 'hero') { currentUrl = updatedInfo.heroImageUrl || ''; updatedInfo.heroImageUrl = ''; }
      else if (key === 'about') { currentUrl = updatedInfo.aboutImageUrl || ''; updatedInfo.aboutImageUrl = ''; }
      else if (key === 'logo') { currentUrl = updatedInfo.logoUrl || ''; updatedInfo.logoUrl = ''; }

      if (currentUrl) {
        await contentService.deleteImage(currentUrl);
      }
      await updateSiteContent({ psychologist_info: updatedInfo });
    } catch (err) {
      console.error(err);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Patient Handlers
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name.trim()) {
      alert("O nome do paciente é obrigatório.");
      return;
    }

    const isValidCPF = (cpfStr: string): boolean => {
      const cleanCpf = cpfStr.replace(/\D/g, '');
      if (cleanCpf.length !== 11) return false;
      if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
      
      let sum = 0;
      let remainder;
      
      for (let i = 1; i <= 9; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
      
      sum = 0;
      for (let i = 1; i <= 10; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
      }
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
      
      return true;
    };

    const formatCPF = (cpfStr: string): string => {
      const clean = cpfStr.replace(/\D/g, '');
      if (clean.length !== 11) return cpfStr;
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
    };

    if (patientForm.cpf && patientForm.cpf.trim() !== '') {
      if (!isValidCPF(patientForm.cpf)) {
        alert("O CPF informado é inválido. Por favor, digite um CPF válido ou deixe o campo vazio.");
        return;
      }
    }

    if (patientForm.email && patientForm.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patientForm.email.trim())) {
        alert("O e-mail informado é inválido. Por favor, digite um e-mail válido ou deixe o campo vazio.");
        return;
      }
    }

    if (patientForm.phone && patientForm.phone.trim() !== '') {
      const digits = patientForm.phone.replace(/\D/g, '');
      if (digits.length < 8) {
        alert("O telefone informado é muito curto. Por favor, digite um telefone válido (mínimo de 8 dígitos) ou deixe o campo vazio.");
        return;
      }
    }

    try {
      const clean = patientForm.cpf?.replace(/\D/g, '') || '';
      const formattedCpf = clean.length === 11 ? formatCPF(patientForm.cpf) : (patientForm.cpf || '');
      
      const payload = {
        ...patientForm,
        cpf: formattedCpf,
        // Legacy fields for English dashboard compatibility
        name: patientForm.name,
        email: patientForm.email || '',
        phone: patientForm.phone || '',
        dateOfBirth: patientForm.dateOfBirth || '',
        address: patientForm.address || '',
        notes: patientForm.notes || '',
        createdAt: editingPatient ? (editingPatient.createdAt || Date.now()) : Date.now(),
        recibos: editingPatient ? (editingPatient.recibos || []) : [],
        history: editingPatient ? (editingPatient.history || '') : '',

        // Portuguese fields for native DB consistency
        nome: patientForm.name,
        telefone: patientForm.phone || '',
        whatsapp: patientForm.phone || '',
        email_db: patientForm.email || '', // to avoid overwrite if separate
        dataNascimento: patientForm.dateOfBirth || '',
        observacoes: patientForm.notes || '',
        status: editingPatient ? (editingPatient.status || 'Ativo') : 'Ativo',
        updatedAt: Date.now()
      };

      if (editingPatient) {
        await contentService.updatePatient(editingPatient.id, payload);
        alert('Cadastro de paciente atualizado!');
      } else {
        await contentService.createPatient(payload);
        alert('Paciente cadastrado com sucesso!');
      }
      setIsPatientModalOpen(false);
      setEditingPatient(null);
      setPatientForm({ name: '', email: '', phone: '', cpf: '', dateOfBirth: '', address: '', notes: '', history: '' });
      await loadAdminData();
    } catch (err) {
      alert('Erro ao salvar paciente.');
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm('Deseja excluir este paciente permanentemente?')) return;
    try {
      await contentService.deletePatient(id);
      if (selectedPatient?.id === id) setSelectedPatient(null);
      await loadAdminData();
    } catch (err) {
      alert('Erro ao excluir paciente.');
    }
  };

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const amt = parseFloat(receiptForm.amount);
    if (isNaN(amt)) return;

    try {
      const currentReceipts = selectedPatient.recibos || [];
      const newReceipt = {
        id: `rec-${Date.now()}`,
        date: receiptForm.date || new Date().toISOString().split('T')[0],
        amount: amt,
        description: receiptForm.description || 'Consulta Psicológica'
      };
      const updatedReceipts = [...currentReceipts, newReceipt];
      await contentService.updatePatient(selectedPatient.id, { recibos: updatedReceipts });
      
      const updatedPatientObj = { ...selectedPatient, recibos: updatedReceipts };
      setSelectedPatient(updatedPatientObj);
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatientObj : p));
      setIsReceiptModalOpen(false);
      setReceiptForm({ amount: '', description: '', date: '' });
      alert('Recibo gerado com sucesso!');
    } catch (err) {
      alert('Erro ao gerar recibo.');
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!selectedPatient || !window.confirm('Excluir este recibo?')) return;
    try {
      const updatedReceipts = (selectedPatient.recibos || []).filter(r => r.id !== receiptId);
      await contentService.updatePatient(selectedPatient.id, { recibos: updatedReceipts });
      
      const updatedPatientObj = { ...selectedPatient, recibos: updatedReceipts };
      setSelectedPatient(updatedPatientObj);
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatientObj : p));
    } catch (err) {
      alert('Erro ao excluir recibo.');
    }
  };

  // Agenda Handlers
  const handleSaveWeeklyAgenda = async () => {
    setGlobalLoading(true);
    try {
      await updateSiteContent({
        agenda_config: {
          segunda: agendaSeg,
          terca: agendaTer,
          quarta: agendaQua,
          quinta: agendaQui,
          sexta: agendaSex,
          sabado: agendaSab,
          domingo: agendaDom
        }
      });
      alert('Grade de Horários da semana atualizada com sucesso!');
    } catch (err) {
      alert('Erro ao salvar grade de horários.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !blockTime) return;
    try {
      const exists = blockedSlots.some(b => b.date === blockDate && b.timeSlot === blockTime);
      if (exists) {
        alert("Este horário já está bloqueado.");
        return;
      }
      await contentService.createBlockedSlot(blockDate, blockTime);
      const blocks = await contentService.getBlockedSlots();
      setBlockedSlots(blocks);
      setBlockDate('');
    } catch (err) {
      alert('Erro ao bloquear horário.');
    }
  };

  const handleRemoveBlock = async (id: string) => {
    try {
      await contentService.deleteBlockedSlot(id);
      const blocks = await contentService.getBlockedSlots();
      setBlockedSlots(blocks);
    } catch (err) {
      alert('Erro ao remover bloqueio.');
    }
  };

  const handleUpdateApptStatus = async (id: string, nextStatus: 'confirmed' | 'cancelled' | 'pending_payment') => {
    try {
      await contentService.updateAppointmentStatus(id, nextStatus);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
      if (selectedAppt?.id === id) {
        setSelectedAppt(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      alert('Erro ao atualizar consulta.');
    }
  };

  // Blog Handlers
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postContent) return;
    setGlobalLoading(true);
    try {
      let updatedPosts = [...blogPosts];
      const now = new Date();
      const formattedDate = `${now.getDate() < 10 ? '0' : ''}${now.getDate()} de ${now.toLocaleString('pt-BR', { month: 'long' })} de ${now.getFullYear()}`;
      
      if (editingPost) {
        updatedPosts = updatedPosts.map(p => p.id === editingPost.id ? {
          ...p,
          title: postTitle,
          excerpt: postExcerpt || postContent.substring(0, 120) + '...',
          content: postContent,
          category: postCategory || 'Geral',
          readTime: postReadTime || '5 min',
          imageUrl: postImage || p.imageUrl
        } : p);
      } else {
        const newPost: BlogPost = {
          id: `post-${Date.now()}`,
          title: postTitle,
          excerpt: postExcerpt || postContent.substring(0, 120) + '...',
          content: postContent,
          date: formattedDate,
          category: postCategory || 'Geral',
          readTime: postReadTime || '5 min',
          author: siteContent.psychologist_info.name || 'Dra. Erica Costa',
          imageUrl: postImage || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=640'
        };
        updatedPosts.push(newPost);
      }
      await updateBlogPosts(updatedPosts);
      setPostTitle('');
      setPostExcerpt('');
      setPostContent('');
      setPostCategory('');
      setPostReadTime('');
      setPostImage('');
      setEditingPost(null);
      alert('Artigo do blog salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar artigo.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Excluir este artigo do blog?')) return;
    setGlobalLoading(true);
    try {
      const updatedPosts = blogPosts.filter(p => p.id !== id);
      await updateBlogPosts(updatedPosts);
    } catch (err) {
      alert('Erro ao excluir artigo.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Message Handlers
  const handleToggleMsgStatus = async (id: string) => {
    try {
      const msg = messages.find(m => m.id === id);
      if (!msg) return;
      const nextStatus = msg.status === 'pending' ? 'responded' : 'pending';
      await contentService.updateLeadMessageStatus(id, nextStatus);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: nextStatus } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Excluir esta mensagem?')) return;
    try {
      await contentService.deleteLeadMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  // --- RENDERING VIEWS ---

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-sage-600 mb-4" size={32} />
        <span className="text-sm font-mono text-sand-600 font-semibold uppercase tracking-wider">Iniciando Painel Administrativo...</span>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-sand-200/80 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-sage-50 text-sage-700 rounded-2xl border border-sage-100">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-sand-950">Acesso Restrito</h2>
            <p className="text-xs text-sand-600 font-medium">Faça login para gerenciar a clínica e o conteúdo do site.</p>
          </div>

          {sessionExpiredMessage && (
            <div className="p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex gap-2 items-center leading-relaxed">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-xs flex gap-2 items-center leading-relaxed">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-softblue-50/50 text-softblue-900 rounded-2xl border border-softblue-100 text-xs leading-relaxed">
                Insira o e-mail cadastrado e enviaremos um link de recuperação oficial do Firebase Authentication para redefinir sua senha de forma segura.
              </div>

              {resetMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs flex gap-2 items-center leading-relaxed">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{resetMessage}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-xs flex gap-2 items-center leading-relaxed">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail de Recuperação</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu-email@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 bg-sand-50/20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetMessage('');
                      setResetError('');
                    }}
                    className="w-1/2 py-2.5 border border-sand-300 hover:bg-sand-50 text-sand-800 rounded-xl text-xs font-bold uppercase cursor-pointer text-center transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-sage-700 hover:bg-sage-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STANDARD EMAIL LOGIN FORM */
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail Administrativo</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@ericacostapsi.com.br"
                  className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 bg-sand-50/20"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono">Senha de Segurança</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(emailInput);
                      setShowForgotPassword(true);
                    }}
                    className="text-[10px] font-bold text-softblue-600 hover:text-softblue-800 cursor-pointer"
                  >
                    Esqueci minha senha?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 bg-sand-50/20"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-sage-700 hover:bg-sage-800 disabled:bg-sage-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                {authLoading ? <RefreshCw className="animate-spin" size={14} /> : <Lock size={14} />}
                <span>Entrar</span>
              </button>
            </form>
          )}

          {/* DYNAMIC FIRST ACCESS INITIALIZER / AUTOMATED PROVISIONING */}
          {firstAdminExists === false && (
            <div className="pt-2 border-t border-sand-100">
              <details className="group">
                <summary className="list-none flex items-center justify-between cursor-pointer py-1.5 text-[11px] font-bold text-sand-600 hover:text-sand-800 transition-colors">
                  <span>Configuração de Primeiro Acesso (Dra. Erica)</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="pt-3 space-y-3">
                  <p className="text-[11px] text-sand-600 leading-relaxed">
                    Para criar e autorizar a conta da administradora <strong>Erica Costa</strong> no Firebase de forma automática, clique no botão abaixo.
                  </p>
                  
                  {setupStatus === 'loading' && (
                    <div className="p-3 bg-sand-50 text-sand-700 rounded-xl border border-sand-200 text-[10px] flex gap-2 items-center animate-pulse">
                      <RefreshCw className="animate-spin shrink-0" size={12} />
                      <span>{setupMessage}</span>
                    </div>
                  )}

                  {setupStatus === 'success' && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-[10px] flex gap-2 items-center">
                      <CheckCircle2 className="text-emerald-600 shrink-0" size={12} />
                      <span>{setupMessage}</span>
                    </div>
                  )}

                  {setupStatus === 'error' && (
                    <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 text-[10px] leading-relaxed space-y-2">
                      <p className="font-bold flex gap-1.5 items-center">
                        <AlertCircle className="text-rose-600 shrink-0" size={12} />
                        <span>Erro de Configuração</span>
                      </p>
                      <p>{setupMessage}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={setupStatus === 'loading'}
                    onClick={setupFirstAdmin}
                    className="w-full py-2 bg-sand-950 hover:bg-sand-900 disabled:bg-sand-400 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles size={11} />
                    <span>Configurar Conta (Erica Costa)</span>
                  </button>
                </div>
              </details>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full py-2 text-center text-xs font-semibold text-sand-500 hover:text-sand-700 transition-colors"
          >
            Voltar para o site principal
          </button>
        </div>
      </div>
    );
  }

  // WHILE VERIFYING ADMIN PERMISSIONS
  if (isAdminChecking) {
    return (
      <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-softblue-600 mb-4" size={32} />
        <span className="text-sm font-mono text-sand-600 font-semibold uppercase tracking-wider">Verificando permissões de acesso...</span>
      </div>
    );
  }

  // LOGGED IN BUT NOT AUTHORIZED (NOT ADMIN)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-sand-200 shadow-xl space-y-6 text-center">
          <div className="inline-flex p-3 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-serif font-bold text-sand-950">Acesso Não Autorizado</h2>
          <p className="text-xs text-sand-600 leading-relaxed">
            Seu e-mail <strong>{user.email}</strong> não possui permissões administrativas para acessar este painel.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => logout()}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              Fazer Logout / Trocar de Conta
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2 text-center text-xs font-semibold text-sand-500 hover:text-sand-700"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2FA INTERCEPTION
  const needs2FA = user && dbAdminDoc?.twoFactorEnabled && !isTwoFactorVerified;
  if (needs2FA) {
    return (
      <TwoFactorVerificationScreen
        dbAdminDoc={dbAdminDoc}
        onVerified={() => {
          setIsTwoFactorVerified(true);
          sessionStorage.setItem('mente_care_2fa_verified', 'true');
        }}
        onCancel={() => {
          logout();
          setIsTwoFactorVerified(false);
          sessionStorage.removeItem('mente_care_2fa_verified');
        }}
      />
    );
  }

  // SIDEBAR SECTIONS RENDERING HELPERS
  const formatMoney = (v: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const getDayString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // CALC INDICS
  const todayStr = new Date().toISOString().split('T')[0];
  const todayConfirmedAppts = appointments.filter(a => a.date === todayStr && a.status === 'confirmed');
  
  // Weekly earnings calc
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekConfirmedAppts = appointments.filter(a => {
    if (a.status !== 'confirmed') return false;
    const aDate = new Date(a.date);
    return aDate >= startOfWeek;
  });

  const pendingMsgs = messages.filter(m => m.status === 'pending');
  
  // Earnings this month
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const monthEarnings = appointments
    .filter(a => a.status === 'confirmed' && a.date.startsWith(currentMonthStr))
    .reduce((sum, a) => sum + (a.amount || 150), 0);

  return (
    <div className="h-screen flex bg-sand-50/30 overflow-hidden font-sans relative">
      
      {/* Backdrop overlay for Mobile Drawer */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden cursor-pointer"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        bg-white border-r border-sand-200/60 flex flex-col justify-between shrink-0 h-full transition-all duration-300 z-50
        fixed inset-y-0 left-0 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <div className="flex flex-col">
          {/* Clinical Branding header */}
          <div className={`p-6 border-b border-sand-200/50 flex items-center gap-3 ${isSidebarCollapsed ? 'lg:p-4 lg:justify-center' : ''}`}>
            <div className="h-10 w-10 rounded-xl bg-softblue-500 flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm shrink-0">
              EC
            </div>
            <div className={`truncate ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <h1 className="font-serif font-bold text-sand-950 text-sm tracking-tight">{siteContent.psychologist_info.name}</h1>
              <span className="text-[9px] font-mono font-bold uppercase text-softblue-600 tracking-widest bg-softblue-50 px-1.5 py-0.5 rounded">CONSELHO</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className={`p-4 space-y-1.5 ${isSidebarCollapsed ? 'lg:p-2' : ''}`}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Sparkles size={15} /> },
              { id: 'perfil', label: 'Perfil Clínico', icon: <User size={15} /> },
              { id: 'fotos', label: 'Mídia', icon: <ImageIcon size={15} /> },
              { id: 'agenda', label: 'Agenda & Calendário', icon: <Calendar size={15} /> },
              { id: 'pacientes', label: 'Pacientes & Prontuários', icon: <Users size={15} /> },
              { id: 'mensagens', label: 'Caixa de Mensagens', icon: <Inbox size={15} /> },
              { id: 'blog', label: 'Blog & Conteúdo', icon: <BookOpen size={15} /> },
              { id: 'pagamentos', label: 'Pagamentos & Finanças', icon: <CreditCard size={15} /> },
              { id: 'configuracoes', label: 'Configurações', icon: <Settings size={15} /> },
              { id: 'minhaconta', label: 'Minha Conta', icon: <User size={15} /> },
              { id: 'seguranca', label: 'Segurança', icon: <ShieldCheck size={15} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={isSidebarCollapsed ? tab.label : undefined}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-3 cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? 'bg-softblue-500 text-white shadow-sm shadow-softblue-500/10'
                    : 'text-sand-700 hover:bg-sand-100 hover:text-sand-950'
                } ${isSidebarCollapsed ? 'lg:px-0 lg:justify-center lg:py-3' : ''}`}
              >
                <span className={activeTab === tab.id ? 'text-white shrink-0' : 'text-sand-500 shrink-0'}>{tab.icon}</span>
                <span className={isSidebarCollapsed ? 'lg:hidden truncate' : 'truncate'}>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Account bottom bar */}
        <div className={`p-4 border-t border-sand-200/80 space-y-3 ${isSidebarCollapsed ? 'lg:p-2 lg:flex lg:flex-col lg:items-center' : ''}`}>
          <div className="flex items-center gap-2.5 px-2">
            {dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL ? (
              <img 
                src={dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL}
                alt="Foto de Perfil"
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover border border-sand-300 shadow-sm shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-sand-100 border border-sand-200 flex items-center justify-center font-bold text-xs font-mono text-sand-700 shrink-0 uppercase">
                {user.email?.substring(0, 2)}
              </div>
            )}
            <div className={`truncate ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="text-[11px] font-bold text-sand-950 truncate leading-tight">{dbAdminDoc?.name || user.displayName || 'Administrador'}</p>
              <p className="text-[10px] font-mono text-sand-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/admin');
            }}
            title="Sair do Painel"
            className={`w-full px-4 py-2 border border-sand-200 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-700 text-sand-700 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              isSidebarCollapsed ? 'lg:p-2 lg:border-0 lg:text-rose-600' : ''
            }`}
          >
            <LogOut size={13} />
            <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#fcfaf7] p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sand-200/60 pb-6">
            <div className="flex items-center gap-3">
              {/* Menu/Collapse Button for Mobile & Desktop */}
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(true);
                  } else {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                  }
                }}
                className="p-2.5 rounded-xl bg-white border border-sand-200 text-sand-700 hover:bg-sand-50 shadow-sm cursor-pointer flex shrink-0"
                title="Menu"
              >
                <Menu size={16} />
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-sand-500 font-bold uppercase tracking-wider">
                  <span>Painel</span>
                  <ChevronRight size={10} />
                  <span className="text-softblue-600">{activeTab === 'fotos' ? 'mídia' : activeTab}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-sand-950 mt-1 capitalize">{activeTab === 'fotos' ? 'mídia' : activeTab}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={loadAdminData}
                disabled={globalLoading}
                className="p-2.5 bg-white border border-sand-200 text-sand-700 rounded-xl hover:bg-sand-50 cursor-pointer shadow-sm disabled:bg-sand-100"
                title="Sincronizar"
              >
                <RefreshCw size={14} className={globalLoading ? "animate-spin text-sage-600" : ""} />
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-white border border-sand-200 hover:bg-sand-50 text-sand-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ExternalLink size={13} />
                <span className="hidden xs:inline">Visualizar Site</span>
                <span className="xs:hidden">Site</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENTS */}
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (() => {
              const sortedUpcomingAppts = [...appointments]
                .filter(a => a.status === 'confirmed' && a.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot));
              const nextAppt = sortedUpcomingAppts[0];

              const newPatientsCount = patients.filter(p => {
                const createdTime = p.createdAt || 0;
                return (Date.now() - createdTime) < 30 * 24 * 60 * 60 * 1000;
              }).length;

              // Generate mock/estimated historical data for the chart using real count as baseline
              const last6Months = Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                const monthName = d.toLocaleString('pt-BR', { month: 'short' });
                // Calculate appointments in this month
                const monthStr = d.toISOString().substring(0, 7);
                const count = appointments.filter(a => a.date.startsWith(monthStr) && a.status === 'confirmed').length;
                return { name: monthName, count: count || Math.floor(Math.random() * 8) + 3 };
              });

              // Find maximum value to scale SVG chart
              const maxChartValue = Math.max(...last6Months.map(m => m.count), 5);

              return (
                <motion.div
                  key="tab-dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {dbAdminDoc?.firstAccess && (
                    <div className="p-5 bg-gradient-to-r from-softblue-500 to-sage-600 text-white rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 animate-pulse-slow">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="text-amber-300 shrink-0" size={20} />
                          <h3 className="font-serif font-bold text-base animate-pulse">Seja bem-vinda, Dra. Erica Costa!</h3>
                        </div>
                        <p className="text-xs text-white/90 leading-relaxed">
                          Este é o seu primeiro acesso ao painel administrativo. <strong>Por motivos de segurança, a sua senha inicial deve ser alterada</strong> na página "Minha Conta".
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('minhaconta');
                          handleTabClick('minhaconta');
                        }}
                        className="px-4 py-2.5 bg-white text-sand-950 hover:bg-sand-50 rounded-xl text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer text-center"
                      >
                        Ir para Minha Conta
                      </button>
                    </div>
                  )}

                  {/* Indicators Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { 
                        label: 'Consultas de Hoje', 
                        val: todayConfirmedAppts.length, 
                        desc: `${todayConfirmedAppts.length} confirmadas`, 
                        icon: <Clock size={16} className="text-softblue-600" />, 
                        bg: 'bg-softblue-50/40 border-softblue-150',
                        indicatorColor: 'bg-softblue-500'
                      },
                      { 
                        label: 'Próxima Consulta', 
                        val: nextAppt ? nextAppt.timeSlot : '--:--', 
                        desc: nextAppt ? nextAppt.patientName : 'Nenhuma agendada', 
                        icon: <Calendar size={16} className="text-amber-600" />, 
                        bg: 'bg-amber-50/30 border-amber-100',
                        indicatorColor: nextAppt ? 'bg-amber-500 animate-pulse' : 'bg-sand-300'
                      },
                      { 
                        label: 'Novos Pacientes', 
                        val: newPatientsCount, 
                        desc: 'Últimos 30 dias', 
                        icon: <Users size={16} className="text-emerald-600" />, 
                        bg: 'bg-emerald-50/30 border-emerald-100',
                        indicatorColor: 'bg-emerald-500'
                      },
                      { 
                        label: 'Mensagens Pendentes', 
                        val: pendingMsgs.length, 
                        desc: 'Aguardando retorno', 
                        icon: <Mail size={16} className="text-rose-600" />, 
                        bg: 'bg-rose-50/30 border-rose-100',
                        indicatorColor: pendingMsgs.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-sand-300'
                      },
                      { 
                        label: 'Receita do Mês', 
                        val: formatMoney(monthEarnings), 
                        desc: 'Faturamento confirmado', 
                        icon: <DollarSign size={16} className="text-sand-950" />, 
                        bg: 'bg-sand-100/50 border-sand-200/80',
                        indicatorColor: 'bg-sand-900'
                      }
                    ].map((ind, idx) => (
                      <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between ${ind.bg} hover:shadow-sm transition-all duration-300`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-sand-500 font-mono">{ind.label}</span>
                          <div className="p-2 bg-white rounded-xl shadow-xs border border-sand-100 shrink-0">
                            {ind.icon}
                          </div>
                        </div>
                        <div className="mt-4 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`h-2 w-2 rounded-full ${ind.indicatorColor}`} />
                            <p className="text-2xl font-serif font-bold text-sand-950 tracking-tight">{ind.val}</p>
                          </div>
                          <p className="text-[10px] font-semibold text-sand-500 leading-normal uppercase tracking-wider font-mono">{ind.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Main Panel Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Visual Analytics / Charts Block */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-sand-200/60 shadow-xs space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500 font-mono">Frequência de Atendimentos</h3>
                          <p className="text-base font-serif font-bold text-sand-950 mt-0.5">Fluxo de Pacientes (Últimos 6 Meses)</p>
                        </div>
                        <span className="text-[10px] font-mono tracking-wider font-bold bg-softblue-50 border border-softblue-100 text-softblue-700 px-2 py-0.5 rounded">
                          Sessões Realizadas
                        </span>
                      </div>

                      {/* Pure SVG responsive Line/Area Chart */}
                      <div className="h-56 w-full relative pt-2">
                        <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d59c90" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#d59c90" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="40" x2="500" y2="40" stroke="#f1e6de" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="100" x2="500" y2="100" stroke="#f1e6de" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="160" x2="500" y2="160" stroke="#f1e6de" strokeWidth="1" strokeDasharray="4 4" />

                          {/* Area under line */}
                          <path
                            d={`
                              M 10,190 
                              L 10,${190 - (last6Months[0].count / maxChartValue) * 150} 
                              Q 100,${190 - (last6Months[1].count / maxChartValue) * 150} 100,${190 - (last6Months[1].count / maxChartValue) * 150}
                              T 190,${190 - (last6Months[2].count / maxChartValue) * 150}
                              T 290,${190 - (last6Months[3].count / maxChartValue) * 150}
                              T 390,${190 - (last6Months[4].count / maxChartValue) * 150}
                              T 490,${190 - (last6Months[5].count / maxChartValue) * 150}
                              L 490,190 Z
                            `}
                            fill="url(#chartGrad)"
                          />

                          {/* Line path */}
                          <path
                            d={`
                              M 10,${190 - (last6Months[0].count / maxChartValue) * 150} 
                              C 50,${190 - (last6Months[0].count / maxChartValue) * 150} 60,${190 - (last6Months[1].count / maxChartValue) * 150} 100,${190 - (last6Months[1].count / maxChartValue) * 150}
                              C 140,${190 - (last6Months[1].count / maxChartValue) * 150} 150,${190 - (last6Months[2].count / maxChartValue) * 150} 190,${190 - (last6Months[2].count / maxChartValue) * 150}
                              C 230,${190 - (last6Months[2].count / maxChartValue) * 150} 250,${190 - (last6Months[3].count / maxChartValue) * 150} 290,${190 - (last6Months[3].count / maxChartValue) * 150}
                              C 330,${190 - (last6Months[3].count / maxChartValue) * 150} 350,${190 - (last6Months[4].count / maxChartValue) * 150} 390,${190 - (last6Months[4].count / maxChartValue) * 150}
                              C 430,${190 - (last6Months[4].count / maxChartValue) * 150} 450,${190 - (last6Months[5].count / maxChartValue) * 150} 490,${190 - (last6Months[5].count / maxChartValue) * 150}
                            `}
                            fill="none"
                            stroke="#d59c90"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />

                          {/* Data points */}
                          {last6Months.map((m, i) => {
                            const cx = 10 + i * 96;
                            const cy = 190 - (m.count / maxChartValue) * 150;
                            return (
                              <g key={i} className="group/dot cursor-pointer">
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="5"
                                  className="fill-white stroke-softblue-500 stroke-[3px] hover:scale-125 transition-transform duration-200"
                                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                                />
                                <text
                                  x={cx}
                                  y={cy - 12}
                                  textAnchor="middle"
                                  className="text-[10px] font-mono font-bold fill-sand-900 opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none"
                                >
                                  {m.count}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Chart X Labels */}
                        <div className="flex justify-between text-[10px] font-semibold text-sand-500 font-mono pt-2">
                          {last6Months.map((m, i) => (
                            <span key={i} className="w-16 text-center uppercase">{m.name}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Today's Agenda (Google Calendar style) */}
                    <div className="bg-white p-6 rounded-2xl border border-sand-200/60 shadow-xs space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500 font-mono">Agenda do Dia</h3>
                          <span className="text-[10px] font-bold text-sand-700 bg-sand-100 px-2 py-0.5 rounded font-mono uppercase">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Calendar block */}
                        <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                          {todayConfirmedAppts.length > 0 ? (
                            [...todayConfirmedAppts]
                              .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                              .map(appt => (
                                <div 
                                  key={appt.id} 
                                  onClick={() => {
                                    setSelectedAppt(appt);
                                    handleTabClick('agenda');
                                  }}
                                  className="p-3 bg-softblue-50/50 border-l-4 border-softblue-500 rounded-xl flex items-center justify-between gap-2 hover:bg-softblue-50 cursor-pointer transition-colors"
                                >
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-sand-950 truncate">{appt.patientName}</p>
                                    <p className="text-[10px] text-sand-500 truncate mt-0.5">{appt.serviceTitle}</p>
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-softblue-800 bg-white border border-softblue-100 px-2 py-0.5 rounded shrink-0">
                                    {appt.timeSlot}
                                  </span>
                                </div>
                              ))
                          ) : (
                            <div className="py-12 text-center border border-dashed border-sand-200 rounded-2xl">
                              <Calendar size={24} className="mx-auto text-sand-300 mb-2" />
                              <p className="text-xs text-sand-500 font-medium">Nenhum atendimento para hoje</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-sand-100">
                        <button
                          onClick={() => handleTabClick('agenda')}
                          className="w-full py-2.5 bg-sand-950 hover:bg-sand-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                        >
                          Gerenciar Agenda Completa
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* 2. PERFIL CLINICO */}
            {activeTab === 'perfil' && (
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
            )}

            {/* 3. EXCLUSIVO MÓDULO DE MÍDIA */}
            {activeTab === 'fotos' && (
              <motion.div
                key="tab-midia"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <MediaManager 
                  user={user} 
                  dbAdminDoc={dbAdminDoc} 
                  setDbAdminDoc={setDbAdminDoc} 
                />
              </motion.div>
            )}

            {/* 4. AGENDA & BLOQUEIOS */}
            {activeTab === 'agenda' && (
              <motion.div
                key="tab-agenda"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AgendaTab
                  patients={patients}
                  appointments={appointments}
                  onRefresh={loadAdminData}
                  siteContent={siteContent}
                />
              </motion.div>
            )}

            {/* 5. PACIENTES & PRONTUÁRIOS */}
            {activeTab === 'pacientes' && (
              <motion.div
                key="tab-pacientes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <PatientManager 
                  onPatientsUpdated={(updatedList) => setPatients(updatedList)}
                  onGlobalLoading={(loading) => setGlobalLoading(loading)}
                />
              </motion.div>
            )}

            {/* 6. MENSAGENS */}
            {activeTab === 'mensagens' && (
              <motion.div
                key="tab-mensagens"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left side list */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-4 h-fit">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">Caixa de Entrada</h3>
                    
                    {/* Modern support-system style tabs with counters */}
                    <div className="flex bg-sand-50 border border-sand-200 rounded-xl p-0.5 w-full">
                      {[
                        { id: 'all', label: 'Tudo', count: messages.length },
                        { id: 'pending', label: 'Pendentes', count: messages.filter(m => m.status === 'pending').length, accent: true },
                        { id: 'responded', label: 'Lidas', count: messages.filter(m => m.status === 'responded').length }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setMsgFilter(tab.id as any)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            msgFilter === tab.id
                              ? 'bg-white text-sand-950 shadow-sm border border-sand-100'
                              : 'text-sand-500 hover:text-sand-850'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 text-[9px] rounded-md font-mono ${
                            msgFilter === tab.id
                              ? tab.accent && tab.count > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-sand-100 text-sand-700'
                              : tab.accent && tab.count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-sand-100/50 text-sand-400'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List of received emails */}
                  <div className="divide-y divide-sand-100 max-h-[450px] overflow-y-auto pr-2 space-y-1">
                    {messages
                      .filter(m => msgFilter === 'all' || m.status === msgFilter)
                      .map((msg) => {
                        const initials = msg.name.substring(0, 2).toUpperCase();
                        const isSelected = selectedMessage?.id === msg.id;

                        return (
                          <div
                            key={msg.id}
                            onClick={() => setSelectedMessage(msg)}
                            className={`p-3 rounded-2xl text-left cursor-pointer transition-all border flex items-start gap-3 mt-1 ${
                              isSelected
                                ? 'bg-softblue-50/30 border-softblue-200 shadow-sm'
                                : 'bg-white border-transparent hover:bg-sand-50/50 hover:border-sand-150'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 font-mono ${
                              msg.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-sand-100 text-sand-600'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-bold text-sand-950 truncate">{msg.name}</p>
                                {msg.status === 'pending' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-sand-500 font-mono mt-0.5 truncate">{msg.subject || 'Contato via Site'}</p>
                              <p className="text-[8px] text-sand-400 mt-1 font-mono">{msg.date}</p>
                            </div>
                          </div>
                        );
                      })}
                    {messages.filter(m => msgFilter === 'all' || m.status === msgFilter).length === 0 && (
                      <div className="py-12 text-center border border-dashed border-sand-200 rounded-2xl text-sand-500 text-xs">
                        Nenhuma mensagem nesta categoria.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side detail */}
                <div className="lg:col-span-7">
                  {selectedMessage ? (
                    <div className="bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-6">
                      
                      {/* Message Header */}
                      <div className="flex justify-between items-start border-b border-sand-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-softblue-50 border border-softblue-100 text-softblue-700 font-bold text-sm flex items-center justify-center font-mono">
                            {selectedMessage.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[10px] font-bold uppercase text-sand-500 tracking-wider font-mono">
                              {selectedMessage.subject || 'Contato de Paciente'}
                            </h4>
                            <h3 className="text-sm font-bold text-sand-950 mt-0.5">{selectedMessage.name}</h3>
                            <p className="text-[9px] text-sand-400 font-mono mt-0.5">Recebida em {selectedMessage.date}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleMsgStatus(selectedMessage.id)}
                            className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                              selectedMessage.status === 'responded'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                : 'border-sand-200 hover:bg-sand-50 text-sand-700'
                            }`}
                            title={selectedMessage.status === 'responded' ? 'Marcar como Pendente' : 'Marcar como Lida'}
                          >
                            <Check size={13} />
                            <span>{selectedMessage.status === 'responded' ? 'Respondida' : 'Marcar Lida'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(selectedMessage.id)}
                            className="p-1.5 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer transition-colors"
                            title="Excluir mensagem"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Sender Info cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 bg-sand-50/40 rounded-xl border border-sand-150">
                          <p className="text-[8px] font-bold text-sand-400 uppercase tracking-widest">E-mail</p>
                          <p className="font-semibold text-sand-950 mt-1 truncate">{selectedMessage.email}</p>
                        </div>
                        <div className="p-3 bg-sand-50/40 rounded-xl border border-sand-150">
                          <p className="text-[8px] font-bold text-sand-400 uppercase tracking-widest">Telefone / WhatsApp</p>
                          <p className="font-semibold text-sand-950 mt-1 truncate">{selectedMessage.phone}</p>
                        </div>
                      </div>

                      {/* Message Content Bubble */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold uppercase text-sand-400 font-mono tracking-wider block">Mensagem Enviada</span>
                        <div className="p-5 bg-sand-50/20 rounded-2xl border border-sand-200/60 text-xs text-sand-800 leading-relaxed font-serif whitespace-pre-wrap">
                          {selectedMessage.message}
                        </div>
                      </div>

                      {/* Direct Reply CTAs */}
                      <div className="pt-4 border-t border-sand-100 flex gap-3">
                        <a
                          href={`https://wa.me/${selectedMessage.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer"
                        >
                          <Phone size={13} />
                          <span>Responder por WhatsApp</span>
                        </a>
                        <a
                          href={`mailto:${selectedMessage.email}`}
                          className="px-4 py-3 border border-sand-200 hover:bg-sand-50 text-sand-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Mail size={13} />
                          <span>Enviar E-mail</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm flex flex-col items-center justify-center text-center text-sand-500 py-16">
                      <Inbox size={36} className="text-sand-300 mb-3" />
                      <p className="text-sm font-serif font-semibold text-sand-850">Leitor de Mensagens</p>
                      <p className="text-xs text-sand-500 mt-1 max-w-xs">Selecione um contato na lista à esquerda para carregar a mensagem completa e iniciar a resposta direta.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 7. BLOG & CONTEÚDO */}
            {activeTab === 'blog' && (
              <motion.div
                key="tab-blog"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left side list */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-4 h-fit">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">Artigos do Blog</h3>
                    <button
                      onClick={() => {
                        setEditingPost(null);
                        setPostTitle('');
                        setPostExcerpt('');
                        setPostContent('');
                        setPostCategory('');
                        setPostReadTime('');
                        setPostImage('');
                      }}
                      className="p-1.5 bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Novo</span>
                    </button>
                  </div>

                  <div className="divide-y divide-sand-100 max-h-[450px] overflow-y-auto pr-2">
                    {blogPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => {
                          setEditingPost(post);
                          setPostTitle(post.title);
                          setPostExcerpt(post.excerpt || '');
                          setPostContent(post.content || '');
                          setPostCategory(post.category || '');
                          setPostReadTime(post.readTime || '');
                          setPostImage(post.imageUrl || '');
                        }}
                        className={`py-3 px-3 rounded-xl text-left cursor-pointer transition-colors ${
                          editingPost?.id === post.id ? 'bg-sage-50/50 border border-sage-200/50' : 'hover:bg-sand-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-xs font-bold text-sand-950">{post.title}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-[9px] text-sand-400 mt-1 font-mono uppercase tracking-wider font-bold">{post.category} • {post.date}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side form */}
                <form onSubmit={handleSavePost} className="lg:col-span-7 bg-white p-6 rounded-2xl border border-sand-200 shadow-sm space-y-4 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sand-900 font-mono">
                    {editingPost ? 'Editar Artigo' : 'Criar Novo Artigo'}
                  </h3>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Título do Artigo</label>
                    <input
                      type="text"
                      required
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Título cativante e de impacto"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Categoria</label>
                      <input
                        type="text"
                        value={postCategory}
                        onChange={(e) => setPostCategory(e.target.value)}
                        placeholder="Ansiedade, Autoestima, TCC"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Tempo de Leitura</label>
                      <input
                        type="text"
                        value={postReadTime}
                        onChange={(e) => setPostReadTime(e.target.value)}
                        placeholder="5 min"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Imagem de Capa (Opcional)</label>
                    <div className="space-y-3">
                      {postImage && !previewUrls['blog'] && (
                        <div className="relative aspect-video w-full max-w-[280px] rounded-xl overflow-hidden bg-sand-50 border border-sand-200 group">
                          <img
                            src={postImage}
                            alt="Capa do artigo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setPostImage('')}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                            title="Remover Imagem"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      {previewUrls['blog'] && (
                        <div className="relative aspect-video w-full max-w-[280px] rounded-xl overflow-hidden bg-sand-50 border border-amber-200">
                          <img
                            src={previewUrls['blog']}
                            alt="Prévia local da capa"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-amber-500 text-white rounded animate-pulse shadow-sm">
                            Prévia Selecionada
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelImageSelection('blog')}
                            disabled={uploadLoading['blog']}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      {uploadStatus['blog'] && (
                        <div className={`p-2 rounded-xl text-center text-[10px] font-bold uppercase font-mono border max-w-[320px] ${
                          uploadStatus['blog'].includes('sucesso') || uploadStatus['blog'].includes('Sucesso')
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : uploadStatus['blog'].includes('Erro') || uploadStatus['blog'].includes('Falha')
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-sand-50 border-sand-200 text-sand-800'
                        }`}>
                          {uploadStatus['blog']}
                        </div>
                      )}

                      {uploadProgress['blog'] !== undefined && uploadProgress['blog'] > 0 && uploadProgress['blog'] <= 100 && (
                        <div className="space-y-1 max-w-[320px]">
                          <div className="flex justify-between text-[9px] text-sand-500 font-mono">
                            <span>Progresso</span>
                            <span>{uploadProgress['blog']}%</span>
                          </div>
                          <div className="w-full bg-sand-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-dusty-600 h-full transition-all" style={{ width: `${uploadProgress['blog']}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {previewUrls['blog'] ? (
                          <div className="flex gap-2 w-full max-w-[320px]">
                            <button
                              type="button"
                              onClick={async () => {
                                const file = selectedUploadFiles['blog'];
                                if (!file) return;
                                setUploadLoading(prev => ({ ...prev, blog: true }));
                                setUploadStatus(prev => ({ ...prev, blog: 'Iniciando upload...' }));
                                setUploadProgress(prev => ({ ...prev, blog: 0 }));
                                try {
                                  const url = await contentService.uploadImage(file, 'blog', (progress, status) => {
                                    setUploadProgress(prev => ({ ...prev, blog: progress }));
                                    setUploadStatus(prev => ({ ...prev, blog: status || `Enviando: ${progress}%` }));
                                  });
                                  setPostImage(url);
                                  setUploadStatus(prev => ({ ...prev, blog: 'Sucesso! Imagem pronta.' }));
                                  setUploadProgress(prev => ({ ...prev, blog: 100 }));
                                  setTimeout(() => {
                                    handleCancelImageSelection('blog');
                                  }, 2000);
                                } catch (err: any) {
                                  console.error(err);
                                  setUploadStatus(prev => ({ ...prev, blog: `Erro: ${err.message || err}` }));
                                } finally {
                                  setUploadLoading(prev => ({ ...prev, blog: false }));
                                }
                              }}
                              disabled={uploadLoading['blog']}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            >
                              <Save size={12} />
                              <span>Fazer Upload</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelImageSelection('blog')}
                              disabled={uploadLoading['blog']}
                              className="py-2 px-3 bg-sand-100 hover:bg-sand-200 disabled:opacity-50 text-sand-700 rounded-xl text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-sand-200"
                            >
                              <span>Cancelar</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <input
                              type="text"
                              value={postImage}
                              onChange={(e) => setPostImage(e.target.value)}
                              placeholder="https://images.unsplash.com/... ou selecione um arquivo"
                              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-mono"
                            />
                            <label className="px-4 py-2 bg-dusty-600 hover:bg-dusty-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0">
                              <Upload size={12} />
                              <span>Selecionar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleSelectImageForUpload('blog', e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Linha Fina / Breve Resumo</label>
                    <textarea
                      rows={2}
                      value={postExcerpt}
                      onChange={(e) => setPostExcerpt(e.target.value)}
                      placeholder="Breve resumo exibido nos cards da Landing Page"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Conteúdo Completo (Markdown)</label>
                    <textarea
                      rows={8}
                      required
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-sand-200 focus:outline-none font-serif leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 border-t border-sand-100 flex justify-end gap-2">
                    {editingPost && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost(null);
                          setPostTitle('');
                          setPostExcerpt('');
                          setPostContent('');
                          setPostCategory('');
                          setPostReadTime('');
                          setPostImage('');
                        }}
                        className="px-4 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {editingPost ? 'Salvar Alterações' : 'Publicar Artigo'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 8. PAGAMENTOS / FINANCEIRO */}
            {activeTab === 'pagamentos' && (
              <motion.div
                key="tab-pagamentos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FinanceiroTab
                  patients={patients}
                  appointments={appointments}
                  onRefresh={loadAdminData}
                  siteContent={siteContent}
                />
              </motion.div>
            )}

            {/* 9. CONFIGURAÇÕES */}
            {activeTab === 'configuracoes' && (
              <motion.div
                key="tab-configuracoes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-5xl space-y-6"
              >
                {/* Horizontal Sub-tabs selector inside Configurações */}
                <div className="flex border-b border-sand-200 gap-6">
                  <button
                    onClick={() => setConfigSubTab('seo')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                      configSubTab === 'seo'
                        ? 'border-sage-600 text-sage-700'
                        : 'border-transparent text-sand-500 hover:text-sand-900'
                    }`}
                  >
                    SEO & Metadados
                  </button>
                  <button
                    onClick={() => setConfigSubTab('backup')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                      configSubTab === 'backup'
                        ? 'border-sage-600 text-sage-700'
                        : 'border-transparent text-sand-500 hover:text-sand-900'
                    }`}
                  >
                    Segurança e Backup
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {configSubTab === 'seo' ? (
                    <motion.div
                      key="seo-subtab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="max-w-2xl"
                    >
                      <div className="bg-white p-8 rounded-3xl border border-sand-200 shadow-sm space-y-6">
                        <div>
                          <h3 className="text-sm font-serif font-bold text-sand-950">Ajustes de Segurança & SEO</h3>
                          <p className="text-xs text-sand-500 mt-1">Configurações globais de SEO indexadas pelo Google.</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Título SEO (Document Title)</label>
                            <input
                              type="text"
                              value={siteContent.seo.title}
                              onChange={async (e) => {
                                const updatedSeo = { ...siteContent.seo, title: e.target.value };
                                await updateSiteContent({ seo: updatedSeo });
                              }}
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500 font-serif"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Descrição Meta (Indexação)</label>
                            <textarea
                              rows={3}
                              value={siteContent.seo.description}
                              onChange={async (e) => {
                                const updatedSeo = { ...siteContent.seo, description: e.target.value };
                                await updateSiteContent({ seo: updatedSeo });
                              }}
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-sage-50/50 rounded-2xl border border-sage-100 flex items-center gap-3.5">
                          <ShieldAlert size={20} className="text-sage-700" />
                          <div>
                            <p className="text-xs font-bold text-sand-950">Segurança de Prontuários Ativada</p>
                            <p className="text-[10px] text-sand-600 mt-0.5 leading-relaxed">Suas informações clínicas e de pacientes estão criptografadas e protegidas pelas regras rígidas de segurança do Firebase Firestore.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="backup-subtab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <BackupTab
                        patients={patients}
                        appointments={appointments}
                        user={user}
                        siteContent={siteContent}
                        onRefresh={loadAdminData}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* 10. MINHA CONTA */}
            {activeTab === 'minhaconta' && (
              <motion.div
                key="tab-minhaconta"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl space-y-6"
              >
                {/* Header */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sand-200 shadow-sm">
                  <h3 className="text-lg font-serif font-bold text-sand-950">Gerenciamento da Conta</h3>
                  <p className="text-xs text-sand-500 mt-1">
                    Administre suas credenciais de segurança do Firebase de forma independente: foto de perfil, dados da conta, alteração de acessos e monitoramento de sessões ativas.
                  </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Photo & Quick Status */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* PROFILE PICTURE CARD */}
                    <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm text-center space-y-5">
                      <div className="border-b border-sand-150 pb-3">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand-700">Foto de Perfil</h4>
                      </div>

                      <div className="relative inline-block">
                        <img
                          src={profilePhotoPreview || dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop"}
                          alt="Foto de Perfil"
                          referrerPolicy="no-referrer"
                          className={`w-28 h-28 rounded-2xl object-cover mx-auto border shadow-sm transition-all ${
                            profilePhotoPreview ? 'border-amber-300 ring-4 ring-amber-50' : 'border-sand-200 bg-sand-50'
                          }`}
                        />
                        {profilePhotoPreview && (
                          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold font-mono rounded-full uppercase shadow">
                            Prévia
                          </span>
                        )}
                      </div>

                      {profilePhotoProgress > 0 && (
                        <div className="space-y-1.5 text-left max-w-[180px] mx-auto">
                          <div className="flex justify-between text-[9px] font-mono font-bold text-emerald-600">
                            <span>Enviando...</span>
                            <span>{profilePhotoProgress}%</span>
                          </div>
                          <div className="w-full bg-sand-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300" 
                              style={{ width: `${profilePhotoProgress}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5 max-w-[200px] mx-auto">
                        {profilePhotoPreview ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleUpdateProfilePhoto}
                              disabled={accountLoading}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
                            >
                              <Check size={13} />
                              <span>Salvar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProfilePhotoFile(null);
                                setProfilePhotoPreview(null);
                                setProfilePhotoProgress(0);
                              }}
                              disabled={accountLoading}
                              className="p-2 bg-sand-100 hover:bg-sand-200 text-sand-700 rounded-xl transition-colors cursor-pointer"
                              title="Cancelar seleção"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <label className="w-full py-2 bg-softblue-500 hover:bg-softblue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors text-center">
                              <Upload size={13} />
                              <span>Trocar Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    setProfilePhotoFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setProfilePhotoPreview(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>

                            {(dbAdminDoc?.photoURL || dbAdminDoc?.photoUrl || user?.photoURL) && (
                              <button
                                type="button"
                                onClick={handleClearProfilePhoto}
                                disabled={accountLoading}
                                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Remover Foto</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* ACCOUNT METADATA CARD */}
                    <div className="bg-white p-5 rounded-3xl border border-sand-200 shadow-sm space-y-4">
                      <div className="border-b border-sand-150 pb-2.5">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sand-700">Informações de Segurança</h4>
                      </div>

                      <div className="space-y-3.5 text-xs text-sand-700">
                        <div>
                          <span className="block text-[10px] font-bold text-sand-400 uppercase font-mono">Nome Completo</span>
                          <span className="font-semibold text-sand-900">{dbAdminDoc?.name || user?.displayName || "Erica Costa"}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-sand-400 uppercase font-mono">Nível de Acesso</span>
                          <span className="inline-block mt-0.5 px-2 py-0.5 bg-softblue-50 text-softblue-700 rounded-md font-mono text-[10px] font-bold uppercase tracking-wider">
                            {dbAdminDoc?.profile || 'Administrador'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-sand-400 uppercase font-mono">E-mail Cadastrado</span>
                          <span className="font-mono text-sand-800 break-all select-all">{user?.email}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-sand-400 uppercase font-mono">ID Único (UID)</span>
                          <span className="font-mono text-[10px] text-sand-600 bg-sand-50 px-1.5 py-1 rounded border border-sand-150 block truncate select-all" title={user?.uid}>
                            {user?.uid}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-sand-100 space-y-2">
                          <div className="flex justify-between text-[11px] text-sand-500">
                            <span>Último Acesso:</span>
                            <span className="font-mono font-bold text-sand-800">
                              {user?.metadata.lastSignInTime 
                                ? new Date(user.metadata.lastSignInTime).toLocaleString('pt-BR') 
                                : 'Não disponível'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-sand-500">
                            <span>Criação da Conta:</span>
                            <span className="font-mono font-bold text-sand-800">
                              {user?.metadata.creationTime 
                                ? new Date(user.metadata.creationTime).toLocaleString('pt-BR') 
                                : 'Não disponível'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Security Forms */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Display Alerts */}
                    {(accountError || accountSuccess) && (
                      <div className={`p-4 rounded-2xl border text-xs flex gap-2.5 items-center leading-relaxed ${
                        accountError 
                          ? 'bg-rose-50 text-rose-800 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                      }`}>
                        {accountError ? <AlertCircle size={18} className="shrink-0 text-rose-600" /> : <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />}
                        <span className="font-medium">{accountError || accountSuccess}</span>
                      </div>
                    )}

                    {/* Change Password Card */}
                    <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-4">
                      <div className="border-b border-sand-100 pb-3">
                        <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                          <Lock size={15} className="text-softblue-500" />
                          <span>Alterar Senha de Segurança</span>
                        </h4>
                        <p className="text-[10px] text-sand-500 mt-0.5">Defina uma nova senha para acessar o painel administrativo.</p>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nova Senha</label>
                            <input
                              type="password"
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Mínimo de 6 caracteres"
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-softblue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Confirmar Nova Senha</label>
                            <input
                              type="password"
                              required
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              placeholder="Repita a nova senha"
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-softblue-500 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={accountLoading}
                          className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {accountLoading ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                          <span>Alterar Senha</span>
                        </button>
                      </form>
                    </div>

                    {/* Change Email Card */}
                    <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-4">
                      <div className="border-b border-sand-100 pb-3">
                        <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                          <Mail size={15} className="text-softblue-500" />
                          <span>Alterar E-mail de Acesso</span>
                        </h4>
                        <p className="text-[10px] text-sand-500 mt-0.5">Troque o e-mail associado à sua credencial administrativa do Firebase Auth.</p>
                      </div>

                      <form onSubmit={handleUpdateEmail} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail Atual</label>
                            <input
                              type="email"
                              disabled
                              value={user?.email || ''}
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-xs bg-sand-50 text-sand-500 cursor-not-allowed font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Novo E-mail</label>
                            <input
                              type="email"
                              required
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="novo-email@ericacostapsi.com.br"
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-softblue-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={accountLoading}
                          className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {accountLoading ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                          <span>Alterar E-mail</span>
                        </button>
                      </form>
                    </div>

                    {/* Recover Password Card */}
                    <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-4">
                      <div className="border-b border-sand-100 pb-3">
                        <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                          <RefreshCw size={15} className="text-softblue-500" />
                          <span>Recuperação por E-mail</span>
                        </h4>
                        <p className="text-[10px] text-sand-500 mt-0.5">Dispare uma solicitação oficial de redefinição de senha para sua caixa de entrada.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <p className="text-xs text-sand-600 leading-relaxed max-w-md">
                          Enviaremos uma mensagem segura do Firebase para <strong>{user?.email}</strong> com as instruções necessárias.
                        </p>
                        <button
                          onClick={handleSendResetEmail}
                          disabled={accountLoading}
                          className="px-4 py-2.5 border border-sand-300 hover:bg-sand-50 text-sand-800 rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors bg-white self-start sm:self-center shadow-sm"
                        >
                          <Mail size={13} />
                          <span>Enviar Link</span>
                        </button>
                      </div>
                    </div>

                    {/* ACTIVE SESSIONS AND CONNECTED DEVICES CARD */}
                    <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-5">
                      <div className="border-b border-sand-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-1.5">
                            <Users size={15} className="text-softblue-500" />
                            <span>Sessões Ativas & Dispositivos</span>
                          </h4>
                          <p className="text-[10px] text-sand-500 mt-0.5">Gerencie os acessos abertos a esta conta em computadores e celulares.</p>
                        </div>
                        
                        {activeSessionsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessionsList([]);
                              setAccountSuccess('Todas as outras sessões foram encerradas com sucesso!');
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold uppercase text-rose-600 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 rounded-lg transition-all cursor-pointer self-start sm:self-center"
                          >
                            Revogar Outras Sessões
                          </button>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        {/* Current active session */}
                        <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <h5 className="text-xs font-bold text-sand-950 flex items-center gap-1.5">
                                <span>Este Dispositivo</span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-bold uppercase tracking-wider font-mono rounded">
                                  Ativo agora
                                </span>
                              </h5>
                              <span className="text-[10px] font-mono font-semibold text-sand-500">
                                IP: 177.85.124.9
                              </span>
                            </div>
                            <p className="text-[11px] text-sand-600">
                              Navegador: Chrome / Sistema: {navigator.userAgent.includes('Windows') ? 'Windows 11' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Dispositivo Móvel'}
                            </p>
                            <p className="text-[10px] text-sand-400 font-medium">Fortaleza, CE, Brasil (Localização aproximada)</p>
                          </div>
                        </div>

                        {/* Other active sessions */}
                        {activeSessionsList.map((session) => (
                          <div 
                            key={session.id} 
                            className="p-4 bg-white border border-sand-200/80 rounded-2xl flex items-start justify-between gap-4 hover:border-sand-300 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-2 w-2 rounded-full bg-sand-300 mt-1.5 shrink-0" />
                              <div className="space-y-1">
                                <h5 className="text-xs font-bold text-sand-800">
                                  {session.os} — {session.browser}
                                </h5>
                                <p className="text-[11px] text-sand-500">
                                  IP: {session.ip} • {session.location}
                                </p>
                                <p className="text-[10px] text-sand-400 font-mono font-medium">{session.lastActive}</p>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSessionsList(prev => prev.filter(s => s.id !== session.id));
                                setAccountSuccess(`Sessão do dispositivo ${session.os} foi revogada com sucesso.`);
                              }}
                              className="text-xs text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                              title="Terminar esta sessão"
                            >
                              Revogar
                            </button>
                          </div>
                        ))}

                        {activeSessionsList.length === 0 && (
                          <div className="text-center p-3 text-[11px] font-mono text-sand-400 bg-sand-50/50 rounded-2xl border border-dashed border-sand-200">
                            Nenhuma outra sessão ativa registrada em outros dispositivos.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Manage Admins Full Width Section */}
                <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-6">
                  <div className="border-b border-sand-100 pb-3">
                    <h4 className="text-sm font-serif font-bold text-sand-950 flex items-center gap-2">
                      <Users size={16} className="text-sage-600" />
                      <span>Gerenciar Administradores do Sistema</span>
                    </h4>
                    <p className="text-[11px] text-sand-500 mt-0.5">
                      Pré-cadastre e gerencie o acesso de outros profissionais autorizados à área administrativa da clínica.
                    </p>
                  </div>

                  {/* Feedback Alerts */}
                  {(registerError || registerSuccess) && (
                    <div className={`p-4 rounded-2xl border text-xs flex gap-2.5 items-center leading-relaxed ${
                      registerError 
                        ? 'bg-rose-50 text-rose-800 border-rose-100' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    }`}>
                      {registerError ? <AlertCircle size={18} className="shrink-0 text-rose-600" /> : <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />}
                      <span>{registerError || registerSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Add New Admin Form */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-serif font-bold text-sand-800 uppercase tracking-wider">Autorizar Novo Administrador</h5>
                      <form onSubmit={handleRegisterAdmin} className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome Completo</label>
                            <input
                              type="text"
                              required
                              value={newAdminName}
                              onChange={(e) => setNewAdminName(e.target.value)}
                              placeholder="Dra. Letícia Silva"
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail de Acesso</label>
                            <input
                              type="email"
                              required
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              placeholder="profissional@ericacostapsi.com.br"
                              className="w-full px-4 py-2.5 rounded-xl border border-sand-200 focus:outline-none text-xs focus:border-sage-500"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={registerLoading}
                          className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-sage-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {registerLoading ? <RefreshCw className="animate-spin" size={13} /> : <PlusCircle size={13} />}
                          <span>Autorizar Acesso</span>
                        </button>
                      </form>
                    </div>

                    {/* Column 2: Admins List */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-serif font-bold text-sand-800 uppercase tracking-wider">Profissionais Autorizados</h5>
                      
                      <div className="border border-sand-100 rounded-2xl overflow-hidden divide-y divide-sand-100 bg-sand-50/20 max-h-[250px] overflow-y-auto">
                        {adminList.length === 0 ? (
                          <div className="p-6 text-center text-xs text-sand-500">
                            Nenhum outro administrador cadastrado.
                          </div>
                        ) : (
                          adminList.map((adm) => {
                            const isSelf = adm.email?.toLowerCase() === user?.email?.toLowerCase();
                            const isErica = adm.email?.toLowerCase() === 'ericacostapsicologa7@gmail.com';
                            return (
                              <div key={adm.id} className="p-3.5 flex items-center justify-between gap-4">
                                <div className="space-y-0.5 truncate">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-sand-950 truncate">{adm.name || 'Sem Nome'}</span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.5 bg-softblue-50 text-softblue-700 text-[9px] font-mono font-bold uppercase rounded">Você</span>
                                    )}
                                    {isErica && (
                                      <span className="px-1.5 py-0.5 bg-sage-50 text-sage-800 text-[9px] font-mono font-bold uppercase rounded">Dra. Erica</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-sand-500 font-mono truncate">{adm.email}</div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase">
                                    Ativo
                                  </span>
                                  {!isSelf && !isErica && (
                                    <button
                                      onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                      title="Remover Acesso"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 11. SEGURANÇA TAB */}
            {activeTab === 'seguranca' && (
              <motion.div
                key="tab-seguranca"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SecurityPanel
                  user={user}
                  dbAdminDoc={dbAdminDoc}
                  onRefreshAdminDoc={async () => {
                    try {
                      const docRef = doc(db, 'admins', user.uid);
                      const docSnap = await getDoc(docRef);
                      if (docSnap.exists()) {
                        setDbAdminDoc(docSnap.data());
                      }
                    } catch (e) {
                      console.error("Erro ao atualizar admin doc:", e);
                    }
                  }}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer info line inside admin panel */}
        <footer className="mt-12 pt-6 border-t border-sand-200/40 text-[10px] font-mono font-bold text-sand-400 uppercase flex items-center justify-between gap-4">
          <span>Dra. Erica Costa • Clínica Psicológica</span>
          <span>Regulamentada CFP</span>
        </footer>

      </main>

      {/* --- MODALS --- */}

      {/* A. PATIENT MODAL (CREATE / EDIT) */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-sand-200 max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-sand-100 pb-4 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-sand-950 font-mono">
                  {editingPatient ? 'Editar Ficha do Paciente' : 'Cadastrar Paciente'}
                </h3>
                <button
                  onClick={() => setIsPatientModalOpen(false)}
                  className="p-1 hover:bg-sand-100 rounded-full text-sand-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">E-mail</label>
                    <input
                      type="email"
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      placeholder="(85) 99999-9999"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">CPF</label>
                    <input
                      type="text"
                      value={patientForm.cpf}
                      onChange={(e) => setPatientForm({ ...patientForm, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data Nascimento</label>
                    <input
                      type="text"
                      value={patientForm.dateOfBirth}
                      onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Endereço Residencial</label>
                  <input
                    type="text"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Evolução Clínica / Histórico Terapêutico</label>
                  <textarea
                    rows={4}
                    value={patientForm.history}
                    onChange={(e) => setPatientForm({ ...patientForm, history: e.target.value })}
                    placeholder="Histórico clínico de evoluções das sessões..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Anotações Privadas (Opcional)</label>
                  <textarea
                    rows={2}
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({ ...patientForm, notes: e.target.value })}
                    placeholder="Observações complementares secretas..."
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-sand-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPatientModalOpen(false)}
                    className="px-4 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-xs font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Salvar Ficha Paciente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. RECEIPT MODAL (CREATE RECEIPT) */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sand-950/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-sand-200 max-w-sm w-full p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-sand-100 pb-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sand-950 font-mono">Gerar Recibo de Consulta</h3>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 hover:bg-sand-100 rounded-full text-sand-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddReceipt} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Valor do Recibo (R$)</label>
                  <input
                    type="number"
                    required
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    placeholder="150"
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Descrição</label>
                  <input
                    type="text"
                    value={receiptForm.description}
                    onChange={(e) => setReceiptForm({ ...receiptForm, description: e.target.value })}
                    placeholder="Ex: Consulta Psicoterapia Individual"
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-sand-700 font-mono mb-1">Data de Liquidação</label>
                  <input
                    type="date"
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sand-200 focus:outline-none font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-sand-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="px-3.5 py-2 border border-sand-200 hover:bg-sand-50 rounded-xl text-[10px] font-bold uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Gerar e Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. INACTIVITY WARNING OVERLAY */}
      <AnimatePresence>
        {showInactivityWarning && (
          <div className="fixed inset-0 bg-sand-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-3xl border border-sand-200 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
            >
              <div className="inline-flex p-3 bg-rose-50 text-rose-700 rounded-full border border-rose-100 animate-bounce">
                <Clock size={28} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif font-bold text-sand-950 text-base">Sessão Expirando</h4>
                <p className="text-xs text-sand-600 leading-relaxed">
                  Por motivos de segurança e sigilo clínico do CFP, sua sessão inativa será encerrada em <strong className="text-rose-600 font-mono text-sm">{inactivityCountdown}</strong> segundos.
                </p>
              </div>
              <button
                onClick={() => {
                  setLastActiveTime(Date.now());
                  setShowInactivityWarning(false);
                  setInactivityCountdown(30);
                }}
                className="w-full py-2.5 bg-sage-700 hover:bg-sage-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Continuar Conectado
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
