import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  QrCode,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Phone,
  Clock,
  GraduationCap,
  StickyNote,
  Building2,
  CloudUpload,
  HelpCircle,
  LayoutGrid,
  LogOut,
  CalendarCheck,
  FileText,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  User as UserIcon,
  ListOrdered,
  MapPin,
  MessageSquare,
  Calendar,
  Camera,
  MoreVertical,
  IdCard,
  Award,
  UserMinus,
  UserCheck,
  UserPlus,
  ChevronRight,
  Trash2,
  Printer,
  MessageSquareText,
  School,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Batch {
  id: string;
  name: string;
  type: string;
  fees: number;
  startDate: string;
  endDate: string;
  days?: string;
  subject?: string;
  dueFeesRemark?: boolean;
  timing?: string;
  teacherId: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  batchId: string;
  totalFees: number;
  paidFees: number;
  joinedAt: any;
  rollNo?: string;
  birthDate?: string;
  gender?: string;
  cnic?: string;
  parentName?: string;
  parentMobile?: string;
  address?: string;
  remark?: string;
  photoUrl?: string;
  status?: 'active' | 'left' | 'withdrawn';
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: any;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  course: string;
  status: 'open' | 'contacted' | 'enrolled' | 'closed';
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  date: Date;
  read: boolean;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
}

interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: any;
  method: 'cash' | 'online' | 'check';
  remarks?: string;
}

interface InstituteInfo {
  id?: string;
  name: string;
  address: string;
  email: string;
  website: string;
  contactNo: string;
  description: string;
  photoUrl: string;
  principalName?: string;
  registrationNo?: string;
}

// --- Utilities ---
const playBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.log('Audio playback blocked or failed');
  }
};

// --- Components ---

const ProgressCircle = ({ percent, color, label, value }: { percent: number, color: string, label: string, value: string }) => {
  const data = [
    { name: 'Completed', value: percent },
    { name: 'Remaining', value: 100 - percent },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-50 flex-1 min-w-[100px]">
      <div className="relative w-20 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={25}
              outerRadius={35}
              startAngle={90}
              endAngle={450}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{percent}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-2 font-medium">{label}</span>
      <span className="text-sm font-bold mt-1">{value}</span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, iconBg, onClick }: { icon: any, label: string, value: string | number, color: string, iconBg: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex flex-col gap-2 transition-transform active:scale-95",
      onClick && "cursor-pointer hover:border-blue-100"
    )}
  >
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
      <Icon className={cn("w-5 h-5", color)} />
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, color }: { icon: any, label: string, color: string }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform">
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
      <Icon className="w-6 h-6 text-blue-600" />
    </div>
    <span className="text-[11px] text-gray-600 font-medium text-center leading-tight">{label}</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [showAddModal, setShowAddModal] = useState<'batch' | 'student' | 'expense' | 'attendance' | 'payment' | 'lead' | 'edit-student' | 'announcement' | null>(null);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [batchStep, setBatchStep] = useState<'selection' | 'form'>('selection');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showICard, setShowICard] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState<string | null>(null);
  const [showAdmissionForm, setShowAdmissionForm] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);
  const [showInstituteSettings, setShowInstituteSettings] = useState(false);
  
  // Data States
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo>({
    name: '',
    address: '',
    email: '',
    website: '',
    contactNo: '',
    description: '',
    photoUrl: '',
    principalName: '',
    registrationNo: ''
  });

  // Search & Filter States
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState<Batch | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form States
  const [newBatch, setNewBatch] = useState({ 
    name: '', 
    type: 'Monthly (Total)', 
    fees: 0, 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: format(new Date(), 'yyyy-MM-dd'),
    days: '0',
    subject: '',
    dueFeesRemark: false
  });
  const [newStudent, setNewStudent] = useState({ 
    name: '', 
    phone: '', 
    batchId: '', 
    totalFees: 0, 
    paidFees: 0, 
    rollNo: '',
    birthDate: '',
    gender: '',
    cnic: '',
    parentName: '',
    parentMobile: '',
    address: '',
    remark: '',
    photoUrl: '',
    joinedDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [newExpense, setNewExpense] = useState({ title: '', amount: 0 });
  const [newPayment, setNewPayment] = useState({ amount: 0, method: 'cash' as const, remarks: '' });
  const [newLead, setNewLead] = useState({ name: '', phone: '', course: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubBatches = onSnapshot(collection(db, 'batches'), (snap) => {
      setBatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch)));
    });
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
      setLeads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    });
    const unsubInstitute = onSnapshot(collection(db, 'institute'), (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setInstituteInfo({ id: snap.docs[0].id, ...data } as InstituteInfo);
      }
    });
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    });
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    return () => {
      unsubBatches();
      unsubStudents();
      unsubExpenses();
      unsubLeads();
      unsubTeachers();
      unsubAttendance();
      unsubPayments();
    };
  }, [user]);

  // Generate notifications based on data
  useEffect(() => {
    if (students.length === 0) return;

    const newNotifications: AppNotification[] = [];

    // Check for pending fees
    students.forEach(s => {
      if (s.totalFees - s.paidFees > 0) {
        newNotifications.push({
          id: `fee-${s.id}`,
          title: 'Pending Fee',
          message: `${s.name} has a pending balance of Rs. ${s.totalFees - s.paidFees}`,
          type: 'warning',
          date: new Date(),
          read: false
        });
      }
    });

    // Check for new leads
    leads.filter(l => l.status === 'open').forEach(l => {
      newNotifications.push({
        id: `lead-${l.id}`,
        title: 'New Lead',
        message: `${l.name} is interested in ${l.course}`,
        type: 'info',
        date: new Date(),
        read: false
      });
    });

    // Filter out dismissed notifications
    const filteredNotifications = newNotifications.filter(n => !dismissedNotifications.includes(n.id));

    setNotifications(prev => {
      // Play beep if new notifications are added (and it's not the initial load)
      const hasNew = filteredNotifications.some(n => !prev.find(p => p.id === n.id));
      if (hasNew && prev.length > 0) {
        playBeep();
      }
      return filteredNotifications;
    });
  }, [students, leads, dismissedNotifications]);

  // Google Backup Message Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleAuthenticated(true);
        toast.success('Connected to Google Drive');
        // Trigger backup automatically after connection
        handleGoogleBackup();
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Check initial status
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => setIsGoogleAuthenticated(data.isAuthenticated))
      .catch(() => {});

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleBackup = async () => {
    if (!isGoogleAuthenticated) {
      try {
        const response = await fetch('/api/auth/google/url');
        const { url } = await response.json();
        window.open(url, 'google_auth_popup', 'width=600,height=700');
      } catch (error) {
        toast.error('Failed to connect to Google');
      }
      return;
    }

    setIsBackingUp(true);
    const backupToast = toast.loading('Backing up to Google Drive...');

    try {
      const backupData = {
        batches,
        students,
        expenses,
        leads,
        teachers,
        attendance,
        payments,
        backupDate: new Date().toISOString()
      };

      const response = await fetch('/api/backup/google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: backupData,
          filename: `fees_management_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`
        })
      });

      if (!response.ok) throw new Error('Backup failed');

      toast.success('Backup saved to Google Drive', { id: backupToast });
    } catch (error) {
      toast.error('Backup failed', { id: backupToast });
      // If unauthorized, reset state
      if (error instanceof Error && error.message.includes('401')) {
        setIsGoogleAuthenticated(false);
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.name.trim()) {
      toast.error('Batch name is required');
      return;
    }
    try {
      await addDoc(collection(db, 'batches'), { 
        ...newBatch, 
        teacherId: user?.uid,
        createdAt: serverTimestamp() 
      });
      setNewBatch({ 
        name: '', 
        type: 'Monthly (Total)', 
        fees: 0, 
        startDate: format(new Date(), 'yyyy-MM-dd'), 
        endDate: format(new Date(), 'yyyy-MM-dd'),
        days: '0',
        subject: '',
        dueFeesRemark: false
      });
      setShowAddModal(null);
      setBatchStep('selection');
      toast.success('Batch added successfully');
    } catch (error) {
      toast.error('Failed to add batch');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!newStudent.rollNo.trim()) {
      toast.error('Roll number is required');
      return;
    }
    try {
      const { joinedDate, ...studentData } = newStudent;
      await addDoc(collection(db, 'students'), { 
        ...studentData, 
        joinedAt: serverTimestamp(),
        joinedDate: joinedDate, // Store the specific date selected
        status: 'active'
      });
      setNewStudent({ 
        name: '', 
        phone: '', 
        batchId: '', 
        totalFees: 0, 
        paidFees: 0, 
        rollNo: '',
        birthDate: '',
        gender: '',
        cnic: '',
        parentName: '',
        parentMobile: '',
        address: '',
        remark: '',
        photoUrl: '',
        joinedDate: format(new Date(), 'yyyy-MM-dd')
      });
      setShowAddModal(null);
      setShowAdditionalDetails(false);
      toast.success('Student added successfully');
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editingStudent.name.trim()) {
      toast.error('Student name is required');
      return;
    }
    if (!editingStudent.rollNo?.trim()) {
      toast.error('Roll number is required');
      return;
    }
    try {
      const { id, joinedAt, ...studentData } = editingStudent;
      await updateDoc(doc(db, 'students', id), studentData);
      toast.success('Student updated successfully');
      setShowAddModal(null);
      setEditingStudent(null);
    } catch (error) {
      toast.error('Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'students', studentId));
      toast.success('Student deleted successfully');
      setSelectedStudentId(null);
      setShowMoreOptions(false);
      setShowAddModal(null);
      setEditingStudent(null);
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const handleMarkAsLeft = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'students', studentId), { status: 'left' });
      toast.success('Student marked as left');
      setShowMoreOptions(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleMarkAsActive = async (studentId: string) => {
    try {
      await updateDoc(doc(db, 'students', studentId), { status: 'active' });
      toast.success('Student marked as active');
      setShowMoreOptions(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title.trim()) {
      toast.error('Expense title is required');
      return;
    }
    if (newExpense.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await addDoc(collection(db, 'expenses'), { ...newExpense, date: serverTimestamp() });
      setNewExpense({ title: '', amount: 0 });
      setShowAddModal(null);
      toast.success('Expense recorded');
    } catch (error) {
      toast.error('Failed to record expense');
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leads'), { 
        ...newLead, 
        status: 'open', 
        date: serverTimestamp() 
      });
      setNewLead({ name: '', phone: '', course: '' });
      setShowAddModal(null);
      toast.success('Lead captured');
    } catch (error) {
      toast.error('Failed to capture lead');
    }
  };

  const sendSMS = async (to: string, message: string) => {
    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('SMS sent successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to send SMS');
        return false;
      }
    } catch (error) {
      toast.error('Error sending SMS');
      return false;
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: Lead['status']) => {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'leads', leadId), { status });
  };

  const handleConvertLeadToStudent = async (lead: Lead) => {
    setNewStudent({ ...newStudent, name: lead.name, phone: lead.phone });
    setShowAddModal('student');
    // Optionally close the lead
    handleUpdateLeadStatus(lead.id, 'enrolled');
  };

  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPayment) return;

    try {
      const paymentData = {
        studentId: selectedStudentForPayment.id,
        amount: newPayment.amount,
        method: newPayment.method,
        remarks: newPayment.remarks,
        date: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      
      // Update student's paid fees
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'students', selectedStudentForPayment.id), {
        paidFees: selectedStudentForPayment.paidFees + newPayment.amount
      });

      setNewPayment({ amount: 0, method: 'cash', remarks: '' });
      setShowAddModal(null);
      setSelectedStudentForPayment(null);
      
      // Show receipt
      setShowReceipt({ id: docRef.id, ...paymentData, date: new Date() } as any);
      toast.success('Payment collected successfully');
    } catch (error) {
      toast.error('Failed to collect payment');
    }
  };

  const handleSendAnnouncement = async (type: 'twilio' | 'whatsapp' | 'sim') => {
    if (!announcementMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    let targetStudents = students;
    if (announcementTarget !== 'all') {
      targetStudents = students.filter(s => s.batchId === announcementTarget);
    }

    if (targetStudents.length === 0) {
      toast.error('No students found for this target');
      return;
    }

    if (type === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(announcementMessage)}`, '_blank');
      toast.success('WhatsApp opened');
    } else if (type === 'sim') {
      const phones = targetStudents.filter(s => s.phone).map(s => s.phone).join(',');
      window.location.href = `sms:${phones}?body=${encodeURIComponent(announcementMessage)}`;
      toast.success('SMS app opened');
    } else {
      const toastId = toast.loading(`Sending Twilio SMS to ${targetStudents.length} students...`);
      
      let successCount = 0;
      for (const student of targetStudents) {
        if (student.phone) {
          const success = await sendSMS(student.phone, announcementMessage);
          if (success) successCount++;
        }
      }

      toast.dismiss(toastId);
      toast.success(`Announcement sent to ${successCount} students via Twilio`);
    }
    setShowAddModal(null);
    setAnnouncementMessage('');
  };

  const handleSaveInstituteInfo = async () => {
    if (!instituteInfo.name || !instituteInfo.contactNo) {
      toast.error('Institute Name and Contact No are required');
      return;
    }

    try {
      const { doc, updateDoc, addDoc, collection } = await import('firebase/firestore');
      if (instituteInfo.id) {
        await updateDoc(doc(db, 'institute', instituteInfo.id), {
          name: instituteInfo.name,
          address: instituteInfo.address,
          email: instituteInfo.email,
          website: instituteInfo.website,
          contactNo: instituteInfo.contactNo,
          description: instituteInfo.description,
          photoUrl: instituteInfo.photoUrl,
          principalName: instituteInfo.principalName,
          registrationNo: instituteInfo.registrationNo
        });
      } else {
        await addDoc(collection(db, 'institute'), {
          name: instituteInfo.name,
          address: instituteInfo.address,
          email: instituteInfo.email,
          website: instituteInfo.website,
          contactNo: instituteInfo.contactNo,
          description: instituteInfo.description,
          photoUrl: instituteInfo.photoUrl,
          principalName: instituteInfo.principalName,
          registrationNo: instituteInfo.registrationNo
        });
      }
      toast.success('Institute settings saved');
      setShowInstituteSettings(false);
    } catch (error) {
      toast.error('Failed to save institute settings');
    }
  };

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    try {
      const existing = attendance.find(a => a.studentId === studentId && a.date === selectedDate);
      if (existing) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'attendance', existing.id), { status });
        toast.success('Attendance updated');
      } else {
        await addDoc(collection(db, 'attendance'), { studentId, date: selectedDate, status });
        toast.success('Attendance marked');
      }
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const generatePDFReport = (type: 'students' | 'payments' | 'expenses') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    if (instituteInfo.photoUrl) {
      try {
        // Note: jspdf addImage works best with base64 or data URLs
        // If it's a remote URL, it might need to be pre-loaded or converted
        doc.addImage(instituteInfo.photoUrl, 'JPEG', 10, 10, 25, 25);
      } catch (e) {
        console.error("Failed to add logo to PDF", e);
      }
    }
    
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // #1E3A8A
    doc.setFont('helvetica', 'bold');
    doc.text(instituteInfo.name || 'Institute Report', 40, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(instituteInfo.address || '', 40, 26);
    doc.text(`Contact: ${instituteInfo.contactNo || ''} | Email: ${instituteInfo.email || ''}`, 40, 31);
    
    doc.setDrawColor(200);
    doc.line(10, 40, pageWidth - 10, 40);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const reportTitle = type === 'students' ? 'Student Fee Summary Report' : 
                        type === 'payments' ? 'Recent Payments Report' : 'Expenses Report';
    doc.text(reportTitle, 10, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 10, 56);

    if (type === 'students') {
      const tableData = students.map((s, index) => [
        index + 1,
        s.rollNo || 'N/A',
        s.name,
        batches.find(b => b.id === s.batchId)?.name || 'N/A',
        `Rs. ${s.totalFees}`,
        `Rs. ${s.paidFees}`,
        `Rs. ${s.totalFees - s.paidFees}`,
        s.paidFees === s.totalFees ? 'Paid' : 'Pending'
      ]);

      autoTable(doc, {
        startY: 62,
        head: [['Sr.', 'Roll No', 'Name', 'Batch', 'Total', 'Paid', 'Due', 'Status']],
        body: tableData,
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    } else if (type === 'payments') {
      const tableData = payments.sort((a, b) => b.date?.seconds - a.date?.seconds).map((p, index) => {
        const student = students.find(s => s.id === p.studentId);
        return [
          index + 1,
          p.date?.toDate ? format(p.date.toDate(), 'dd MMM yyyy') : 'N/A',
          student?.name || 'Unknown',
          student?.rollNo || 'N/A',
          `Rs. ${p.amount}`,
          p.method || 'Cash'
        ];
      });

      autoTable(doc, {
        startY: 62,
        head: [['Sr.', 'Date', 'Student Name', 'Roll No', 'Amount', 'Method']],
        body: tableData,
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    } else if (type === 'expenses') {
       const tableData = expenses.sort((a, b) => b.date?.seconds - a.date?.seconds).map((e, index) => [
        index + 1,
        e.date?.toDate ? format(e.date.toDate(), 'dd MMM yyyy') : 'N/A',
        e.title,
        `Rs. ${e.amount}`
      ]);

      autoTable(doc, {
        startY: 62,
        head: [['Sr.', 'Date', 'Title', 'Amount']],
        body: tableData,
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
      });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      doc.text(`${instituteInfo.name} - ${instituteInfo.contactNo}`, 10, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`${type}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const generateReceiptPDF = (receipt: Payment) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150] // Small receipt format
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const student = students.find(s => s.id === receipt.studentId);
    
    // Header
    if (instituteInfo.photoUrl) {
      try {
        doc.addImage(instituteInfo.photoUrl, 'JPEG', pageWidth / 2 - 10, 5, 20, 20);
      } catch (e) {
        console.error("Failed to add logo to PDF", e);
      }
    }
    
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text(instituteInfo.name || 'Payment Receipt', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(instituteInfo.address || '', pageWidth / 2, 35, { align: 'center' });
    doc.text(`Contact: ${instituteInfo.contactNo || ''}`, pageWidth / 2, 39, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(5, 42, pageWidth - 5, 42);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('PAYMENT RECEIPT', pageWidth / 2, 48, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text(`Receipt ID: ${receipt.id.slice(-8).toUpperCase()}`, 10, 55);
    doc.text(`Date: ${receipt.date?.toDate ? format(receipt.date.toDate(), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}`, 10, 60);
    
    doc.line(5, 63, pageWidth - 5, 63);
    
    doc.setFontSize(9);
    doc.text('Student Name:', 10, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(student?.name || 'N/A', 40, 70);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Roll No:', 10, 75);
    doc.text(student?.rollNo || 'N/A', 40, 75);
    
    doc.text('Batch:', 10, 80);
    doc.text(batches.find(b => b.id === student?.batchId)?.name || 'N/A', 40, 80);
    
    doc.text('Payment Method:', 10, 85);
    doc.text(receipt.method || 'Cash', 40, 85);
    
    doc.line(5, 90, pageWidth - 5, 90);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount Paid:', 10, 100);
    doc.setTextColor(30, 58, 138);
    doc.text(`Rs. ${receipt.amount}`, 40, 100);
    
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your payment!', pageWidth / 2, 115, { align: 'center' });
    
    doc.save(`receipt_${receipt.id.slice(-8)}.pdf`);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(",")
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-600 p-6 text-white">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <School className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Fees Management</h1>
        <p className="text-blue-100 mb-12 text-center max-w-xs">Simple • Smart • Easy way to manage your institute</p>
        <button 
          onClick={handleLogin}
          className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold shadow-lg flex items-center gap-3 active:scale-95 transition-transform"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </div>
    );
  }

  // Calculations
  const totalIncome = students.reduce((acc, s) => acc + (s.totalFees || 0), 0);
  const receivedIncome = students.reduce((acc, s) => acc + (s.paidFees || 0), 0);
  const dueIncome = totalIncome - receivedIncome;
  const receivedPercent = totalIncome > 0 ? Math.round((receivedIncome / totalIncome) * 100) : 0;
  const duePercent = totalIncome > 0 ? Math.round((dueIncome / totalIncome) * 100) : 0;

  const todayExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0); // Simplified for demo

  const renderDashboard = () => (
    <main className="p-4 space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search students, batches..." 
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-100 focus:ring-2 focus:ring-blue-600 text-sm shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Top Progress Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <ProgressCircle 
          percent={100} 
          color="#3B82F6" 
          label="Total" 
          value={`Rs. ${totalIncome.toFixed(1)}`} 
        />
        <ProgressCircle 
          percent={receivedPercent} 
          color="#10B981" 
          label="Received" 
          value={`Rs. ${receivedIncome.toFixed(1)}`} 
        />
        <ProgressCircle 
          percent={duePercent} 
          color="#F87171" 
          label="Due" 
          value={`Rs. ${dueIncome.toFixed(1)}`} 
        />
      </div>

      {/* Backup Note */}
      <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-4 flex items-start gap-3">
        <CloudUpload className="w-5 h-5 text-[#D97706] mt-0.5" />
        <p className="text-xs text-[#92400E] leading-relaxed">
          <span className="font-bold">Note:</span> Kindly create a daily data backup routine to ensure the safety and integrity of your accounts.{" "}
          <button 
            onClick={handleGoogleBackup}
            disabled={isBackingUp}
            className="font-bold underline cursor-pointer disabled:opacity-50"
          >
            {isBackingUp ? 'Backing up...' : 'Backup Now »'}
          </button>
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <StickyNote className="w-5 h-5" />
          <h2 className="text-lg font-bold">Summary</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-blue-100 mb-3">Weekly Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Income</p>
                <p className="text-lg font-bold">Rs. {receivedIncome}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Expense</p>
                <p className="text-lg font-bold">Rs. {todayExpense}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Profit</p>
                <p className="text-lg font-bold">Rs. {receivedIncome - todayExpense}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <h3 className="text-sm font-medium text-blue-100 mb-3">Monthly Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Income</p>
                <p className="text-lg font-bold">Rs. {receivedIncome}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Expense</p>
                <p className="text-lg font-bold">Rs. {todayExpense}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-200 uppercase tracking-wider">Profit</p>
                <p className="text-lg font-bold">Rs. {receivedIncome - todayExpense}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div>
        <h2 className="text-xl font-bold text-[#1E3A8A] mb-4">Overview</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            icon={School} 
            label="Total Batches" 
            value={batches.length} 
            color="text-blue-600" 
            iconBg="bg-blue-50" 
            onClick={() => setActiveTab('batches')}
          />
          <StatCard 
            icon={Users} 
            label="Total Students" 
            value={students.length} 
            color="text-green-600" 
            iconBg="bg-green-50" 
            onClick={() => setShowAllStudents(true)}
          />
          <StatCard icon={Clock} label="Recently Joined" value={0} color="text-orange-600" iconBg="bg-orange-50" />
          <StatCard icon={Wallet} label="Today's Collection" value={`Rs. ${receivedIncome}`} color="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard icon={TrendingUp} label="Today's Expense" value={`Rs. ${todayExpense}`} color="text-rose-600" iconBg="bg-rose-50" />
          <StatCard icon={ArrowUpRight} label="Open Leads" value={leads.filter(l => l.status === 'open').length} color="text-purple-600" iconBg="bg-purple-50" />
          <StatCard 
            icon={Bell} 
            label="Fees Reminders" 
            value={students.filter(s => s.paidFees < s.totalFees).length} 
            color="text-yellow-600" 
            iconBg="bg-yellow-50" 
            onClick={() => setActiveTab('reminders')}
          />
          <StatCard icon={StickyNote} label="Notes" value={0} color="text-blue-600" iconBg="bg-blue-50" />
          <StatCard icon={UserCheck} label="Teachers" value={teachers.length} color="text-cyan-600" iconBg="bg-cyan-50" />
        </div>
      </div>

      {/* Quick Action Section */}
      <div>
        <h2 className="text-xl font-bold text-[#1E3A8A] mb-4">Quick Action</h2>
        <div className="grid grid-cols-4 gap-3">
          <div onClick={() => setShowAddModal('batch')}>
            <QuickAction icon={Plus} label="Add Batch" color="bg-blue-50" />
          </div>
          <div onClick={() => setShowAddModal('student')}>
            <QuickAction icon={Plus} label="Add Student" color="bg-green-50" />
          </div>
          <div onClick={() => setShowAddModal('expense')}>
            <QuickAction icon={Plus} label="Add Expense" color="bg-rose-50" />
          </div>
          <div onClick={() => setShowAllStudents(true)}>
            <QuickAction icon={LayoutGrid} label="View All" color="bg-purple-50" />
          </div>
          <div onClick={() => setShowAddModal('announcement')}>
            <QuickAction icon={Bell} label="Announcement" color="bg-yellow-50" />
          </div>
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="py-12 flex flex-col items-center justify-center opacity-20 select-none pointer-events-none">
        <h2 className="text-6xl font-black text-gray-400">Fees</h2>
        <h2 className="text-6xl font-black text-gray-400 -mt-4">Management</h2>
        <p className="text-lg font-medium tracking-widest mt-2">Simple • Smart • Easy</p>
      </div>
    </main>
  );

  const renderAllStudents = () => (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAllStudents(false)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-[#1E3A8A]">All Students ({students.length})</h2>
        </div>
        <button 
          onClick={() => setShowAddModal('student')}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search here..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <select 
          value={selectedBatchId}
          onChange={e => setSelectedBatchId(e.target.value)}
          className="bg-transparent border-none text-blue-900 font-bold text-sm focus:ring-0 p-0"
        >
          <option value="all">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {students
          .filter(s => (selectedBatchId === 'all' || s.batchId === selectedBatchId))
          .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(student => (
            <div 
              key={student.id} 
              onClick={() => {
                setSelectedStudentId(student.id);
                setShowAllStudents(false);
              }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center overflow-hidden">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{student.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Roll No : {student.rollNo || 'N/A'}</p>
                </div>
              </div>
              <div>
                {student.totalFees - student.paidFees > 0 ? (
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Due : Rs. {student.totalFees - student.paidFees}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Paid
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </main>
  );

  const renderBatchDetails = () => {
    if (!selectedBatchForDetails) return null;
    const batch = selectedBatchForDetails;
    const batchStudents = students.filter(s => s.batchId === batch.id);
    const totalFees = batchStudents.reduce((acc, s) => acc + (s.totalFees || 0), 0);
    const paidFees = batchStudents.reduce((acc, s) => acc + (s.paidFees || 0), 0);
    const dueFees = totalFees - paidFees;
    const collectionPercentage = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedBatchForDetails(null)}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold">{batch.name} Students</h3>
          </div>
          <button onClick={() => setShowMoreOptions(true)}>
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Horizontal Menu */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', color: 'bg-blue-600 text-white' },
              { icon: Users, label: 'Students', color: 'bg-gray-100 text-gray-400' },
              { icon: UserPlus, label: 'Leads', color: 'bg-gray-100 text-gray-400' },
              { icon: StickyNote, label: 'Notes', color: 'bg-gray-100 text-gray-400' },
              { icon: CalendarCheck, label: 'Attendance', color: 'bg-gray-100 text-gray-400' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-blue-600">Total</p>
              <div className="w-12 h-12 rounded-full border-4 border-blue-600 flex items-center justify-center text-[10px] font-bold text-blue-600">
                100%
              </div>
              <p className="text-[10px] font-bold text-gray-900">Rs.{totalFees}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-2xl border border-green-100 flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-green-600">Received</p>
              <div className="w-12 h-12 rounded-full border-4 border-green-600 flex items-center justify-center text-[10px] font-bold text-green-600">
                {collectionPercentage}%
              </div>
              <p className="text-[10px] font-bold text-gray-900">Rs.{paidFees}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-red-600">Due</p>
              <div className="w-12 h-12 rounded-full border-4 border-red-200 flex items-center justify-center text-[10px] font-bold text-red-600">
                {100 - collectionPercentage}%
              </div>
              <p className="text-[10px] font-bold text-gray-900">Rs.{dueFees}</p>
            </div>
          </div>

          {/* Batch Info Card */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{batch.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold">{batchStudents.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <ListOrdered className="w-4 h-4" />
                    <span className="text-xs font-bold">{batch.type || 'Monthly'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-xs font-bold">
                Rs. {batch.fees || 0}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2">
                <GraduationCap className="w-3 h-3" />
                Iqra Attariya
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold text-gray-500">
                  {batch.startDate ? format(new Date(batch.startDate), 'dd-MM-yyyy') : 'N/A'} → {batch.endDate ? format(new Date(batch.endDate), 'dd-MM-yyyy') : 'N/A'}
                </p>
              </div>
              <p className="text-[10px] font-bold text-gray-400">
                {batch.startDate && batch.endDate ? 
                  `${Math.ceil((new Date(batch.endDate).getTime() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days` : 
                  '0 Days'}
              </p>
            </div>
          </div>

          {/* Student Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Students', value: batchStudents.length, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
              { label: 'Active Students', value: batchStudents.filter(s => s.status !== 'left').length, icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-50' },
              { label: 'Left Students', value: batchStudents.filter(s => s.status === 'left').length, icon: UserMinus, color: 'text-red-600', bgColor: 'bg-red-50' },
              { label: 'Fees Reminder', value: batchStudents.filter(s => (s.totalFees || 0) > (s.paidFees || 0)).length, icon: Wallet, color: 'text-orange-600', bgColor: 'bg-orange-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bgColor, stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">{stat.label} :</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Quick Action</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'View Student', icon: Users, color: 'bg-blue-50 text-blue-600' },
                { label: 'Add Attendance', icon: CalendarCheck, color: 'bg-green-50 text-green-600' },
                { label: 'Add Homework', icon: StickyNote, color: 'bg-gray-50 text-gray-400' },
                { label: 'Add Exam', icon: HelpCircle, color: 'bg-gray-50 text-gray-400' },
              ].map((action, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.color)}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] text-gray-600 font-bold text-center leading-tight">{action.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reports */}
          <div className="space-y-4 pb-10">
            <h3 className="text-lg font-bold text-gray-900">Reports</h3>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-gray-900">Attendance Report</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBatches = () => (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1E3A8A]">Batches</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportToCSV(batches, 'batches_report.csv')}
            className="p-2 text-gray-400"
          >
            <Download className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowAddModal('batch')}
            className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {batches.map(batch => (
          <div 
            key={batch.id} 
            onClick={() => setSelectedBatchForDetails(batch)}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{batch.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold">{students.filter(s => s.batchId === batch.id).length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <ListOrdered className="w-4 h-4" />
                    <span className="text-xs font-bold">{batch.type || 'Monthly'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-xs font-bold">
                  Rs. {batch.fees || 0}
                </div>
                <button className="p-1 text-gray-400">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold text-gray-500">
                  {batch.startDate ? format(new Date(batch.startDate), 'dd MMM') : 'N/A'} → {batch.endDate ? format(new Date(batch.endDate), 'dd MMM') : 'N/A'}
                </p>
              </div>
              <p className="text-[10px] font-bold text-gray-400">
                {batch.startDate && batch.endDate ? 
                  `${Math.ceil((new Date(batch.endDate).getTime() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days` : 
                  '0 Days'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );

  const renderInstituteSettings = () => (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowInstituteSettings(false)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h3 className="text-xl font-bold">Institute Setting</h3>
        </div>
        <button onClick={handleSaveInstituteInfo}>
          <CheckCircle2 className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="bg-[#1E3A8A] text-white py-2 px-4 rounded-lg text-center font-bold text-sm">
            * Institute's Details *
          </div>

          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => document.getElementById('institute-photo-upload')?.click()}
              className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center relative overflow-hidden cursor-pointer"
            >
              {instituteInfo.photoUrl ? (
                <img src={instituteInfo.photoUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <Camera className="w-10 h-10 text-gray-400" />
              )}
              <div className="absolute bottom-2 right-2 bg-[#1E3A8A] p-1.5 rounded-full text-white border-2 border-white">
                <Camera className="w-4 h-4" />
              </div>
              <input 
                id="institute-photo-upload"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setInstituteInfo({...instituteInfo, photoUrl: reader.result as string});
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500">Tap to add institute photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Institute name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="Enter Institute's Name" 
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.name}
                onChange={e => setInstituteInfo({...instituteInfo, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea 
                placeholder="Enter Institute's Address" 
                rows={3}
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.address}
                onChange={e => setInstituteInfo({...instituteInfo, address: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Institute Email: <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input 
                type="email" 
                placeholder="Enter Institute's Email" 
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.email}
                onChange={e => setInstituteInfo({...instituteInfo, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Institute Website: <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input 
                type="url" 
                placeholder="Enter Institute's Website URL" 
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.website}
                onChange={e => setInstituteInfo({...instituteInfo, website: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Institute Contact No <span className="text-red-500">*</span></label>
              <input 
                type="tel" 
                placeholder="Enter Institute's Contact No" 
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.contactNo}
                onChange={e => setInstituteInfo({...instituteInfo, contactNo: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Principal Name: <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input 
                  type="text" 
                  placeholder="Principal Name" 
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                  value={instituteInfo.principalName}
                  onChange={e => setInstituteInfo({...instituteInfo, principalName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reg. Number: <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input 
                  type="text" 
                  placeholder="Reg. No" 
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                  value={instituteInfo.registrationNo}
                  onChange={e => setInstituteInfo({...instituteInfo, registrationNo: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Description: <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea 
                placeholder="Enter description" 
                rows={4}
                className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={instituteInfo.description}
                onChange={e => setInstituteInfo({...instituteInfo, description: e.target.value})}
              />
            </div>

            <button 
              onClick={handleSaveInstituteInfo}
              className="w-full bg-[#1E3A8A] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Save Institute Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedBatchForDetails(null);
    setSelectedStudentId(null);
    setShowAllStudents(false);
  };

  const renderSettings = () => (
    <main className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-[#1E3A8A]">Settings</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-4 flex items-center gap-4 border-b border-gray-50">
          <img src={user.photoURL || ''} className="w-12 h-12 rounded-full" alt="Profile" />
          <div>
            <h3 className="font-bold text-gray-900">{user.displayName}</h3>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowInstituteSettings(true)}
          className="w-full p-4 text-left text-gray-700 font-bold flex items-center gap-3 active:bg-gray-50 border-b border-gray-50"
        >
          <School className="w-5 h-5 text-blue-600" />
          Institute Setting
        </button>

        <button 
          onClick={handleLogout}
          className="w-full p-4 text-left text-red-600 font-bold flex items-center gap-3 active:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </main>
  );

  const renderAttendance = () => {
    const filteredStudents = students.filter(s => 
      (selectedBatchId === 'all' || s.batchId === selectedBatchId) &&
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <main className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1E3A8A]">Attendance</h2>
          <input 
            type="date" 
            className="p-2 rounded-lg border border-gray-200 text-sm bg-white"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setSelectedBatchId('all')}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors", selectedBatchId === 'all' ? "bg-blue-600 text-white" : "bg-white text-gray-500 border border-gray-100")}
          >
            All Batches
          </button>
          {batches.map(b => (
            <button 
              key={b.id}
              onClick={() => setSelectedBatchId(b.id)}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors", selectedBatchId === b.id ? "bg-blue-600 text-white" : "bg-white text-gray-500 border border-gray-100")}
            >
              {b.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search student..." 
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-100 focus:ring-2 focus:ring-blue-600 text-sm shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No students found</div>
          ) : filteredStudents.map(student => {
            const record = attendance.find(a => a.studentId === student.id && a.date === selectedDate);
            return (
              <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{student.name}</h3>
                  <p className="text-[10px] text-gray-500">{batches.find(b => b.id === student.batchId)?.name}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleMarkAttendance(student.id, 'present')}
                    className={cn("p-2 rounded-lg transition-colors", record?.status === 'present' ? "bg-green-100 text-green-600" : "bg-gray-50 text-gray-400")}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleMarkAttendance(student.id, 'absent')}
                    className={cn("p-2 rounded-lg transition-colors", record?.status === 'absent' ? "bg-red-100 text-red-600" : "bg-gray-50 text-gray-400")}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  };

  const renderReports = () => (
    <main className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1E3A8A]">Reports</h2>
        <button 
          onClick={() => exportToCSV(students, 'students_report.csv')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Generate PDF Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => generatePDFReport('students')}
            className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-4 rounded-2xl text-xs font-bold hover:bg-blue-100 transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" />
            Fee Summary PDF
          </button>
          <button 
            onClick={() => generatePDFReport('payments')}
            className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-4 rounded-2xl text-xs font-bold hover:bg-green-100 transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" />
            Payments PDF
          </button>
          <button 
            onClick={() => generatePDFReport('expenses')}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-2xl text-xs font-bold hover:bg-red-100 transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" />
            Expenses PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-[8px] text-gray-400 uppercase font-bold mb-1">Collection</p>
          <p className="text-sm font-bold text-green-600">Rs. {receivedIncome}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-[8px] text-gray-400 uppercase font-bold mb-1">Expenses</p>
          <p className="text-sm font-bold text-red-600">Rs. {todayExpense}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-[8px] text-gray-400 uppercase font-bold mb-1">Outstanding</p>
          <p className="text-sm font-bold text-orange-600">Rs. {students.reduce((acc, s) => acc + (s.totalFees - s.paidFees), 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Fee Summary</h3>
          <span className="text-[10px] text-gray-400 font-bold">{students.length} Students</span>
        </div>
        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
          {students.map(s => (
            <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <div 
                onClick={() => setSelectedStudentId(s.id)}
                className="cursor-pointer group"
              >
                <span className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{s.name}</span>
                <p className="text-[10px] text-gray-400">{batches.find(b => b.id === s.batchId)?.name}</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudentForPayment(s);
                    setShowAddModal('payment');
                  }}
                  className="text-blue-600 text-[10px] font-bold mt-1 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Collect Fee
                </button>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">Rs. {s.paidFees} <span className="text-gray-300 font-normal">/ Rs. {s.totalFees}</span></p>
                <p className={cn("text-[10px] font-bold", s.paidFees === s.totalFees ? "text-green-600" : "text-red-600")}>
                  {s.paidFees === s.totalFees ? 'Paid' : `Due: Rs. ${s.totalFees - s.paidFees}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Recent Payments</h3>
        </div>
        <div className="p-4 space-y-3">
          {payments.sort((a, b) => b.date?.seconds - a.date?.seconds).slice(0, 5).map(p => {
            const student = students.find(s => s.id === p.studentId);
            return (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-800">{student?.name || 'Unknown'}</p>
                  <p className="text-gray-400">{p.date?.toDate ? format(p.date.toDate(), 'dd MMM, hh:mm a') : 'Just now'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">Rs. {p.amount}</p>
                  <button 
                    onClick={() => setShowReceipt(p)}
                    className="text-blue-600 font-bold text-[10px]"
                  >
                    View Receipt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );

  const renderReminders = () => {
    const pendingStudents = students.filter(s => s.paidFees < s.totalFees);

    return (
      <main className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setActiveTab('dashboard')} className="p-2 -ml-2">
            <Plus className="w-5 h-5 rotate-45 text-gray-400" />
          </button>
          <h2 className="text-xl font-bold text-[#1E3A8A]">Fees Reminders</h2>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-800">{pendingStudents.length} Students Pending</p>
            <p className="text-xs text-yellow-700">Total outstanding: Rs. {students.reduce((acc, s) => acc + (s.totalFees - s.paidFees), 0)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {pendingStudents.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-500 font-medium">All fees are collected!</p>
            </div>
          ) : pendingStudents.map(student => (
            <div key={student.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{student.name}</h3>
                  <p className="text-[10px] text-gray-500">{batches.find(b => b.id === student.batchId)?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">Due: Rs. {student.totalFees - student.paidFees}</p>
                  <p className="text-[10px] text-gray-400">Total: Rs. {student.totalFees}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={`tel:${student.phone}`}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <button 
                  onClick={() => {
                    const text = `Hi ${student.name}, reminder: pending fees Rs. ${student.totalFees - student.paidFees}. Please clear it soon.`;
                    window.location.href = `sms:${student.phone}?body=${encodeURIComponent(text)}`;
                  }}
                  className="flex-1 bg-orange-50 text-orange-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </button>
                <button 
                  onClick={() => {
                    const text = `Hi ${student.name}, this is a reminder regarding your pending fees of Rs. ${student.totalFees - student.paidFees} at our institute. Please clear it at your earliest convenience. Thank you!`;
                    window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  };

  const renderLeads = () => (
    <main className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1E3A8A]">Lead Management</h2>
        <button 
          onClick={() => setShowAddModal('lead')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total Leads</p>
          <p className="text-xl font-bold text-blue-600">{leads.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Enrolled</p>
          <p className="text-xl font-bold text-green-600">{leads.filter(l => l.status === 'enrolled').length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {['open', 'contacted', 'enrolled', 'closed'].map(status => {
          const statusLeads = leads.filter(l => l.status === status);
          if (statusLeads.length === 0 && status !== 'open') return null;

          return (
            <div key={status} className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status === 'open' ? "bg-blue-500" : 
                  status === 'contacted' ? "bg-yellow-500" :
                  status === 'enrolled' ? "bg-green-500" : "bg-gray-500"
                )} />
                {status} ({statusLeads.length})
              </h3>
              <div className="space-y-3">
                {statusLeads.map(lead => (
                  <div key={lead.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{lead.name}</h4>
                        <p className="text-[10px] text-gray-500">{lead.course}</p>
                      </div>
                      <a href={`tel:${lead.phone}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={lead.status}
                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                        className="flex-1 bg-gray-50 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-0"
                      >
                        <option value="open">Open</option>
                        <option value="contacted">Contacted</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="closed">Closed</option>
                      </select>
                      {lead.status !== 'enrolled' && (
                        <button 
                          onClick={() => handleConvertLeadToStudent(lead)}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-bold"
                        >
                          Enroll
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );

  const renderStudentProfile = () => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;

    const studentPayments = payments.filter(p => p.studentId === student.id);
    const studentAttendance = attendance.filter(a => a.studentId === student.id);
    const presentCount = studentAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = studentAttendance.length > 0 
      ? Math.round((presentCount / studentAttendance.length) * 100) 
      : 0;
    const dueAmount = student.totalFees - student.paidFees;

    return (
      <main className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedStudentId(null)} className="p-2 -ml-2">
              <Plus className="w-5 h-5 rotate-45 text-gray-400" />
            </button>
            <h2 className="text-xl font-bold text-[#1E3A8A]">{student.name} 's Profile</h2>
          </div>
          <button onClick={() => setShowMoreOptions(true)} className="p-2">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 relative overflow-hidden">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center overflow-hidden">
                {student.photoUrl ? (
                  <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {student.name}
                  {student.status === 'left' && (
                    <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Left</span>
                  )}
                </h3>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Phone className="w-3 h-3" />
                    <span className="text-xs font-medium">{student.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <GraduationCap className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Roll No: {student.rollNo || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="text-gray-400">
              <Plus className="w-5 h-5 rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50/50 p-3 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 uppercase mb-1">
                <Wallet className="w-3 h-3" /> Total
              </div>
              <p className="text-sm font-black text-blue-900">Rs. {student.totalFees}</p>
            </div>
            <div className="bg-green-50/50 p-3 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-green-600 uppercase mb-1">
                <CheckCircle2 className="w-3 h-3" /> Paid
              </div>
              <p className="text-sm font-black text-green-900">Rs. {student.paidFees}</p>
            </div>
            <div className="bg-red-50/50 p-3 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-red-600 uppercase mb-1">
                <Bell className="w-3 h-3" /> Due
              </div>
              <p className="text-sm font-black text-red-900">Rs. {dueAmount}</p>
            </div>
          </div>

          {dueAmount > 0 && (
            <div className="mt-6 bg-red-50 p-4 rounded-2xl flex items-center justify-between border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Fee Due Reminder</p>
                  <p className="text-xs font-bold text-red-900">Rs. {dueAmount} due for {format(new Date(), 'MMMM yyyy')}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">Tap to share reminder</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const text = `Hi ${student.name}, this is a reminder regarding your pending fees of Rs. ${dueAmount} for ${format(new Date(), 'MMMM yyyy')}. Please clear it at your earliest convenience. Thank you!`;
                    window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="p-2 text-green-600 bg-green-50 rounded-lg"
                  title="WhatsApp Reminder"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    const text = `Hi ${student.name}, reminder: pending fees Rs. ${dueAmount} for ${format(new Date(), 'MMMM yyyy')}. Please clear it soon.`;
                    window.location.href = `sms:${student.phone}?body=${encodeURIComponent(text)}`;
                  }}
                  className="p-2 text-orange-600 bg-orange-50 rounded-lg"
                  title="SIM SMS Reminder"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    const text = `Hi ${student.name}, reminder: pending fees Rs. ${dueAmount} for ${format(new Date(), 'MMMM yyyy')}. Please clear it soon.`;
                    sendSMS(student.phone, text);
                  }}
                  className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  title="Twilio SMS Reminder"
                >
                  <MessageSquareText className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Important Announcement Section */}
          <div className="mt-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Important Announcement</p>
                <p className="text-xs font-bold text-blue-900">Send custom message to student</p>
              </div>
            </div>
            <div className="space-y-3">
              <textarea 
                placeholder="Type your message here..."
                className="w-full p-3 bg-white rounded-xl border border-blue-100 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                rows={2}
                id={`announcement-${student.id}`}
              />
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const textarea = document.getElementById(`announcement-${student.id}`) as HTMLTextAreaElement;
                    const text = textarea.value.trim();
                    if (!text) {
                      toast.error('Please enter a message');
                      return;
                    }
                    window.location.href = `sms:${student.phone}?body=${encodeURIComponent(text)}`;
                    textarea.value = '';
                  }}
                  className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> SIM SMS
                </button>
                <button 
                  onClick={() => {
                    const textarea = document.getElementById(`announcement-${student.id}`) as HTMLTextAreaElement;
                    const text = textarea.value.trim();
                    if (!text) {
                      toast.error('Please enter a message');
                      return;
                    }
                    sendSMS(student.phone, text);
                    textarea.value = '';
                  }}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageSquareText className="w-4 h-4" /> Twilio SMS
                </button>
                <button 
                  onClick={() => {
                    const textarea = document.getElementById(`announcement-${student.id}`) as HTMLTextAreaElement;
                    const text = textarea.value.trim();
                    if (!text) {
                      toast.error('Please enter a message');
                      return;
                    }
                    window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="p-2.5 text-green-600 bg-green-50 rounded-xl border border-green-100"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Batch: {batches.find(b => b.id === student.batchId)?.name}</span>
            <span>Joined on {student.joinedDate || (student.joinedAt?.toDate ? format(student.joinedAt.toDate(), 'dd MMM yyyy') : 'N/A')}</span>
          </div>

          {/* Additional Details in Profile */}
          {(student.birthDate || student.gender || student.cnic || student.parentName || student.parentMobile || student.address || student.remark) && (
            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Additional Details</p>
              <div className="grid grid-cols-2 gap-4">
                {student.birthDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">DOB: {student.birthDate}</span>
                  </div>
                )}
                {student.gender && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">Gender: {student.gender}</span>
                  </div>
                )}
                {student.cnic && (
                  <div className="flex items-center gap-2 col-span-2">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">CNIC: {student.cnic}</span>
                  </div>
                )}
                {student.parentName && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">Parent: {student.parentName}</span>
                  </div>
                )}
                {student.parentMobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">P. Mobile: {student.parentMobile}</span>
                  </div>
                )}
                {student.address && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span className="text-xs text-gray-600">Address: {student.address}</span>
                  </div>
                )}
                {student.remark && (
                  <div className="flex items-start gap-2 col-span-2">
                    <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                    <span className="text-xs text-gray-600 italic">Remark: {student.remark}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button 
            onClick={() => {
              setEditingStudent(student);
              setShowAddModal('edit-student');
            }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Edit</span>
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <UserCheck className="w-5 h-5 text-green-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Attendance</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">report</span>
          </button>
          <button 
            onClick={() => setShowMoreOptions(true)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <LayoutGrid className="w-5 h-5 text-purple-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">more</span>
          </button>
        </div>

        {/* More Options Bottom Sheet */}
        <AnimatePresence>
          {showMoreOptions && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMoreOptions(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md bg-white rounded-t-[40px] p-6 pb-12 shadow-2xl"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <h3 className="text-xl font-bold text-center text-gray-900 mb-8">more_options</h3>

                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setShowICard(student.id);
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-active:scale-90 transition-transform">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">I-Card</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowCertificate(student.id);
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-active:scale-90 transition-transform">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">Certificate</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowAdmissionForm(student.id);
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-active:scale-90 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">Admission Form</span>
                  </button>

                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl opacity-50 cursor-not-allowed text-left group">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-400">Withdrawal Form</span>
                  </button>

                  <button 
                    onClick={() => {
                      if (student.status === 'left') {
                        handleMarkAsActive(student.id);
                      } else {
                        handleMarkAsLeft(student.id);
                      }
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center group-active:scale-90 transition-transform",
                      student.status === 'left' ? "bg-green-50 text-green-600" : "bg-pink-50 text-pink-600"
                    )}>
                      {student.status === 'left' ? <UserCheck className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-gray-700">
                      {student.status === 'left' ? "Mark as Active" : "Student Left"}
                    </span>
                  </button>

                  <button 
                    onClick={() => handleDeleteStudent(student.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-active:scale-90 transition-transform">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-red-600">Delete</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Fees History */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Student Fees History</h3>
            <button 
              onClick={() => {
                setSelectedStudentForPayment(student);
                setShowAddModal('payment');
              }}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {studentPayments.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-xs">No payment history found</p>
            ) : studentPayments.sort((a, b) => b.date?.seconds - a.date?.seconds).map((p, index) => (
              <div key={p.id} className="bg-gray-50/50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {studentPayments.length - index}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {p.date?.toDate ? format(p.date.toDate(), 'dd MMM yyyy') : 'Just now'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <p className="font-black text-green-600">Rs. {p.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  };

  const renderICardModal = () => {
    const student = students.find(s => s.id === showICard);
    if (!student) return null;
    const batch = batches.find(b => b.id === student.batchId);

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
        >
          <div className="bg-[#1E3A8A] p-6 text-white text-center relative">
            <button 
              onClick={() => setShowICard(null)}
              className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
            {instituteInfo.photoUrl && (
              <img src={instituteInfo.photoUrl} className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover" alt="" />
            )}
            <h3 className="text-lg font-bold tracking-widest uppercase leading-tight">{instituteInfo.name || 'Student Identity Card'}</h3>
            {instituteInfo.registrationNo && (
              <p className="text-[8px] font-bold bg-white/20 inline-block px-2 py-0.5 rounded mt-1">REG NO: {instituteInfo.registrationNo}</p>
            )}
            <p className="text-[10px] opacity-70 mt-1">{instituteInfo.address || 'Academic Session 2025-26'}</p>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div className="w-32 h-32 rounded-2xl border-4 border-blue-50 overflow-hidden shadow-md mb-6">
              {student.photoUrl ? (
                <img src={student.photoUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-[#1E3A8A] mb-1">{student.name}</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Roll No: {student.rollNo}</p>
            
            <div className="w-full space-y-3 bg-gray-50 p-6 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Batch</span>
                <span className="text-xs font-bold text-gray-700">{batch?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Phone</span>
                <span className="text-xs font-bold text-gray-700">{student.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Joined</span>
                <span className="text-xs font-bold text-gray-700">{student.joinedDate}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-[#1E3A8A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <Printer className="w-5 h-5" /> Print Card
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderCertificateModal = () => {
    const student = students.find(s => s.id === showCertificate);
    if (!student) return null;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl p-12 border-[16px] border-blue-50 relative"
        >
          <button 
            onClick={() => setShowCertificate(null)}
            className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full text-gray-400"
          >
            <Plus className="w-6 h-6 rotate-45" />
          </button>

          <div className="text-center space-y-8">
            <div className="flex justify-center mb-4">
              {instituteInfo.photoUrl ? (
                <img src={instituteInfo.photoUrl} className="w-20 h-20 rounded-xl object-cover" alt="" />
              ) : (
                <Award className="w-20 h-20 text-blue-600" />
              )}
            </div>
            
            <h1 className="text-5xl font-black text-[#1E3A8A] uppercase tracking-tighter">{instituteInfo.name || 'Certificate'}</h1>
            <p className="text-lg font-bold text-gray-400 uppercase tracking-widest">{instituteInfo.address || 'Of Achievement'}</p>
            
            <div className="py-8">
              <p className="text-xl text-gray-600">This is to certify that</p>
              <h2 className="text-4xl font-black text-gray-900 my-4 underline decoration-blue-600 underline-offset-8">{student.name}</h2>
              <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                has successfully completed the course requirements and demonstrated exceptional dedication and performance.
              </p>
            </div>
            
            <div className="flex justify-between items-end pt-12">
              <div className="text-center">
                <div className="w-32 border-b-2 border-gray-200 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Date</p>
                <p className="text-xs font-bold text-gray-900">{format(new Date(), 'dd MMM yyyy')}</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-b-2 border-gray-200 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Principal Signature</p>
                {instituteInfo.principalName && (
                  <p className="text-xs font-bold text-gray-900 mt-1">{instituteInfo.principalName}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <button 
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-600/20"
            >
              <Printer className="w-5 h-5" /> Print Certificate
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderAdmissionFormModal = () => {
    const student = students.find(s => s.id === showAdmissionForm);
    if (!student) return null;
    const batch = batches.find(b => b.id === student.batchId);

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white w-full max-w-3xl h-[90vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="text-xl font-bold text-gray-900">Admission Form</h3>
            <button 
              onClick={() => setShowAdmissionForm(null)}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-400"
            >
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-12 space-y-12">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                {instituteInfo.photoUrl && (
                  <img src={instituteInfo.photoUrl} className="w-16 h-16 rounded-xl object-cover mb-2" alt="" />
                )}
                <h1 className="text-3xl font-black text-[#1E3A8A] uppercase">{instituteInfo.name || 'ADMISSION FORM'}</h1>
                {instituteInfo.registrationNo && (
                  <p className="text-[10px] font-bold text-blue-600">REGISTRATION NO: {instituteInfo.registrationNo}</p>
                )}
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{instituteInfo.address || 'Academic Year 2025-2026'}</p>
              </div>
              <div className="w-32 h-40 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 text-[10px] text-center p-4">
                {student.photoUrl ? (
                  <img src={student.photoUrl} className="w-full h-full object-cover rounded-xl" alt="" />
                ) : (
                  "Affix Passport Size Photo"
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Student Name</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Roll Number</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.rollNo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Batch / Class</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{batch?.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Joined Date</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.joinedDate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">CNIC / ID</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.cnic || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Gender</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.gender || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Parent Name</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.parentName || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Parent Mobile</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.parentMobile || 'N/A'}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Residential Address</p>
                <p className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1">{student.address || 'N/A'}</p>
              </div>
            </div>

            <div className="pt-12 space-y-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase">Declaration</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                I hereby declare that the information provided above is true to the best of my knowledge. I agree to abide by the rules and regulations of the institution.
              </p>
              <div className="flex justify-between pt-12">
                <div className="text-center">
                  <div className="w-48 border-b border-gray-300 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Parent Signature</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-gray-300 mb-2" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Student Signature</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-100">
            <button 
              onClick={() => window.print()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
            >
              <Printer className="w-5 h-5" /> Print Admission Form
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] pb-24">
      <Toaster position="top-center" />
      
      {/* Document Modals */}
      {showICard && renderICardModal()}
      {showCertificate && renderCertificateModal()}
      {showAdmissionForm && renderAdmissionFormModal()}
      {showInstituteSettings && renderInstituteSettings()}
      
      {/* Header */}
      <header className="bg-[#1E40AF] text-white p-4 pt-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden">
            {instituteInfo.photoUrl ? (
              <img src={instituteInfo.photoUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <School className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <h1 className="text-lg font-bold truncate max-w-[150px]">{instituteInfo.name || 'Fees Management'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowNotifications(true)} className="relative">
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>
          <button onClick={() => toast('QR Scanner coming soon!', { icon: '🔍' })}>
            <QrCode className="w-6 h-6" />
          </button>
          <button onClick={() => setShowSearch(true)}>
            <Search className="w-6 h-6" />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedBatchForDetails?.id || selectedStudentId || showAllStudents || activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {selectedBatchForDetails ? renderBatchDetails() : (
            <>
              {selectedStudentId ? renderStudentProfile() : (
                <>
                  {showAllStudents ? renderAllStudents() : (
                    <>
                      {activeTab === 'dashboard' && renderDashboard()}
                      {activeTab === 'batches' && renderBatches()}
                      {activeTab === 'attendance' && renderAttendance()}
                      {activeTab === 'leads' && renderLeads()}
                      {activeTab === 'reports' && renderReports()}
                      {activeTab === 'reminders' && renderReminders()}
                      {activeTab === 'settings' && renderSettings()}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => setDismissedNotifications(prev => [...prev, ...notifications.map(n => n.id)])}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {notifications.length === 0 ? (
                <p className="text-center py-10 text-gray-400">No new notifications</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={cn(
                    "p-4 rounded-2xl border flex gap-3 relative group",
                    n.type === 'warning' ? "bg-yellow-50 border-yellow-100" : "bg-blue-50 border-blue-100"
                  )}>
                    <button 
                      onClick={() => setDismissedNotifications(prev => [...prev, n.id])}
                      className="absolute top-2 right-2 p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      n.type === 'warning' ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"
                    )}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="pr-4">
                      <p className="font-bold text-sm text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search students or leads..." 
                className="bg-transparent border-none focus:ring-0 flex-1 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-gray-400">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {searchQuery && (
                <>
                  {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => { setSelectedStudentId(s.id); setShowSearch(false); setSearchQuery(''); }}
                      className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{s.name}</p>
                          <p className="text-[10px] text-gray-500">Student • {batches.find(b => b.id === s.batchId)?.name}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                  {leads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                    <button 
                      key={l.id} 
                      onClick={() => { setActiveTab('leads'); setShowSearch(false); setSearchQuery(''); }}
                      className="w-full flex items-center justify-between p-3 hover:bg-orange-50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                          {l.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{l.name}</p>
                          <p className="text-[10px] text-gray-500">Lead • {l.course}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className={cn(
            "bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom duration-300 overflow-hidden",
            showAddModal === 'student' || showAddModal === 'batch' ? "p-0" : "p-6"
          )}>
            {showAddModal !== 'student' && showAddModal !== 'batch' && (
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Add {showAddModal.charAt(0).toUpperCase() + showAddModal.slice(1)}
                </h3>
                <button onClick={() => setShowAddModal(null)} className="text-gray-400">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
            )}

            {showAddModal === 'batch' && (
              <div className="flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      if (batchStep === 'form') setBatchStep('selection');
                      else setShowAddModal(null);
                    }}>
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h3 className="text-xl font-bold">
                      {batchStep === 'selection' ? 'Select Batch Type' : 'New Batch'}
                    </h3>
                  </div>
                  {batchStep === 'form' && (
                    <button onClick={handleAddBatch}>
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {batchStep === 'selection' ? (
                    <div className="space-y-3">
                      {[
                        { id: 'Monthly (Total)', desc: 'Monthly recurring batch', icon: Calendar, color: 'bg-blue-50 text-blue-600' },
                        { id: 'Monthly (Subscription)', desc: 'Monthly subscription based', icon: Wallet, color: 'bg-indigo-50 text-indigo-600' },
                        { id: 'Yearly', desc: 'Annual batch duration', icon: CalendarCheck, color: 'bg-green-50 text-green-600' },
                        { id: 'Quarterly', desc: '3-month duration batch', icon: LayoutGrid, color: 'bg-orange-50 text-orange-600' },
                        { id: 'Custom', desc: 'Custom duration batch', icon: ListOrdered, color: 'bg-purple-50 text-purple-600' },
                        { id: 'Installments', desc: 'Payment in installments', icon: Wallet, color: 'bg-teal-50 text-teal-600' },
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setNewBatch({ ...newBatch, type: type.id });
                            setBatchStep('form');
                          }}
                          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 active:bg-gray-50 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", type.color)}>
                              <type.icon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-gray-900">{type.id}</p>
                              <p className="text-xs text-gray-500">{type.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleAddBatch} className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Batch Name *</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                          <input 
                            type="text" 
                            placeholder="Enter Batch's Name" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newBatch.name}
                            onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Batch type</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                          <select 
                            className="w-full pl-12 pr-10 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600 appearance-none"
                            value={newBatch.type}
                            onChange={e => setNewBatch({...newBatch, type: e.target.value})}
                          >
                            {['Monthly (Total)', 'Monthly (Subscription)', 'Yearly', 'Quarterly', 'Custom', 'Installments'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <MoreVertical className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90" />
                        </div>
                        <p className="text-[10px] text-orange-600 mt-2 flex items-start gap-1">
                          <HelpCircle className="w-3 h-3 mt-0.5" />
                          Note: Batch type should not be changed later. Please choose carefully.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Total fees Amount *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-600">Rs</span>
                          <input 
                            type="number" 
                            placeholder="Enter Amount" 
                            className="w-full pl-12 pr-12 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newBatch.fees || ''}
                            onChange={e => setNewBatch({...newBatch, fees: Number(e.target.value)})}
                            required
                          />
                          {newBatch.fees > 0 && (
                            <button 
                              type="button"
                              onClick={() => setNewBatch({...newBatch, fees: 0})}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              <Plus className="w-5 h-5 rotate-45" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Start Date *</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                            <input 
                              type="date" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600 text-sm"
                              value={newBatch.startDate}
                              onChange={e => setNewBatch({...newBatch, startDate: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2 text-right">End Date *</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                            <input 
                              type="date" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600 text-sm"
                              value={newBatch.endDate}
                              onChange={e => setNewBatch({...newBatch, endDate: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Days <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <div className="relative">
                          <ListOrdered className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                          <input 
                            type="text" 
                            placeholder="0" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newBatch.days}
                            onChange={e => setNewBatch({...newBatch, days: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Subject <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <div className="relative">
                          <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                          <input 
                            type="text" 
                            placeholder="Enter Subject's Name" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newBatch.subject}
                            onChange={e => setNewBatch({...newBatch, subject: e.target.value})}
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          checked={newBatch.dueFeesRemark}
                          onChange={e => setNewBatch({...newBatch, dueFeesRemark: e.target.checked})}
                        />
                        <span className="text-sm font-bold text-gray-700">Due Fees Remark</span>
                      </label>

                      <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                        Create Batch
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {showAddModal === 'student' && (
              <div className="flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowAddModal(null)}>
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h3 className="text-xl font-bold">New Student</h3>
                  </div>
                  <button onClick={handleAddStudent}>
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                  {/* Profile Image Placeholder */}
                  <div className="flex justify-center">
                    <div 
                      onClick={() => document.getElementById('student-photo-upload')?.click()}
                      className="w-32 h-32 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-dashed border-gray-200 relative overflow-hidden cursor-pointer group"
                    >
                      {newStudent.photoUrl ? (
                        <img src={newStudent.photoUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input 
                        id="student-photo-upload"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewStudent({...newStudent, photoUrl: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Roll No : <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <ListOrdered className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Enter Roll No" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          value={newStudent.rollNo}
                          onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">NAME <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Enter Student's Name" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          value={newStudent.name}
                          onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Select Batch <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 appearance-none"
                          value={newStudent.batchId}
                          onChange={e => setNewStudent({...newStudent, batchId: e.target.value})}
                        >
                          <option value="">Select Batch</option>
                          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Fees Amount</label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" 
                            placeholder="Enter Amount" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newStudent.totalFees || ''}
                            onChange={e => setNewStudent({...newStudent, totalFees: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Total Fees Paid</label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={newStudent.paidFees || ''}
                            onChange={e => setNewStudent({...newStudent, paidFees: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">JOINED DATE</label>
                      <div className="relative">
                        <CalendarCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="date" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                          value={newStudent.joinedDate}
                          onChange={e => setNewStudent({...newStudent, joinedDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add More Details Button */}
                  {!showAdditionalDetails && (
                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={() => setShowAdditionalDetails(true)}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform"
                      >
                        Add more details
                      </button>
                    </div>
                  )}

                  {/* Additional Details Section */}
                  {showAdditionalDetails && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top duration-300">
                      <div className="bg-[#1E40AF] text-white p-3 rounded-lg text-center font-bold text-sm tracking-widest">
                        * * Additional Details : :
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Birth Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <CalendarCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="date" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.birthDate}
                              onChange={e => setNewStudent({...newStudent, birthDate: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Gender <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="grid grid-cols-3 gap-3">
                            {['Male', 'Female', 'Other'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setNewStudent({...newStudent, gender: g})}
                                className={cn(
                                  "py-3 rounded-xl border font-bold text-sm transition-colors",
                                  newStudent.gender === g 
                                    ? "bg-blue-600 text-white border-blue-600" 
                                    : "bg-white text-gray-600 border-gray-200"
                                )}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">CNIC <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Enter CNIC (e.g. 12345-1234567-1)" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.cnic}
                              onChange={e => setNewStudent({...newStudent, cnic: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Parent Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Enter Parent's Name" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.parentName}
                              onChange={e => setNewStudent({...newStudent, parentName: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Parent Mobile No <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="tel" 
                              placeholder="Enter Parent's Mobile No" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.parentMobile}
                              onChange={e => setNewStudent({...newStudent, parentMobile: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-6 w-5 h-5 text-gray-400" />
                            <textarea 
                              placeholder="Enter Address" 
                              rows={3}
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.address}
                              onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Remark <span className="text-gray-400 font-normal">(Optional)</span></label>
                          <div className="relative">
                            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Enter Remark" 
                              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                              value={newStudent.remark}
                              onChange={e => setNewStudent({...newStudent, remark: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showAddModal === 'edit-student' && editingStudent && (
              <div className="flex flex-col h-full max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      setShowAddModal(null);
                      setEditingStudent(null);
                    }}>
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h3 className="text-xl font-bold">Edit Student</h3>
                  </div>
                  <button onClick={handleUpdateStudent}>
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                  {/* Profile Image Edit */}
                  <div className="flex justify-center">
                    <div 
                      onClick={() => document.getElementById('edit-student-photo-upload')?.click()}
                      className="w-32 h-32 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-dashed border-gray-200 relative overflow-hidden cursor-pointer group"
                    >
                      {editingStudent.photoUrl ? (
                        <img src={editingStudent.photoUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input 
                        id="edit-student-photo-upload"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditingStudent({...editingStudent, photoUrl: reader.result as string});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Roll No : <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <ListOrdered className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Enter Roll No" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                          value={editingStudent.rollNo}
                          onChange={e => setEditingStudent({...editingStudent, rollNo: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">NAME <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Enter Student's Name" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                          value={editingStudent.name}
                          onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                          type="tel" 
                          placeholder="Enter Phone Number" 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                          value={editingStudent.phone}
                          onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Select Batch</label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select 
                          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 appearance-none"
                          value={editingStudent.batchId}
                          onChange={e => setEditingStudent({...editingStudent, batchId: e.target.value})}
                        >
                          <option value="">Select Batch</option>
                          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Total Fees</label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.totalFees}
                            onChange={e => setEditingStudent({...editingStudent, totalFees: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Paid Fees</label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.paidFees}
                            onChange={e => setEditingStudent({...editingStudent, paidFees: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1E40AF] text-white p-3 rounded-lg text-center font-bold text-sm tracking-widest mt-6">
                      * * Additional Details : :
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Birth Date</label>
                        <div className="relative">
                          <CalendarCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="date" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.birthDate || ''}
                            onChange={e => setEditingStudent({...editingStudent, birthDate: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Gender</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['Male', 'Female', 'Other'].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setEditingStudent({...editingStudent, gender: g})}
                              className={cn(
                                "py-3 rounded-xl border font-bold text-sm transition-colors",
                                editingStudent.gender === g 
                                  ? "bg-blue-600 text-white border-blue-600" 
                                  : "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">CNIC</label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Enter CNIC" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.cnic || ''}
                            onChange={e => setEditingStudent({...editingStudent, cnic: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Parent Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Enter Parent's Name" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.parentName || ''}
                            onChange={e => setEditingStudent({...editingStudent, parentName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Parent Mobile No</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="tel" 
                            placeholder="Enter Parent's Mobile No" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.parentMobile || ''}
                            onChange={e => setEditingStudent({...editingStudent, parentMobile: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-6 w-5 h-5 text-gray-400" />
                          <textarea 
                            placeholder="Enter Address" 
                            rows={3}
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.address || ''}
                            onChange={e => setEditingStudent({...editingStudent, address: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Remark</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Enter Remark" 
                            className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600"
                            value={editingStudent.remark || ''}
                            onChange={e => setEditingStudent({...editingStudent, remark: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="pt-6 grid grid-cols-2 gap-4">
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingStudent.status === 'left') {
                              handleMarkAsActive(editingStudent.id);
                            } else {
                              handleMarkAsLeft(editingStudent.id);
                            }
                            setShowAddModal(null);
                            setEditingStudent(null);
                          }}
                          className={cn(
                            "py-4 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2",
                            editingStudent.status === 'left' ? "bg-green-50 text-green-600 border border-green-100" : "bg-pink-50 text-pink-600 border border-pink-100"
                          )}
                        >
                          {editingStudent.status === 'left' ? <UserCheck className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                          {editingStudent.status === 'left' ? "Activate" : "Mark Left"}
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteStudent(editingStudent.id)}
                          className="py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {showAddModal === 'expense' && (
              <form onSubmit={handleAddExpense} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Expense Title" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newExpense.title}
                  onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Amount" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  required
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Save Expense</button>
              </form>
            )}

            {showAddModal === 'lead' && (
              <form onSubmit={handleAddLead} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Lead Name" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                  required
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newLead.phone}
                  onChange={e => setNewLead({...newLead, phone: e.target.value})}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Interested Course" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newLead.course}
                  onChange={e => setNewLead({...newLead, course: e.target.value})}
                  required
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Save Lead</button>
              </form>
            )}

            {showAddModal === 'payment' && selectedStudentForPayment && (
              <form onSubmit={handleCollectFee} className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-600 font-bold uppercase">Collecting for</p>
                  <p className="font-bold text-blue-900">{selectedStudentForPayment.name}</p>
                  <p className="text-xs text-blue-700">Due Amount: Rs. {selectedStudentForPayment.totalFees - selectedStudentForPayment.paidFees}</p>
                </div>
                <input 
                  type="number" 
                  placeholder="Payment Amount" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newPayment.amount}
                  onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                  required
                  max={selectedStudentForPayment.totalFees - selectedStudentForPayment.paidFees}
                />
                <select 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newPayment.method}
                  onChange={e => setNewPayment({...newPayment, method: e.target.value as any})}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="check">Check</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Remarks (Optional)" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newPayment.remarks}
                  onChange={e => setNewPayment({...newPayment, remarks: e.target.value})}
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Confirm Payment</button>
              </form>
            )}

            {showAddModal === 'announcement' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Send Announcement</p>
                  <p className="text-[10px] text-blue-700 mt-1">Send a message to multiple students at once.</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Audience</label>
                    <select 
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                      value={announcementTarget}
                      onChange={e => setAnnouncementTarget(e.target.value)}
                    >
                      <option value="all">All Students ({students.length})</option>
                      {batches.map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} ({students.filter(s => s.batchId === batch.id).length} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Message</label>
                    <textarea 
                      placeholder="Type your announcement here..." 
                      rows={4}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-600 outline-none font-medium resize-none"
                      value={announcementMessage}
                      onChange={e => setAnnouncementMessage(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-right font-bold">{announcementMessage.length} characters</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => handleSendAnnouncement('twilio')}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100 active:scale-95 transition-transform"
                  >
                    <MessageSquareText className="w-6 h-6 text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Twilio</span>
                  </button>
                  <button 
                    onClick={() => handleSendAnnouncement('sim')}
                    className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 active:scale-95 transition-transform"
                  >
                    <MessageSquare className="w-6 h-6 text-orange-600" />
                    <span className="text-[10px] font-bold text-orange-600 uppercase">SIM SMS</span>
                  </button>
                  <button 
                    onClick={() => handleSendAnnouncement('whatsapp')}
                    className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-2xl border border-green-100 active:scale-95 transition-transform"
                  >
                    <Phone className="w-6 h-6 text-green-600" />
                    <span className="text-[10px] font-bold text-green-600 uppercase">WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
            
            <div className="text-center mb-6">
              {instituteInfo.photoUrl && (
                <img src={instituteInfo.photoUrl} className="w-16 h-16 mx-auto mb-2 rounded-xl object-cover" alt="" />
              )}
              <h3 className="text-xl font-bold text-gray-900">{instituteInfo.name || 'Payment Receipt'}</h3>
              <p className="text-[10px] text-gray-500">{instituteInfo.address}</p>
              <p className="text-[10px] text-blue-600 font-bold">{instituteInfo.contactNo}</p>
              <p className="text-xs text-gray-400 mt-1">Transaction ID: {showReceipt.id.slice(-8).toUpperCase()}</p>
            </div>

            <div className="space-y-4 border-t border-b border-dashed border-gray-200 py-6 my-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student Name</span>
                <span className="font-bold text-gray-900">{students.find(s => s.id === showReceipt.studentId)?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-bold text-gray-900">
                  {showReceipt.date?.toDate ? format(showReceipt.date.toDate(), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-bold text-gray-900 capitalize">{showReceipt.method}</span>
              </div>
              <div className="flex justify-between text-lg pt-2">
                <span className="font-bold text-gray-900">Amount Paid</span>
                <span className="font-black text-blue-600">Rs. {showReceipt.amount}</span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-[10px] text-gray-400 italic">Thank you for your payment!</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => generateReceiptPDF(showReceipt)}
                  className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Print
                </button>
                <button 
                  onClick={() => setShowReceipt(null)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 flex items-center justify-around z-30">
        <button 
          onClick={() => handleTabChange('dashboard')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'dashboard' ? "text-blue-600" : "text-gray-400")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => handleTabChange('batches')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'batches' ? "text-blue-600" : "text-gray-400")}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[9px] font-bold">Batches</span>
        </button>
        <button 
          onClick={() => handleTabChange('attendance')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'attendance' ? "text-blue-600" : "text-gray-400")}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold">Attendance</span>
        </button>
        <button 
          onClick={() => handleTabChange('leads')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'leads' ? "text-blue-600" : "text-gray-400")}
        >
          <ArrowUpRight className="w-5 h-5" />
          <span className="text-[9px] font-bold">Leads</span>
        </button>
        <button 
          onClick={() => handleTabChange('reports')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'reports' ? "text-blue-600" : "text-gray-400")}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[9px] font-bold">Reports</span>
        </button>
        <button 
          onClick={() => handleTabChange('settings')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'settings' ? "text-blue-600" : "text-gray-400")}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold">Settings</span>
        </button>
      </nav>
    </div>
  );
}
