import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqeumddelbltxpxkebwd.supabase.co';
const supabaseAnonKey = 'sb_publishable_EBlBsQzGb2rksw56SnIXKw_X0V3keXY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
