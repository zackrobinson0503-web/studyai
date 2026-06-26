import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveItem(userEmail: string, item: {
  search_topic: string;
  title: string;
  url: string;
  source: string;
  type: string;
  thumbnail?: string;
  description?: string;
}) {
  const { error } = await supabase.from('saved_items').insert([{ user_email: userEmail, ...item }]);
  return !error;
}

export async function unsaveItem(userEmail: string, url: string) {
  const { error } = await supabase.from('saved_items').delete().eq('user_email', userEmail).eq('url', url);
  return !error;
}

export async function getSavedItems(userEmail: string) {
  const { data, error } = await supabase.from('saved_items').select('*').eq('user_email', userEmail).order('created_at', { ascending: false });
  return data || [];
}

export async function isItemSaved(userEmail: string, url: string) {
  const { data } = await supabase.from('saved_items').select('id').eq('user_email', userEmail).eq('url', url).single();
  return !!data;
}

export async function logSearch(userEmail: string, query: string) {
  await supabase.from('recent_searches').delete().eq('user_email', userEmail).eq('query', query);
  const { error } = await supabase.from('recent_searches').insert([{ user_email: userEmail, query }]);
  return !error;
}

export async function getRecentSearches(userEmail: string) {
  const { data } = await supabase.from('recent_searches').select('*').eq('user_email', userEmail).order('searched_at', { ascending: false }).limit(5);
  return (data || []).map((r: any) => r.query);
}