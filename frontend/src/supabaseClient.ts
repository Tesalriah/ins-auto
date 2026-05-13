import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wqmyuoyvqhnmhxkhvyff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxbXl1b3l2cWhubWh4a2h2eWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTU5NzUsImV4cCI6MjA5NDIzMTk3NX0.dqQtEPQIag2Fnh4vLUQhtG3b1zGTSf_kUpjoezVi7Ec';

export const supabase = createClient(supabaseUrl, supabaseKey);
