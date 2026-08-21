// src/lib/supabaseClient.js
//
// Inicjalizacja klienta Supabase dla projektu React + Vite.
//
// 1) Zainstaluj pakiet:
//      npm install @supabase/supabase-js
//
// 2) Utwórz plik .env (w katalogu głównym projektu, obok package.json)
//    i dodaj do niego (wartości znajdziesz w Supabase Dashboard →
//    Project Settings → API):
//
//      VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
//      VITE_SUPABASE_ANON_KEY=twoj-anon-public-key
//
//    Nie commituj .env do repozytorium — dodaj go do .gitignore.
//    Na Netlify te same zmienne ustawiasz w:
//      Site settings → Build & deploy → Environment → Environment variables

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // eslint-disable-next-line no-console
    console.error(
        'Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Sprawdź plik .env.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});
