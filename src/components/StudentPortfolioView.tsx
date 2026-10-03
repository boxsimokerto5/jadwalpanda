import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  User, 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Heart, 
  HeartPulse, 
  Pill, 
  FileText, 
  Plus, 
  Trash2, 
  Share2, 
  Printer, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Award, 
  BookOpen, 
  Smile, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ExternalLink,
  Users,
  Edit3,
  Phone,
  PhoneCall,
  Home,
  Bed,
  Droplet,
  Save,
  MessageCircle
} from 'lucide-react';
import { Student, StudentMedicalPlan, StudentPortfolioNote, Staff } from '../types';
import { ALL_STUDENTS_DATA, TOTAL_STUDENTS_COUNT, SD_STUDENTS_COUNT, SMP_STUDENTS_COUNT, SMA_STUDENTS_COUNT } from '../data/studentsData';
import { 
  subscribeToStudentNotes, 
  saveStudentNoteToSupabase, 
  deleteStudentNoteFromSupabase,
  getLocalStudentNotes,
  subscribeToStudentOverrides,
  saveStudentOverrideToSupabase,
  getLocalStudentOverrides
} from '../utils/supabaseBackend';
import { soundManager } from '../utils/audio';

interface StudentPortfolioViewProps {
  medicalPlans: StudentMedicalPlan[];
  staffList: Staff[];
  selectedStaffId: number;
  onNavigateToTab?: (tab: 'dashboard' | 'medical' | 'assignment') => void;
  onOpenNewMedicalPlanForStudent?: (studentName: string, studentClass: string) => void;
}

/**
 * Calculates approximate age from DD-MM-YYYY string
 */
function calculateAge(birthDateStr: string): string {
  if (!birthDateStr) return '-';
  const parts = birthDateStr.split('-');
  if (parts.length !== 3) return '-';
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '-';

  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return `${Math.max(0, age)} Tahun`;
}

export const StudentPortfolioView: React.FC<StudentPortfolioViewProps> = ({
  medicalPlans = [],
  staffList = [],
  selectedStaffId,
  onNavigateToTab,
  onOpenNewMedicalPlanForStudent,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeJenjang, setActiveJenjang] = useState<'Semua' | 'SD' | 'SMP' | 'SMA'>('Semua');
  const [activeClassFilter, setActiveClassFilter] = useState<string>('Semua');
  const [activeGenderFilter, setActiveGenderFilter] = useState<'Semua' | 'Laki-laki' | 'Perempuan'>('Semua');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Active sub-tab inside student detail
  const [detailTab, setDetailTab] = useState<'biodata' | 'medis' | 'catatan' | 'cetak'>('biodata');

  // Notes state
  const [notes, setNotes] = useState<StudentPortfolioNote[]>(() => getLocalStudentNotes());
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [noteCategory, setNoteCategory] = useState<StudentPortfolioNote['category']>('Ibadah');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteDate, setNoteDate] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedWa, setCopiedWa] = useState<boolean>(false);

  // Student Custom Overrides State (Room, Phone, BloodType, Guardian, Emergency, Notes, etc.)
  const [studentOverrides, setStudentOverrides] = useState<Record<number, Partial<Student>>>(() => getLocalStudentOverrides());
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: '',
    class: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    room: '',
    phone: '',
    nik: '',
    birthPlace: '',
    birthDate: '',
    motherName: '',
    guardianName: '',
    emergencyContact: '',
    bloodType: '',
    address: '',
    notes: '',
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find active staff
  const activeStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || staffList[0] || { name: 'Wali Asuh' };
  }, [staffList, selectedStaffId]);

  // Subscribe to real-time student notes from Supabase
  useEffect(() => {
    const unsub = subscribeToStudentNotes((updatedNotes) => {
      setNotes(updatedNotes);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time student overrides (room, phone, etc.) from Supabase
  useEffect(() => {
    const unsub = subscribeToStudentOverrides((updatedOverrides) => {
      setStudentOverrides(updatedOverrides);
    });
    return () => unsub();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Merge base student data with persistent custom overrides
  const allStudents = useMemo(() => {
    return ALL_STUDENTS_DATA.map((st) => {
      const ov = studentOverrides[st.no];
      return ov ? { ...st, ...ov } : st;
    });
  }, [studentOverrides]);

  // Active student currently being inspected (with overrides applied)
  const activeStudent = useMemo<Student | null>(() => {
    if (!selectedStudent) return null;
    const ov = studentOverrides[selectedStudent.no];
    return ov ? { ...selectedStudent, ...ov } : selectedStudent;
  }, [selectedStudent, studentOverrides]);

  // Distinct classes list for filter
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    allStudents.forEach((s) => {
      if (activeJenjang === 'Semua') {
        set.add(s.class);
      } else if (activeJenjang === 'SD' && s.class.startsWith('SD')) {
        set.add(s.class);
      } else if (activeJenjang === 'SMP' && (s.class.startsWith('VII') || s.class.startsWith('VIII') || s.class.startsWith('IX'))) {
        set.add(s.class);
      } else if (activeJenjang === 'SMA' && (s.class.startsWith('X') || s.class.startsWith('XI') || s.class.startsWith('XII'))) {
        set.add(s.class);
      }
    });
    return Array.from(set).sort();
  }, [allStudents, activeJenjang]);

  // Live autocomplete search candidates (searches name, NIK, class, address, room, and phone)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return allStudents.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchNik = s.nik.includes(q);
      const matchClass = s.class.toLowerCase().includes(q);
      const matchAddress = s.address.toLowerCase().includes(q);
      const matchRoom = s.room ? s.room.toLowerCase().includes(q) : false;
      const matchPhone = s.phone ? s.phone.includes(q) : false;
      return matchName || matchNik || matchClass || matchAddress || matchRoom || matchPhone;
    }).slice(0, 10);
  }, [allStudents, searchTerm]);

  // Filtered students for browse directory
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (activeJenjang === 'SD' && !s.class.startsWith('SD')) return false;
      if (activeJenjang === 'SMP' && !(s.class.startsWith('VII') || s.class.startsWith('VIII') || s.class.startsWith('IX'))) return false;
      if (activeJenjang === 'SMA' && !(s.class.startsWith('X') || s.class.startsWith('XI') || s.class.startsWith('XII'))) return false;

      if (activeClassFilter !== 'Semua' && s.class !== activeClassFilter) return false;
      if (activeGenderFilter !== 'Semua' && s.gender !== activeGenderFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchNik = s.nik.includes(q);
        const matchAddress = s.address.toLowerCase().includes(q);
        const matchRoom = s.room ? s.room.toLowerCase().includes(q) : false;
        const matchPhone = s.phone ? s.phone.includes(q) : false;
        return matchName || matchNik || matchAddress || matchRoom || matchPhone;
      }

      return true;
    });
  }, [allStudents, activeJenjang, activeClassFilter, activeGenderFilter, searchTerm]);

  // Selected student's notes
  const studentNotes = useMemo(() => {
    if (!activeStudent) return [];
    return notes.filter((n) => n.studentNo === activeStudent.no || n.studentName.toLowerCase() === activeStudent.name.toLowerCase());
  }, [notes, activeStudent]);

  // Selected student's medical plans (connected directly to Supabase data)
  const studentMedicalPlans = useMemo(() => {
    if (!activeStudent) return [];
    const sName = activeStudent.name.toLowerCase();
    return medicalPlans.filter((p) => {
      if (!p.studentName) return false;
      const planName = p.studentName.toLowerCase();
      return planName.includes(sName) || sName.includes(planName);
    });
  }, [medicalPlans, activeStudent]);

  // Handle student selection
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowSearchDropdown(false);
    setSearchTerm('');
    soundManager.playChime();
  };

  // Open Edit Student Modal
  const handleOpenEditModal = (student: Student) => {
    const ov = studentOverrides[student.no];
    const merged: Student = ov ? { ...student, ...ov } : student;
    setEditForm({
      name: merged.name || '',
      class: merged.class || '',
      gender: merged.gender || 'Laki-laki',
      room: merged.room || '',
      phone: merged.phone || '',
      nik: merged.nik || '',
      birthPlace: merged.birthPlace || '',
      birthDate: merged.birthDate || '',
      motherName: merged.motherName || '',
      guardianName: merged.guardianName || '',
      emergencyContact: merged.emergencyContact || '',
      bloodType: merged.bloodType || '',
      address: merged.address || '',
      notes: merged.notes || '',
    });
    setShowEditModal(true);
  };

  // Save Edit Student Data
  const handleSaveEdit = async () => {
    if (!activeStudent) return;
    setIsSavingEdit(true);
    try {
      const updatedData: Partial<Student> = {
        name: editForm.name.trim() || activeStudent.name,
        class: editForm.class.trim() || activeStudent.class,
        gender: editForm.gender,
        room: editForm.room.trim(),
        phone: editForm.phone.trim(),
        nik: editForm.nik.trim() || activeStudent.nik,
        birthPlace: editForm.birthPlace.trim() || activeStudent.birthPlace,
        birthDate: editForm.birthDate.trim() || activeStudent.birthDate,
        motherName: editForm.motherName.trim() || activeStudent.motherName,
        guardianName: editForm.guardianName.trim(),
        emergencyContact: editForm.emergencyContact.trim(),
        bloodType: editForm.bloodType.trim(),
        address: editForm.address.trim() || activeStudent.address,
        notes: editForm.notes.trim(),
      };

      await saveStudentOverrideToSupabase(activeStudent.no, updatedData);
      setStudentOverrides((prev) => ({
        ...prev,
        [activeStudent.no]: {
          ...(prev[activeStudent.no] || {}),
          ...updatedData,
        },
      }));

      soundManager.playChime();
      triggerToast('Informasi siswa (Nomor Kamar & HP) berhasil disimpan!');
      setShowEditModal(false);
    } catch (err) {
      triggerToast('Gagal menyimpan perubahan data');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Add new note
  const handleSaveNote = async () => {
    if (!activeStudent || !noteContent.trim()) return;

    setIsSavingNote(true);
    const newNote: StudentPortfolioNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentNo: activeStudent.no,
      studentName: activeStudent.name,
      date: noteDate,
      category: noteCategory,
      content: noteContent.trim(),
      authorName: activeStaff.name,
      authorRole: 'Wali Asuh',
      createdAt: new Date().toISOString(),
    };

    await saveStudentNoteToSupabase(newNote);
    setNoteContent('');
    setShowAddNoteModal(false);
    setIsSavingNote(false);
    soundManager.playChime();
    triggerToast('Catatan perkembangan siswa berhasil disimpan!');
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Hapus catatan pembinaan ini?')) {
      await deleteStudentNoteFromSupabase(noteId);
      triggerToast('Catatan berhasil dihapus');
    }
  };

  // Copy student summary to WhatsApp format
  const handleCopyWa = () => {
    if (!activeStudent) return;
    const age = calculateAge(activeStudent.birthDate);
    const textLines = [
      `*DATA PORTOFOLIO SISWA - SENTRA TERPADU SRT 1 KAB. KEDIRI*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `*Nama Lengkap:* ${activeStudent.name}`,
      `*Kelas:* ${activeStudent.class}`,
      `*Jenis Kelamin:* ${activeStudent.gender}`,
      `*Kamar / Asrama:* ${activeStudent.room || '-'}`,
      `*No. HP / WA:* ${activeStudent.phone || '-'}`,
      `*Usia:* ${age}`,
      `*TTL:* ${activeStudent.birthPlace}, ${activeStudent.birthDate}`,
      `*NIK:* ${activeStudent.nik}`,
      `*Nama Ibu Kandung:* ${activeStudent.motherName}`,
      activeStudent.guardianName ? `*Nama Wali / Ayah:* ${activeStudent.guardianName}` : null,
      activeStudent.emergencyContact ? `*Kontak Darurat:* ${activeStudent.emergencyContact}` : null,
      activeStudent.bloodType ? `*Golongan Darah:* ${activeStudent.bloodType}` : null,
      `*Alamat:* ${activeStudent.address}`,
      activeStudent.notes ? `*Catatan Khusus/Alergi:* ${activeStudent.notes}` : null,
      `\n*REKAM MEDIS & KESEHATAN:*`,
      studentMedicalPlans.length > 0
        ? studentMedicalPlans.map((m) => `• ${m.date} - ${m.destination} (${m.purpose}) [Status: ${m.status.toUpperCase()}]`).join('\n')
        : `• Tidak ada riwayat / jadwal berobat aktif.`,
      `\n*CATATAN PEMBINAAN WALI ASUH:*`,
      studentNotes.length > 0
        ? studentNotes.map((n) => `• [${n.category}] ${n.date} (${n.authorName}): "${n.content}"`).join('\n')
        : `• Belum ada catatan pembinaan khusus.`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `_Dikutip dari Sistem Informasi Wali Asuh SRT 1 Kab. Kediri_`,
    ].filter(Boolean) as string[];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedWa(true);
    soundManager.playChime();
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12 print:p-0 print:m-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-14 right-4 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xl backdrop-blur-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Statistics Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Portofolio & Rekam Siswa Asuh
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                  {TOTAL_STUDENTS_COUNT} Siswa
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencarian instan biodata, rekam medis, catatan ibadah & pembinaan santri/siswa SRT 1 Kab. Kediri
              </p>
            </div>
          </div>

          {/* Quick Statistic Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">SD: </span>
              <strong className="text-slate-800 dark:text-slate-100">{SD_STUDENTS_COUNT}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">SMP: </span>
              <strong className="text-slate-800 dark:text-slate-100">{SMP_STUDENTS_COUNT}</strong>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">SMA: </span>
              <strong className="text-slate-800 dark:text-slate-100">{SMA_STUDENTS_COUNT}</strong>
            </div>
          </div>
        </div>

        {/* Live Search Bar (Exact implementation of the user's request) */}
        <div className="mt-4 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Ketik nama siswa (contoh: Adam, Amanda, Alif, Salsa, Danu, dll)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-2 border-blue-300 dark:border-blue-700/80 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setShowSearchDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchDropdown && searchTerm.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-40 overflow-hidden max-h-80 overflow-y-auto">
              <div className="p-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Hasil Pencarian: <strong>{searchResults.length}</strong> siswa ditemukan</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Klik nama untuk melihat portofolio</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((st) => (
                    <button
                      key={st.no}
                      type="button"
                      onClick={() => handleSelectStudent(st)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/80 dark:hover:bg-blue-950/50 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          st.gender === 'Laki-laki' 
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' 
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {st.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                            <span>{st.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              st.gender === 'Laki-laki' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {st.gender === 'Laki-laki' ? 'L' : 'P'}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{st.class}</span>
                            {st.room && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                                🏠 {st.room}
                              </span>
                            )}
                            {st.phone && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                                📞 {st.phone}
                              </span>
                            )}
                            <span>•</span>
                            <span className="truncate">{st.address}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada siswa dengan nama <em>"{searchTerm}"</em>. Coba kata kunci lain atau periksa ejaan.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jenjang Filter Chips */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Jenjang:</span>
            {(['Semua', 'SD', 'SMP', 'SMA'] as const).map((jenjang) => (
              <button
                key={jenjang}
                type="button"
                onClick={() => {
                  setActiveJenjang(jenjang);
                  setActiveClassFilter('Semua');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeJenjang === jenjang
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {jenjang}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Class select */}
            <select
              value={activeClassFilter}
              onChange={(e) => setActiveClassFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>

            {/* Gender select */}
            <select
              value={activeGenderFilter}
              onChange={(e) => setActiveGenderFilter(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Selected Student Portfolio OR Directory View */}
      {activeStudent ? (
        /* ================= SELECTED STUDENT PORTFOLIO VIEW ================= */
        <div className="space-y-4">
          {/* Top Profile Header Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className={`w-14 h-14 rounded-2xl font-black text-xl flex items-center justify-center shadow-md shrink-0 ${
                  activeStudent.gender === 'Laki-laki'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20'
                    : 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/20'
                }`}>
                  {activeStudent.name.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                      {activeStudent.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeStudent.gender === 'Laki-laki'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}>
                      {activeStudent.gender}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                      Kelas {activeStudent.class}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Usia {calculateAge(activeStudent.birthDate)}
                    </span>

                    {/* Room Badge or Add Room Prompt */}
                    {activeStudent.room ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                        <Home className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Kamar: {activeStudent.room}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(activeStudent)}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Klik untuk mengisi nomor kamar siswa"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ No. Kamar</span>
                      </button>
                    )}

                    {/* Phone Badge or Add Phone Prompt */}
                    {activeStudent.phone ? (
                      <a
                        href={`https://wa.me/${activeStudent.phone.replace(/[^0-9]/g, '').startsWith('0') ? '62' + activeStudent.phone.replace(/[^0-9]/g, '').slice(1) : activeStudent.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                        title="Hubungi langsung via WhatsApp"
                      >
                        <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{activeStudent.phone}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(activeStudent)}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-dashed border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Klik untuk mengisi nomor HP / WhatsApp siswa"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ No. HP/WA</span>
                      </button>
                    )}

                    {/* Blood Type Badge */}
                    {activeStudent.bloodType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-rose-500" />
                        <span>Gol. {activeStudent.bloodType}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <strong>NIK:</strong> {activeStudent.nik}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <strong>Ibu:</strong> {activeStudent.motherName}
                    </span>
                    {activeStudent.guardianName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <strong>Wali:</strong> {activeStudent.guardianName}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{activeStudent.address}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end print:hidden">
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(activeStudent)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Edit data siswa, nomor kamar, nomor telepon/WA, dan informasi lainnya"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWa}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all cursor-pointer"
                  title="Salin ringkasan data portofolio ke clipboard dalam format WhatsApp"
                >
                  {copiedWa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedWa ? 'Tersalin!' : 'Salin WA'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold transition-all cursor-pointer"
                  title="Cetak lembar portofolio resmi"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 overflow-x-auto print:hidden">
              <button
                type="button"
                onClick={() => setDetailTab('biodata')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'biodata'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Biodata & Keluarga</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('medis')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'medis'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300" />
                <span>Rekam Medis & Kontrol ({studentMedicalPlans.length})</span>
                {studentMedicalPlans.filter((p) => p.status === 'rencana').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('catatan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  detailTab === 'catatan'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
                <span>Catatan Wali Asuh ({studentNotes.length})</span>
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Biodata & Keluarga */}
          {detailTab === 'biodata' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Identitas Kependudukan & Asrama
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeStudent)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Nama Lengkap</span>
                    <strong className="text-slate-800 dark:text-slate-100 text-sm">{activeStudent.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Nomor Urut Induk</span>
                    <strong className="text-slate-800 dark:text-slate-100">#{activeStudent.no}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Tingkat / Kelas</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{activeStudent.class}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Jenis Kelamin</span>
                    <strong className="text-slate-800 dark:text-slate-100">{activeStudent.gender}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                    <span className="text-amber-800 dark:text-amber-300 block text-[10.5px] font-bold flex items-center gap-1">
                      <Home className="w-3 h-3 text-amber-600" />
                      <span>Nomor Kamar / Blok</span>
                    </span>
                    <strong className="text-amber-950 dark:text-amber-100 text-sm font-black">
                      {activeStudent.room || (
                        <span className="text-amber-600 dark:text-amber-400 font-normal italic text-xs">
                          Belum diatur (Klik Edit)
                        </span>
                      )}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                    <span className="text-emerald-800 dark:text-emerald-300 block text-[10.5px] font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Nomor HP / WhatsApp</span>
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <strong className="text-emerald-950 dark:text-emerald-100 text-xs font-mono font-bold">
                        {activeStudent.phone || (
                          <span className="text-emerald-600 dark:text-emerald-400 font-normal italic text-xs font-sans">
                            Belum diatur
                          </span>
                        )}
                      </strong>
                      {activeStudent.phone && (
                        <a
                          href={`https://wa.me/${activeStudent.phone.replace(/[^0-9]/g, '').startsWith('0') ? '62' + activeStudent.phone.replace(/[^0-9]/g, '').slice(1) : activeStudent.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold hover:bg-emerald-700 transition-colors"
                          title="Chat WA"
                        >
                          WA
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Golongan Darah</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">
                      {activeStudent.bloodType ? `Tipe ${activeStudent.bloodType}` : '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Usia Saat Ini</span>
                    <strong className="text-indigo-600 dark:text-indigo-400">{calculateAge(activeStudent.birthDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Tempat Lahir</span>
                    <strong className="text-slate-800 dark:text-slate-100">{activeStudent.birthPlace}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Tanggal Lahir</span>
                    <strong className="text-slate-800 dark:text-slate-100">{activeStudent.birthDate}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10.5px]">Status Asrama</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Aktif Mukim (SRT 1 Kediri)</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Data Orang Tua & Domisili Asal
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeStudent)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Nomor Induk Kependudukan (NIK)</span>
                    <strong className="text-slate-800 dark:text-slate-100 font-mono text-sm tracking-wider">
                      {activeStudent.nik}
                    </strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Nama Ibu Kandung</span>
                      <strong className="text-slate-800 dark:text-slate-100 text-sm">
                        {activeStudent.motherName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Nama Ayah / Wali</span>
                      <strong className="text-slate-800 dark:text-slate-100 text-sm">
                        {activeStudent.guardianName || '-'}
                      </strong>
                    </div>
                  </div>
                  {activeStudent.emergencyContact && (
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Kontak Darurat Alternatif</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-mono">
                        {activeStudent.emergencyContact}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Alamat Asal Lengkap</span>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      {activeStudent.address}
                    </p>
                  </div>
                  {activeStudent.notes && (
                    <div>
                      <span className="text-amber-800 dark:text-amber-400 block text-[10.5px] font-bold">
                        Catatan Khusus / Riwayat Alergi:
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                        {activeStudent.notes}
                      </p>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(activeStudent)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ubah Informasi Siswa (Kamar, No HP, Wali, dll)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Rekam Medis & Rencana Kontrol Terintegrasi */}
          {detailTab === 'medis' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Rekam Medis & Rencana Berobat (Klinik / UKS / RS)
                    </h4>
                    <p className="text-[10.5px] text-slate-500">
                      Tersambung langsung dengan database agenda kontrol kesehatan
                    </p>
                  </div>
                </div>

                {onOpenNewMedicalPlanForStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenNewMedicalPlanForStudent(selectedStudent.name, selectedStudent.class)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Jadwalkan Kontrol Siswa Ini</span>
                  </button>
                )}
              </div>

              {studentMedicalPlans.length > 0 ? (
                <div className="space-y-2.5">
                  {studentMedicalPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {plan.destination}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                            plan.status === 'selesai'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : plan.status === 'batal'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                          }`}>
                            {plan.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {plan.purpose}
                        </p>
                        <div className="text-[10.5px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>📅 Tanggal: <strong>{plan.date}</strong></span>
                          <span>•</span>
                          <span>⏰ Pukul: <strong>{plan.time || 'Pagi'}</strong></span>
                          {plan.escortStaff && (
                            <>
                              <span>•</span>
                              <span>Pendamping: <strong>{plan.escortStaff}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('medical')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/60 hover:bg-rose-200 self-start sm:self-center transition-colors cursor-pointer"
                        >
                          Lihat di Rencana Medis &rarr;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Kondisi Sehat / Belum Ada Jadwal Berobat Aktif
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Siswa tidak sedang dalam daftar kontrol rujukan RS/Puskesmas saat ini.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Catatan Wali Asuh & Kedisiplinan */}
          {detailTab === 'catatan' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Catatan Pembinaan & Evaluasi Santri
                    </h4>
                    <p className="text-[10.5px] text-slate-500">
                      Disimpan permanen di cloud dan dapat dipantau seluruh wali asuh
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Catatan</span>
                </button>
              </div>

              {/* Notes List */}
              {studentNotes.length > 0 ? (
                <div className="space-y-2.5">
                  {studentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-1.5 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.2 rounded text-[10px] font-black ${
                            note.category === 'Ibadah'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : note.category === 'Akademik'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : note.category === 'Kedisiplinan'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : note.category === 'Kesehatan'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          }`}>
                            {note.category}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {note.date}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            Dicatat oleh: <strong>{note.authorName}</strong> ({note.authorRole || 'Wali Asuh'})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus catatan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Smile className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Belum Ada Catatan Khusus
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik tombol "Tambah Catatan" di atas untuk menambahkan catatan ibadah, belajar, atau kedisiplinan siswa ini.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Printable Official Card Template (Always formatted for window.print) */}
          <div className="hidden print:block bg-white text-black p-6 space-y-4">
            <div className="text-center border-b-2 border-black pb-3">
              <h2 className="text-lg font-black uppercase tracking-wider">KEMENTERIAN SOSIAL REPUBLIK INDONESIA</h2>
              <h3 className="text-base font-bold">SENTRA TERPADU SRT 1 KABUPATEN KEDIRI</h3>
              <p className="text-xs">LEMBAR REKAM & PORTOFOLIO SISWA ASUH</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><strong>Nama Siswa:</strong> {activeStudent.name}</div>
              <div><strong>Nomor Urut:</strong> #{activeStudent.no}</div>
              <div><strong>Tingkat / Kelas:</strong> {activeStudent.class}</div>
              <div><strong>Jenis Kelamin:</strong> {activeStudent.gender}</div>
              <div><strong>Nomor Kamar:</strong> {activeStudent.room || '-'}</div>
              <div><strong>No. Telp / WhatsApp:</strong> {activeStudent.phone || '-'}</div>
              <div><strong>Golongan Darah:</strong> {activeStudent.bloodType ? `Tipe ${activeStudent.bloodType}` : '-'}</div>
              <div><strong>Tempat, Tgl Lahir:</strong> {activeStudent.birthPlace}, {activeStudent.birthDate}</div>
              <div><strong>Usia:</strong> {calculateAge(activeStudent.birthDate)}</div>
              <div><strong>NIK:</strong> {activeStudent.nik}</div>
              <div><strong>Ibu Kandung:</strong> {activeStudent.motherName}</div>
              <div><strong>Nama Ayah/Wali:</strong> {activeStudent.guardianName || '-'}</div>
              <div><strong>Kontak Darurat:</strong> {activeStudent.emergencyContact || '-'}</div>
              <div className="col-span-2"><strong>Alamat Domisili:</strong> {activeStudent.address}</div>
              {activeStudent.notes && (
                <div className="col-span-2"><strong>Catatan Khusus:</strong> {activeStudent.notes}</div>
              )}
            </div>

            <div className="border-t border-black pt-3">
              <h4 className="font-bold text-xs uppercase mb-1">Rekam Medis & Kontrol Kesehatan:</h4>
              {studentMedicalPlans.length > 0 ? (
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {studentMedicalPlans.map((m) => (
                    <li key={m.id}>{m.date} - {m.destination}: {m.purpose} ({m.status.toUpperCase()})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic">Kondisi sehat / tidak ada jadwal rujukan aktif.</p>
              )}
            </div>

            <div className="border-t border-black pt-3">
              <h4 className="font-bold text-xs uppercase mb-1">Catatan Perkembangan & Pembinaan:</h4>
              {studentNotes.length > 0 ? (
                <ul className="list-disc pl-4 text-xs space-y-1">
                  {studentNotes.map((n) => (
                    <li key={n.id}>[{n.category}] {n.date} - {n.content} (Pencatat: {n.authorName})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs italic">Belum ada catatan khusus.</p>
              )}
            </div>

            <div className="pt-8 flex justify-between text-xs">
              <div className="text-center">
                <p>Mengetahui,</p>
                <p>Kepala Asrama / Koordinator</p>
                <div className="h-14"></div>
                <p className="font-bold underline">( ............................................ )</p>
              </div>
              <div className="text-center">
                <p>Kediri, {new Date().toLocaleDateString('id-ID')}</p>
                <p>Wali Asuh Pendamping,</p>
                <div className="h-14"></div>
                <p className="font-bold underline">( {activeStaff.name} )</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STUDENT DIRECTORY BROWSE VIEW ================= */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Menampilkan <strong>{filteredStudents.length}</strong> siswa
              {activeJenjang !== 'Semua' && ` jenjang ${activeJenjang}`}
              {activeClassFilter !== 'Semua' && ` (Kelas ${activeClassFilter})`}
              {activeGenderFilter !== 'Semua' && ` (${activeGenderFilter})`}:
            </span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Ketik nama di atas untuk pencarian langsung
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredStudents.slice(0, 48).map((student) => {
              const age = calculateAge(student.birthDate);
              return (
                <div
                  key={student.no}
                  onClick={() => handleSelectStudent(student)}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-2.5 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      student.gender === 'Laki-laki'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate flex items-center gap-1.5">
                        <span className="truncate">{student.name}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{student.class}</span>
                        {student.room && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                            🏠 {student.room}
                          </span>
                        )}
                        {student.phone && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                            📞 {student.phone}
                          </span>
                        )}
                        <span>•</span>
                        <span>{age}</span>
                        <span>•</span>
                        <span className="truncate">{student.birthPlace}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              );
            })}
          </div>

          {filteredStudents.length > 48 && (
            <div className="p-3 text-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              Menampilkan 48 dari {filteredStudents.length} siswa. Gunakan kolom pencarian di atas untuk menemukan nama spesifik secara instan.
            </div>
          )}
        </div>
      )}

      {/* Modal Add Note */}
      {showAddNoteModal && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Catatan Pembinaan: {activeStudent.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kategori:
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Ibadah">Ibadah & Sholat</option>
                    <option value="Akademik">Akademik & Belajar</option>
                    <option value="Kedisiplinan">Kedisiplinan & Kamar</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Perilaku">Perilaku & Karakter</option>
                    <option value="Minat Bakat">Minat & Bakat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Catatan:
                  </label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Uraian Catatan Evaluasi / Pembinaan:
                </label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Tuliskan catatan ibadah, kerapihan, sikap, atau perkembangan belajar siswa ini..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-[11px] text-slate-500">
                Pencatat: <strong>{activeStaff.name}</strong> (Wali Asuh Bertugas)
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteContent.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Student Info (Room, Phone, Guardian, Blood Type, etc.) */}
      {showEditModal && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Edit Data Siswa: {activeStudent.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kelas {activeStudent.class} • No. Urut #{activeStudent.no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Room and Phone (High Priority) */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <Home className="w-3.5 h-3.5 text-amber-600" />
                  <span>Informasi Asrama & Kontak Siswa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nomor Kamar / Asrama:
                    </label>
                    <input
                      type="text"
                      value={editForm.room || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, room: e.target.value }))}
                      placeholder="Contoh: Kamar 04 / Blok A"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {/* Quick Room suggestions */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                      {['Kamar 01', 'Kamar 02', 'Kamar 03', 'Kamar 04', 'Kamar 05', 'Kamar 06'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, room: r }))}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nomor HP / WhatsApp Siswa:
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Contoh: 081234567890"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Dapat langsung dihubungi via tombol WA di portofolio.
                    </span>
                  </div>
                </div>
              </div>

              {/* Blood Type & Guardian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Golongan Darah:
                  </label>
                  <select
                    value={editForm.bloodType || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, bloodType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Belum Diketahui --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Ayah / Wali:
                  </label>
                  <input
                    type="text"
                    value={editForm.guardianName || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, guardianName: e.target.value }))}
                    placeholder="Nama ayah kandung / wali asuh"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kontak Darurat Alternatif (Keluarga / Kerabat):
                </label>
                <input
                  type="text"
                  value={editForm.emergencyContact || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Contoh: 08571234567 (Paman - Bpk. Ahmad)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alamat Asal Lengkap:
                </label>
                <textarea
                  rows={2}
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Alamat domisili asal santri / orang tua..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Special Notes / Allergies */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Khusus / Riwayat Alergi / Kebutuhan Khusus:
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: Alergi udang, rutin kontrol asma, kacamata minus 2..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
                <Save className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Perubahan akan disimpan permanen di database dan disinkronkan ke semua wali asuh.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
