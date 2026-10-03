import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ChevronRight, Smartphone, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // in milliseconds, default 2400ms
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish,
  minDuration = 2400 
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Panda menyiapkan aplikasi...');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    const intervalTime = 30;
    const totalSteps = minDuration / intervalTime;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const currentProgress = Math.min(Math.round((currentStep / totalSteps) * 100), 100);
      setProgress(currentProgress);

      if (currentProgress < 28) {
        setStatusText('🎋 Panda sedang menyiapkan modul piket...');
      } else if (currentProgress < 60) {
        setStatusText('🐼 Memuat rotasi jadwal shif 24 jam...');
      } else if (currentProgress < 88) {
        setStatusText('☁️ Sinkronisasi data Supabase Cloud...');
      } else {
        setStatusText('✨ Sistem siap, selamat bertugas!');
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsCompleted(true);
        try {
          soundManager.playChime();
        } catch {}
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 380);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [minDuration, onFinish]);

  const handleSkip = () => {
    try {
      soundManager.playClick();
    } catch {}
    if (onFinish) onFinish();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[9999] w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none bg-gradient-to-b from-[#f9fbf8] via-[#f1f6ef] to-[#e7f1e4] text-slate-800 flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Background Soft Zen Bamboo Garden Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[380px] h-[380px] rounded-full bg-emerald-400/15 blur-3xl -translate-y-12 animate-pulse" />
        <div className="w-[320px] h-[320px] rounded-full bg-lime-300/15 blur-3xl translate-y-20" />
        
        {/* Subtle Zen Ripple Circles */}
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50%" cy="45%" r="140" stroke="#4a7c59" strokeWidth="1" fill="none" strokeDasharray="4 4" />
          <circle cx="50%" cy="45%" r="200" stroke="#4a7c59" strokeWidth="1" fill="none" opacity="0.6" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 1 FRAME: Top Header (Instansi & Skip Button)                             */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex items-center justify-between shrink-0 pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-emerald-500/25 shadow-2xs backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="text-[10.5px] font-bold tracking-wider text-emerald-900 uppercase">
            Kemensos RI • SRT 1 Kediri
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="px-3 py-1 rounded-full bg-white/90 hover:bg-white active:scale-95 border border-emerald-200 shadow-2xs text-emerald-900 hover:text-emerald-950 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer"
          title="Lewati Splash Screen"
        >
          <span>Lewati</span>
          <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1 FRAME: Center Hero Section (Cute Panda Munching Bamboo + Title)         */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center text-center my-auto min-h-0 py-2 sm:py-4">
        {/* Animated Chibi Panda Eating Bamboo */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 150, damping: 16 }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* Ambient Bamboo Sunburst Glow */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-400/25 via-teal-300/20 to-lime-300/25 blur-2xl opacity-90" />

          {/* Panda Eating Bamboo Character SVG with Gentle Munching Animation */}
          <motion.div
            animate={{ 
              y: [0, -3.5, 0],
              rotate: [0, 0.8, -0.8, 0] 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 2.2, 
              ease: "easeInOut" 
            }}
            className="relative w-36 h-36 sm:w-44 sm:h-44 drop-shadow-xl select-none"
          >
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="pandaBodyFur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#eef2f6" />
                </linearGradient>
                <linearGradient id="pandaBlackFur" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2c3038" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
                <linearGradient id="freshBambooGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="60%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>

              {/* Panda Sitting Bottom Body & Feet */}
              <ellipse cx="100" cy="145" rx="55" ry="38" fill="url(#pandaBodyFur)" />
              {/* Left Back Foot */}
              <circle cx="58" cy="162" r="18" fill="url(#pandaBlackFur)" />
              <ellipse cx="58" cy="164" rx="8" ry="6" fill="#374151" />
              {/* Right Back Foot */}
              <circle cx="142" cy="162" r="18" fill="url(#pandaBlackFur)" />
              <ellipse cx="142" cy="164" rx="8" ry="6" fill="#374151" />

              {/* Left Ear */}
              <circle cx="54" cy="46" r="22" fill="url(#pandaBlackFur)" />
              <circle cx="55" cy="46" r="13" fill="#374151" opacity="0.6" />

              {/* Right Ear with Cute Bamboo Leaf Accent */}
              <circle cx="146" cy="46" r="22" fill="url(#pandaBlackFur)" />
              <circle cx="145" cy="46" r="13" fill="#374151" opacity="0.6" />
              {/* Bamboo Leaf on Right Ear */}
              <path
                d="M 148 24 C 160 12, 174 16, 178 22 C 168 32, 158 34, 148 24 Z"
                fill="url(#freshBambooGrad)"
              />

              {/* Panda Round Chubby Head */}
              <ellipse cx="100" cy="80" rx="58" ry="48" fill="url(#pandaBodyFur)" />

              {/* Soft Pink Blushing Cheeks */}
              <ellipse cx="60" cy="94" rx="11" ry="7" fill="#f472b6" opacity="0.65" />
              <ellipse cx="140" cy="94" rx="11" ry="7" fill="#f472b6" opacity="0.65" />

              {/* Left Black Eye Patch & Big Sparkling Eye */}
              <ellipse cx="74" cy="74" rx="15" ry="19" fill="url(#pandaBlackFur)" transform="rotate(-15 74 74)" />
              <circle cx="75" cy="72" r="6.5" fill="#ffffff" />
              <circle cx="77" cy="70" r="2.8" fill="#111827" />
              <circle cx="73" cy="75" r="2.2" fill="#ffffff" />

              {/* Right Black Eye Patch & Big Sparkling Eye */}
              <ellipse cx="126" cy="74" rx="15" ry="19" fill="url(#pandaBlackFur)" transform="rotate(15 126 74)" />
              <circle cx="125" cy="72" r="6.5" fill="#ffffff" />
              <circle cx="123" cy="70" r="2.8" fill="#111827" />
              <circle cx="127" cy="75" r="2.2" fill="#ffffff" />

              {/* Tiny Cute Black Button Nose */}
              <path
                d="M 94 85 C 94 82, 106 82, 106 85 C 106 90, 94 90, 94 85 Z"
                fill="#1f2937"
              />

              {/* Happy Chewing Mouth with Bamboo Nibble */}
              <motion.g
                animate={{ scaleY: [1, 0.75, 1], scaleX: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                style={{ transformOrigin: "100px 95px" }}
              >
                <path
                  d="M 92 92 C 96 97, 100 95, 100 93 C 100 95, 104 97, 108 92"
                  stroke="#374151"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </motion.g>

              {/* Crunchy Little Chewing Crumb Sparkles */}
              <circle cx="106" cy="98" r="1.5" fill="#84cc16" />
              <circle cx="92" cy="100" r="1.2" fill="#84cc16" />

              {/* Fresh Bamboo Stalk Held Diagonally across mouth */}
              <motion.g
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                style={{ transformOrigin: "100px 115px" }}
              >
                {/* Bamboo Stalk Segment 1 */}
                <rect x="70" y="105" width="60" height="9" rx="2.5" transform="rotate(-24 100 110)" fill="url(#freshBambooGrad)" stroke="#15803d" strokeWidth="1" />
                {/* Bamboo Node Ring */}
                <line x1="92" y1="102" x2="88" y2="114" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />
                {/* Leaves Branching from Bamboo */}
                <path d="M 64 122 C 45 125, 38 115, 35 110 C 48 108, 58 114, 64 122 Z" fill="#84cc16" stroke="#166534" strokeWidth="0.8" />
                <path d="M 60 126 C 45 138, 38 132, 36 128 C 45 122, 54 123, 60 126 Z" fill="#4ade80" stroke="#166534" strokeWidth="0.8" />
                <path d="M 125 94 C 142 85, 155 88, 160 92 C 148 98, 136 98, 125 94 Z" fill="#84cc16" stroke="#166534" strokeWidth="0.8" />
              </motion.g>

              {/* Left Front Paw (Holding Bamboo) */}
              <ellipse cx="80" cy="120" rx="14" ry="11" fill="url(#pandaBlackFur)" />
              <circle cx="75" cy="118" r="2.8" fill="#4b5563" />
              <circle cx="81" cy="115" r="2.8" fill="#4b5563" />
              <circle cx="87" cy="117" r="2.8" fill="#4b5563" />

              {/* Right Front Paw (Holding Bamboo) */}
              <ellipse cx="120" cy="120" rx="14" ry="11" fill="url(#pandaBlackFur)" />
              <circle cx="113" cy="117" r="2.8" fill="#4b5563" />
              <circle cx="119" cy="115" r="2.8" fill="#4b5563" />
              <circle cx="125" cy="118" r="2.8" fill="#4b5563" />
            </svg>
          </motion.div>

          {/* Official Mini Seal Logo Badge beside Panda */}
          <div className="absolute -bottom-2 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-emerald-300 shadow-md backdrop-blur-xs">
            <img 
              src="/logo.svg" 
              alt="Logo Resmi" 
              className="w-4 h-4 object-contain rounded-sm" 
            />
            <span className="text-[9.5px] font-black text-emerald-800">SRT 1 KEDIRI</span>
          </div>
        </motion.div>

        {/* Title & Japanese Themed Identity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 space-y-1"
        >
          {/* Japanese Pill: Chikurin no Seiryo */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-800/10 border border-emerald-600/30 text-emerald-900 text-[11px] font-bold shadow-2xs backdrop-blur-sm">
            <span>🎋</span>
            <span>竹林の癒やし • Selamat Datang</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950 pt-0.5">
            WALI <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">ASUH</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-emerald-800 font-semibold tracking-wide">
            Sistem Jadwal Shif &amp; Pengingat Tugas 24 Jam
          </p>
          <p className="text-[10.5px] text-slate-500 font-medium">
            Sekolah Rakyat Terintegrasi 1 Kabupaten Kediri
          </p>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 1 FRAME: Bottom Section (Bamboo Progress Bar & Android Edition Indicator) */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center pb-2 shrink-0 space-y-2.5"
      >
        {/* Bamboo Themed Loading Bar with Segmented Nodes */}
        <div className="w-full relative bg-emerald-950/15 rounded-full h-3 p-0.5 border border-emerald-600/40 overflow-hidden shadow-inner">
          <motion.div 
            className="h-full rounded-full bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-600 shadow-sm relative overflow-hidden"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.15 }}
          >
            {/* Glossy highlight over bamboo bar */}
            <div className="absolute inset-0 bg-white/25 h-1/2 rounded-full" />
          </motion.div>

          {/* Bamboo Joint Divider Rings */}
          <div className="absolute inset-y-0 left-1/4 w-0.5 bg-emerald-900/30 pointer-events-none" />
          <div className="absolute inset-y-0 left-2/4 w-0.5 bg-emerald-900/30 pointer-events-none" />
          <div className="absolute inset-y-0 left-3/4 w-0.5 bg-emerald-900/30 pointer-events-none" />
        </div>

        {/* Status Line & Percentage */}
        <div className="w-full flex items-center justify-between text-[11px] font-bold text-emerald-900 px-0.5">
          <span className="truncate max-w-[250px] flex items-center gap-1.5 text-left">
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping shrink-0" />
            )}
            <span className="truncate text-emerald-900 font-semibold">{statusText}</span>
          </span>
          <span className="font-mono font-black text-emerald-700 shrink-0 ml-2">{progress}%</span>
        </div>

        {/* Android Edition Footer Badge */}
        <div className="pt-0.5 flex items-center gap-1.5 text-[10px] text-emerald-800 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Android Edition • PWA 1-Frame Ready</span>
          <span className="text-emerald-500">•</span>
          <span>🐾 安心</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
