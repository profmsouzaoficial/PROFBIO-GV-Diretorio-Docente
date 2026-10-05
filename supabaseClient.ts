
import { createClient } from '@supabase/supabase-js';

// Credenciais atualizadas do novo projeto Supabase
const supabaseUrl = 'https://zvrrrakybjzelyavrqhc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cnJyYWt5Ymp6ZWx5YXZycWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTU0MDAsImV4cCI6MjA3ODU5MTQwMH0.oS3azBEyyEonDnoeTs-NsIFrToBvGZ0RbfCBgwDEBiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
