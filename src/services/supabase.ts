/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid and present
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key-here'
);

// Safe initialization
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.log(
    'ℹ️ Supabase não está configurado ou está usando valores padrão. O sistema está operando no modo de banco de dados offline (persistido em LocalStorage) com dados simulados pré-carregados. Para conectar ao Supabase, configure as variáveis no arquivo .env ou nas configurações do AI Studio.'
  );
}
