import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Users, 
  HeartPulse, 
  DoorOpen,
  Moon
} from 'lucide-react';
import { Student } from '../types';
import { 
  ALL_STUDENTS_DATA, 
  TOTAL_STUDENTS_COUNT, 
  SD_STUDENTS_COUNT, 
  SMP_STUDENTS_COUNT, 
  SMA_STUDENTS_COUNT 
} from '../data/studentsData';

interface StudentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (student: Student) => void;
  mode?: 'sick' | 'permit' | 'fasting';
  title?: string;
}

export const StudentPickerModal: React.FC<StudentPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
  mode = 'sick',
  title,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'SD' | 'SMP' | 'SMA'>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'Laki-laki' | 'Perempuan'>('ALL');

  const filteredStudents = useMemo(() => {
    let list = ALL_STUDENTS_DATA;

    // Filter by Level
    if (selectedLevel === 'SD') {
      list = list.filter(s => s.class.startsWith('SD'));
    } else if (selectedLevel === 'SMP') {
      list = list.filter(s => s.class.startsWith('VII'));
    } else if (selectedLevel === 'SMA') {
      list = list.filter(s => s.class.startsWith('X') || s.class.startsWith('XI'));
    }

    // Filter by Gender
    if (selectedGender !== 'ALL') {
      list = list.filter(s => s.gender === selectedGender);
    }

    // Search keyword
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.class.toLowerCase().includes(q) ||
          s.nik.includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.motherName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchTerm, selectedLevel, selectedGender]);

  if (!isOpen) return null;

  const handleSelect = (student: Student) => {
    onSelectStudent(student);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          mode === 'sick' 
            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50' 
            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === 'sick' ? 'bg-rose-600 text-white' : mode === 'fasting' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {mode === 'sick' ? <HeartPulse className="w-5 h-5" /> : mode === 'fasting' ? <Moon className="w-5 h-5" /> : <DoorOpen className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {title || `Pilih Anak Asuh (${TOTAL_STUDENTS_COUNT} Siswa)`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih dari database resmi {TOTAL_STUDENTS_COUNT} Siswa SRT 1 Kabupaten Kediri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama anak asuh, kelas, NIK, atau asal desa/kecamatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Level tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {(['ALL', 'SD', 'SMP', 'SMA'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                    selectedLevel === lvl
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {lvl === 'ALL' ? `Semua (${TOTAL_STUDENTS_COUNT})` : lvl === 'SD' ? `SD (${SD_STUDENTS_COUNT})` : lvl === 'SMP' ? `SMP (${SMP_STUDENTS_COUNT})` : `SMA (${SMA_STUDENTS_COUNT})`}
                </button>
              ))}
            </div>

            {/* Gender filter */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400 mr-1 hidden sm:inline">Gender:</span>
              <button
                type="button"
                onClick={() => setSelectedGender('ALL')}
                className={`px-2 py-0.5 rounded ${selectedGender === 'ALL' ? 'bg-slate-200 dark:bg-slate-700 font-bold text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('Laki-laki')}
                className={`px-2 py-0.5 rounded ${selectedGender === 'Laki-laki' ? 'bg-blue-100 dark:bg-blue-950 font-bold text-blue-800 dark:text-blue-300' : 'text-slate-500'}`}
              >
                👦 Laki-laki
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('Perempuan')}
                className={`px-2 py-0.5 rounded ${selectedGender === 'Perempuan' ? 'bg-pink-100 dark:bg-pink-950 font-bold text-pink-800 dark:text-pink-300' : 'text-slate-500'}`}
              >
                👧 Perempuan
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[50vh]">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">Tidak ada data anak asuh yang cocok</p>
              <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter jenjang/kelas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredStudents.map((student) => {
                const isSD = student.class.startsWith('SD');
                const isSMP = student.class.startsWith('VII');
                const badgeColor = isSD 
                  ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300' 
                  : isSMP 
                    ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300';

                return (
                  <div
                    key={student.no}
                    onClick={() => handleSelect(student)}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 cursor-pointer transition-all hover:shadow-sm flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          #{student.no}
                        </span>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {student.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{student.gender === 'Laki-laki' ? '👦 Putra' : '👧 Putri'}</span>
                            <span>•</span>
                            <span>Ibu: {student.motherName}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeColor}`}>
                        {student.class}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[200px]" title={student.address}>
                        📍 {student.address}
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        + Pilih Siswa
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> dari {TOTAL_STUDENTS_COUNT} Anak Asuh</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
