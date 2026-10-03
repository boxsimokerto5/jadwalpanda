import { DailyTask, MonthSchedule, ShiftCode, Staff } from '../types';
import { SHIFT_DEFINITIONS, SHIFT_TASKS_TEMPLATE } from '../data/initialSchedule';
import { INDONESIAN_DAY_NAMES, INDONESIAN_MONTH_NAMES } from './scheduler';

export interface IcsExportOptions {
  includeShiftEvents: boolean;
  includeDailyTasks: boolean;
  alarmOffsetMinutes: number; // e.g. 15 for 15 mins before
  scope: 'active_day' | 'full_month' | 'upcoming_7_days';
  targetDay?: number;
}

/**
 * Escapes characters for iCalendar text values (RFC 5545)
 */
function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats a Date object to YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Parses "HH:mm" time string into a Date object on a given year, month (1-12), and day
 */
function createDateFromTimeString(year: number, month: number, day: number, timeStr: string): Date {
  const [hStr, mStr] = timeStr.split(':');
  const hours = parseInt(hStr || '0', 10);
  const minutes = parseInt(mStr || '0', 10);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Finds relevant daily tasks for a given shift code
 */
export function getTasksForShift(shiftCode: ShiftCode, allTasks: DailyTask[]): DailyTask[] {
  if (['OFF', 'O', 'L', 'CUTI', 'LP', 'IZIN', 'SAKIT'].includes(shiftCode)) {
    return [];
  }

  const hasSpecificTasks = allTasks.some((t) => t.shiftCode === shiftCode);
  return allTasks.filter((t) => {
    if (hasSpecificTasks) {
      return t.shiftCode === shiftCode;
    }
    if (shiftCode === 'P1' || shiftCode === 'P2' || shiftCode === 'P3') {
      return t.shiftCode === shiftCode || t.shiftCode === 'P';
    }
    if (['S2A', 'S3A', 'S4A'].includes(shiftCode)) {
      return t.shiftCode === shiftCode || t.shiftCode === 'S';
    }
    if (shiftCode === 'M1' || shiftCode === 'M2') {
      return t.shiftCode === shiftCode || t.shiftCode === 'M';
    }
    return t.shiftCode === shiftCode;
  });
}

/**
 * Generates an RFC 5545 compliant .ics string for daily tasks and/or shift schedules
 */
export function generateIcsCalendar(
  staff: Staff,
  schedule: MonthSchedule,
  tasksSource: DailyTask[],
  options: IcsExportOptions
): string {
  const tasks = tasksSource && tasksSource.length > 0 ? tasksSource : SHIFT_TASKS_TEMPLATE;
  const now = new Date();
  const dtstamp = formatIcsDateTime(now);

  const monthName = schedule.monthName || INDONESIAN_MONTH_NAMES[schedule.month - 1] || `Bulan ${schedule.month}`;
  const calTitle = `Tugas Wali Asuh - ${staff.name} (${monthName} ${schedule.year})`;

  // Determine which days to include based on scope
  let daysToExport: number[] = [];
  if (options.scope === 'active_day') {
    const day = options.targetDay || 1;
    daysToExport = [Math.min(Math.max(1, day), schedule.totalDays)];
  } else if (options.scope === 'upcoming_7_days') {
    const startDay = options.targetDay || 1;
    for (let i = 0; i < 7; i++) {
      let d = startDay + i;
      if (d <= schedule.totalDays) {
        daysToExport.push(d);
      }
    }
  } else {
    // Full month
    daysToExport = Array.from({ length: schedule.totalDays }, (_, i) => i + 1);
  }

  const events: string[] = [];

  for (const day of daysToExport) {
    const shift = schedule.days[day]?.[staff.id] || 'O';
    const shiftMeta = SHIFT_DEFINITIONS[shift] || SHIFT_DEFINITIONS['O'];

    // Skip OFF / non-duty days if there is no shift assignment
    const isOff = ['OFF', 'O', 'L', 'CUTI', 'LP'].includes(shift);

    // 1. Shift master event
    if (options.includeShiftEvents && !isOff && shiftMeta.startTime && shiftMeta.endTime) {
      const shiftStartDate = createDateFromTimeString(schedule.year, schedule.month, day, shiftMeta.startTime);
      let shiftEndDate = createDateFromTimeString(schedule.year, schedule.month, day, shiftMeta.endTime);

      // If end time is before start time (night shift spanning past midnight, e.g. 23:00 - 07:00)
      if (shiftEndDate <= shiftStartDate) {
        shiftEndDate = new Date(shiftEndDate.getTime() + 24 * 60 * 60 * 1000);
      }

      const uid = `shift-${schedule.year}${String(schedule.month).padStart(2, '0')}${String(day).padStart(2, '0')}-${staff.id}@wali-asuh.kemensos`;
      const dateObj = new Date(schedule.year, schedule.month - 1, day);
      const dayName = INDONESIAN_DAY_NAMES[dateObj.getDay()];

      const shiftSummary = `🛡️ Shif ${shiftMeta.name} (${shift}) - ${staff.name}`;
      const shiftDesc = [
        `Jadwal Piket Wali Asuh Sentra Terpadu (SRT 1 Kab. Kediri)`,
        `Petugas: ${staff.name} (${staff.group || 'Wali Asuh'})`,
        `Hari / Tanggal: ${dayName}, ${day} ${monthName} ${schedule.year}`,
        `Waktu Shif: ${shiftMeta.startTime} - ${shiftMeta.endTime} WIB (${shiftMeta.hours} Jam)`,
        `Keterangan: ${shiftMeta.description}`,
      ].join('\n');

      const alarmMinutes = 60; // 1 hour reminder before shift begins
      const shiftEvent = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}Z`,
        `DTSTART;TZID=Asia/Jakarta:${formatIcsDateTime(shiftStartDate)}`,
        `DTEND;TZID=Asia/Jakarta:${formatIcsDateTime(shiftEndDate)}`,
        `SUMMARY:${escapeIcsText(shiftSummary)}`,
        `DESCRIPTION:${escapeIcsText(shiftDesc)}`,
        `LOCATION:${escapeIcsText('Sentra Terpadu SRT 1 Kab. Kediri')}`,
        'STATUS:CONFIRMED',
        'CATEGORIES:Jadwal Shif,Wali Asuh',
        'BEGIN:VALARM',
        `TRIGGER:-PT${alarmMinutes}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(`Persiapan Shif: ${shiftMeta.name} dimulai pukul ${shiftMeta.startTime} WIB`)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');

      events.push(shiftEvent);
    }

    // 2. Daily SOP tasks for this day's shift
    if (options.includeDailyTasks && !isOff) {
      const relevantTasks = getTasksForShift(shift, tasks);

      for (const task of relevantTasks) {
        if (!task.time) continue;

        const taskStartDate = createDateFromTimeString(schedule.year, schedule.month, day, task.time);
        // Default task duration is 30 minutes
        const taskEndDate = new Date(taskStartDate.getTime() + 30 * 60 * 1000);

        const uid = `task-${schedule.year}${String(schedule.month).padStart(2, '0')}${String(day).padStart(2, '0')}-${task.id}-${staff.id}@wali-asuh.kemensos`;
        
        const priorityEmoji = task.priority === 'krusial' ? '🚨 [WAJIB]' : task.priority === 'penting' ? '⭐ [PENTING]' : '📋';
        const taskSummary = `${priorityEmoji} ${task.title} (${task.time} WIB - Shif ${shift})`;

        const taskDesc = [
          `TUGAS HARIAN WALI ASUH (SOP)`,
          `Judul: ${task.title}`,
          `Pukul: ${task.time} WIB`,
          `Shif Aktif: ${shiftMeta.name} (${shift})`,
          `Kategori: ${task.category.toUpperCase()}`,
          `Prioritas: ${task.priority.toUpperCase()}`,
          `Petugas: ${staff.name}`,
          `\nInstruksi Kerja:`,
          `${task.description}`,
          `\nLokasi: SRT 1 Kab. Kediri`,
        ].join('\n');

        const alarmMinutes = options.alarmOffsetMinutes || 15;
        const taskEvent = [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}Z`,
          `DTSTART;TZID=Asia/Jakarta:${formatIcsDateTime(taskStartDate)}`,
          `DTEND;TZID=Asia/Jakarta:${formatIcsDateTime(taskEndDate)}`,
          `SUMMARY:${escapeIcsText(taskSummary)}`,
          `DESCRIPTION:${escapeIcsText(taskDesc)}`,
          `LOCATION:${escapeIcsText('Asrama Siswa SRT 1 Kab. Kediri')}`,
          'STATUS:CONFIRMED',
          `CATEGORIES:Tugas Harian,${task.category},Wali Asuh`,
          'BEGIN:VALARM',
          `TRIGGER:-PT${alarmMinutes}M`,
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeIcsText(`Pengingat Tugas: ${task.title} (${task.time} WIB)`)}`,
          'END:VALARM',
        ];

        // For crucial tasks, add an extra reminder at the exact start time
        if (task.priority === 'krusial' && alarmMinutes > 0) {
          taskEvent.push(
            'BEGIN:VALARM',
            'TRIGGER:-PT0M',
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeIcsText(`WAKTU TUGAS: ${task.title} (Laksanakan sekarang)`)}`,
            'END:VALARM'
          );
        }

        taskEvent.push('END:VEVENT');
        events.push(taskEvent.join('\r\n'));
      }
    }
  }

  // Complete VCALENDAR structure
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sistem Jadwal Shif Wali Asuh SRT 1//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calTitle)}`,
    'X-WR-TIMEZONE:Asia/Jakarta',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Jakarta',
    'X-LIC-LOCATION:Asia/Jakarta',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:WIB',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Triggers a browser download of an .ics file
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
