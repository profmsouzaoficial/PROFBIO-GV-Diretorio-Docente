
import { createClient } from '@supabase/supabase-js';

// Credenciais atualizadas do novo projeto Supabase
const supabaseUrl = 'https://qozfaakllehazptssyhz.supabase.co';
const supabaseAnonKey = 'sb_publishable_4SaJ7DPNXlGkBKhzQehCQg_L_oWDBdl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
