import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
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
  UserCheck,
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
  XCircle
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
  timing: string;
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
  const [showAddModal, setShowAddModal] = useState<'batch' | 'student' | 'expense' | 'attendance' | 'payment' | 'lead' | 'edit-student' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<Payment | null>(null);
  
  // Data States
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Search & Filter States
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form States
  const [newBatch, setNewBatch] = useState({ name: '', timing: '' });
  const [newStudent, setNewStudent] = useState({ name: '', phone: '', batchId: '', totalFees: 0, paidFees: 0, rollNo: '' });
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

    setNotifications(newNotifications);
  }, [students, leads]);

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
    try {
      await addDoc(collection(db, 'batches'), { ...newBatch, createdAt: serverTimestamp() });
      setNewBatch({ name: '', timing: '' });
      setShowAddModal(null);
      toast.success('Batch added successfully');
    } catch (error) {
      toast.error('Failed to add batch');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'students'), { 
        ...newStudent, 
        joinedAt: serverTimestamp() 
      });
      setNewStudent({ name: '', phone: '', batchId: '', totalFees: 0, paidFees: 0, rollNo: '' });
      setShowAddModal(null);
      toast.success('Student added successfully');
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        name: editingStudent.name,
        phone: editingStudent.phone,
        batchId: editingStudent.batchId,
        totalFees: Number(editingStudent.totalFees),
        rollNo: editingStudent.rollNo || ''
      });
      toast.success('Student updated successfully');
      setShowAddModal(null);
      setEditingStudent(null);
    } catch (error) {
      toast.error('Failed to update student');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <BookOpen className="w-10 h-10 text-blue-600" />
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
          <StatCard icon={BookOpen} label="Total Batches" value={batches.length} color="text-blue-600" iconBg="bg-blue-50" />
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
            <Plus className="w-5 h-5 rotate-45 text-gray-400" />
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
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
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

  const renderBatches = () => (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1E3A8A]">Batches</h2>
        <button 
          onClick={() => setShowAddModal('batch')}
          className="bg-blue-600 text-white p-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3">
        {batches.map(batch => (
          <div key={batch.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">{batch.name}</h3>
              <p className="text-xs text-gray-500">{batch.timing}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
              {students.filter(s => s.batchId === batch.id).length} Students
            </div>
          </div>
        ))}
      </div>
    </main>
  );

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
          <button className="p-2">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 relative overflow-hidden">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
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
              <button 
                onClick={() => {
                  const text = `Hi ${student.name}, this is a reminder regarding your pending fees of Rs. ${dueAmount} for ${format(new Date(), 'MMMM yyyy')}. Please clear it at your earliest convenience. Thank you!`;
                  window.open(`https://wa.me/${student.phone}?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="p-2 text-red-400"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Batch: {batches.find(b => b.id === student.batchId)?.name}</span>
            <span>Joined on {student.joinedAt?.toDate ? format(student.joinedAt.toDate(), 'dd MMM yyyy') : 'N/A'}</span>
          </div>
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
          <button className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <LayoutGrid className="w-5 h-5 text-purple-600" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">more</span>
          </button>
        </div>

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

  return (
    <div className="min-h-screen bg-[#F8F9FD] pb-24">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-[#1E40AF] text-white p-4 pt-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-lg font-bold">Fees Management</h1>
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
          key={selectedStudentId || showAllStudents || activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
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
              <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
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
                    "p-4 rounded-2xl border flex gap-3",
                    n.type === 'warning' ? "bg-yellow-50 border-yellow-100" : "bg-blue-50 border-blue-100"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      n.type === 'warning' ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"
                    )}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
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
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Add {showAddModal.charAt(0).toUpperCase() + showAddModal.slice(1)}
              </h3>
              <button onClick={() => setShowAddModal(null)} className="text-gray-400">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            {showAddModal === 'batch' && (
              <form onSubmit={handleAddBatch} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Batch Name" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newBatch.name}
                  onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Timing (e.g. 10:00 AM - 11:00 AM)" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newBatch.timing}
                  onChange={e => setNewBatch({...newBatch, timing: e.target.value})}
                  required
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Save Batch</button>
              </form>
            )}

            {showAddModal === 'student' && (
              <form onSubmit={handleAddStudent} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Student Name" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  required
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.phone}
                  onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Roll No" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.rollNo}
                  onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})}
                />
                <select 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.batchId}
                  onChange={e => setNewStudent({...newStudent, batchId: e.target.value})}
                  required
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="Total Fees" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.totalFees || ''}
                  onChange={e => setNewStudent({...newStudent, totalFees: Number(e.target.value)})}
                  required
                />
                <input 
                  type="number" 
                  placeholder="Initial Paid Fees" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={newStudent.paidFees || ''}
                  onChange={e => setNewStudent({...newStudent, paidFees: Number(e.target.value)})}
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Add Student</button>
              </form>
            )}

            {showAddModal === 'edit-student' && editingStudent && (
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Student Name" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  required
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={editingStudent.phone}
                  onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Roll No" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={editingStudent.rollNo}
                  onChange={e => setEditingStudent({...editingStudent, rollNo: e.target.value})}
                />
                <select 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={editingStudent.batchId}
                  onChange={e => setEditingStudent({...editingStudent, batchId: e.target.value})}
                  required
                >
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="Total Fees" 
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-600"
                  value={editingStudent.totalFees || ''}
                  onChange={e => setEditingStudent({...editingStudent, totalFees: Number(e.target.value)})}
                  required
                />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Update Student</button>
              </form>
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
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Payment Receipt</h3>
              <p className="text-xs text-gray-400">Transaction ID: {showReceipt.id.slice(-8).toUpperCase()}</p>
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
          onClick={() => setActiveTab('dashboard')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'dashboard' ? "text-blue-600" : "text-gray-400")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('batches')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'batches' ? "text-blue-600" : "text-gray-400")}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[9px] font-bold">Batches</span>
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'attendance' ? "text-blue-600" : "text-gray-400")}
        >
          <CalendarCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold">Attendance</span>
        </button>
        <button 
          onClick={() => setActiveTab('leads')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'leads' ? "text-blue-600" : "text-gray-400")}
        >
          <ArrowUpRight className="w-5 h-5" />
          <span className="text-[9px] font-bold">Leads</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'reports' ? "text-blue-600" : "text-gray-400")}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[9px] font-bold">Reports</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn("flex flex-col items-center gap-1 p-2 min-w-[64px]", activeTab === 'settings' ? "text-blue-600" : "text-gray-400")}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold">Settings</span>
        </button>
      </nav>
    </div>
  );
}
