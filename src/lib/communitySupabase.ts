import { createClient } from '@supabase/supabase-js';

const COMMUNITY_SUPABASE_URL = 'https://gtkitrxssdkncjpwzvjl.supabase.co';
const COMMUNITY_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0a2l0cnhzc2RrbmNqcHd6dmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTY0MDQsImV4cCI6MjExMDE3MjQwNH0.j-w8V7V7br8jcigfjKfPDcRAiGc2i5VA-9jiHPFcFko';

export const PENDING_REPORT_GAME_KEY = 'droidport_pending_report_game_v1';

export const communitySupabase = createClient(
  COMMUNITY_SUPABASE_URL,
  COMMUNITY_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'droidport_community_supabase_auth_v1',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
