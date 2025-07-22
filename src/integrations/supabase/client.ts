
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = "https://jjecrnjmzjakwblgzqhg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZWNybmptempha3dibGd6cWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNDU5NDMsImV4cCI6MjA2ODcyMTk0M30.avNY3kt1E0fv_jUykL0oQoYNDl0FiJ6G6Qy-ddmOdmc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
