import { supabase } from '../lib/supabaseClient';

export async function getMonthlyResolution(
  userId: string,
  yearMonth: string,
  teamId?: string | null,
): Promise<string> {
  let query = supabase
    .from('monthly_resolutions')
    .select('content')
    .eq('user_id', userId)
    .eq('year_month', yearMonth);

  query = teamId ? query.eq('team_id', teamId) : query.is('team_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[Monthly] getMonthlyResolution error:', error.message);
    return '';
  }

  return data?.content || '';
}

export async function saveMonthlyResolution(params: {
  userId: string;
  yearMonth: string;
  content: string;
  teamId?: string | null;
}): Promise<boolean> {
  const { userId, yearMonth, content, teamId } = params;

  let selectQuery = supabase
    .from('monthly_resolutions')
    .select('id')
    .eq('user_id', userId)
    .eq('year_month', yearMonth);
  selectQuery = teamId ? selectQuery.eq('team_id', teamId) : selectQuery.is('team_id', null);

  const { data: row, error: selectError } = await selectQuery.maybeSingle();
  if (selectError) {
    console.error('[Monthly] saveMonthlyResolution select error:', selectError.message);
    return false;
  }

  if (row) {
    const { error } = await supabase.from('monthly_resolutions').update({ content }).eq('id', row.id);
    if (error) {
      console.error('[Monthly] saveMonthlyResolution update error:', error.message);
      return false;
    }
    return true;
  }

  const { error } = await supabase.from('monthly_resolutions').insert({
    user_id: userId,
    team_id: teamId ?? null,
    year_month: yearMonth,
    content,
  });
  if (error) {
    console.error('[Monthly] saveMonthlyResolution insert error:', error.message);
    return false;
  }

  return true;
}

export async function getMonthlyRetrospective(
  userId: string,
  yearMonth: string,
  teamId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('monthly_retrospectives')
    .select('content')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('year_month', yearMonth)
    .maybeSingle();

  if (error) {
    console.error('[Monthly] getMonthlyRetrospective error:', error.message);
    return '';
  }

  return data?.content || '';
}

export async function saveMonthlyRetrospective(params: {
  userId: string;
  teamId: string;
  yearMonth: string;
  content: string;
}): Promise<boolean> {
  const { userId, teamId, yearMonth, content } = params;

  const { error } = await supabase.from('monthly_retrospectives').upsert(
    { user_id: userId, team_id: teamId, year_month: yearMonth, content },
    { onConflict: 'user_id, team_id, year_month' },
  );

  if (error) {
    console.error('[Monthly] saveMonthlyRetrospective error:', error.message);
    return false;
  }

  return true;
}
