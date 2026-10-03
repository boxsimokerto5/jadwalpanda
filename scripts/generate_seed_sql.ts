import fs from 'fs';
import { SEPTEMBER_2026_STAFF_LIST, RAW_SEPTEMBER_2026_SCHEDULE } from '../src/data/septemberSchedule.ts';
import { SHIFT_TASKS_TEMPLATE } from '../src/data/initialSchedule.ts';
import { generateSupabaseDataSQL } from '../src/utils/supabaseService.ts';

// Convert RAW_SEPTEMBER_2026_SCHEDULE into days mapping
const days = {};
for (let d = 1; d <= 30; d++) {
  days[d] = {};
  for (const st of SEPTEMBER_2026_STAFF_LIST) {
    const rawArr = RAW_SEPTEMBER_2026_SCHEDULE[st.id];
    if (rawArr && rawArr[d - 1]) {
      days[d][st.id] = rawArr[d - 1];
    }
  }
}

const schedule = {
  year: 2026,
  month: 9,
  monthName: 'September 2026',
  totalDays: 30,
  staffList: SEPTEMBER_2026_STAFF_LIST,
  days,
};

const sql = generateSupabaseDataSQL(schedule, SEPTEMBER_2026_STAFF_LIST, [], [], SHIFT_TASKS_TEMPLATE);
fs.writeFileSync('supabase_seed_data.sql', sql, 'utf-8');
console.log('Generated supabase_seed_data.sql successfully! Length:', sql.length);
