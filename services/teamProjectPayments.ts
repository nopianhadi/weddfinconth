import supabase from '../lib/supabaseClient';
import { TeamProjectPayment } from '../types';

const TABLE = 'team_project_payments';

function toRow(p: TeamProjectPayment) {
  const isUuid = (v?: string) => !!v && /^[0-9a-fA-F-]{36}$/.test(v);
  const row: any = {
    project_id: p.projectId,
    team_member_name: p.teamMemberName,
    team_member_id: p.teamMemberId,
    date: p.date,
    status: p.status,
    fee: p.fee,

  };
  // Only pass id if it's a valid UUID; otherwise let DB generate it
  if (isUuid(p.id as any)) row.id = p.id;
  return row;
}

function fromRow(row: any): TeamProjectPayment {
  return {
    id: row.id,
    projectId: row.project_id,
    teamMemberName: row.team_member_name,
    teamMemberId: row.team_member_id,
    date: row.date,
    status: row.status,
    fee: Number(row.fee || 0),

  };
}

export async function listAllTeamPayments(): Promise<TeamProjectPayment[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function listTeamPaymentsByProject(projectId: string): Promise<TeamProjectPayment[]> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertTeamPaymentsForProject(projectId: string, items: TeamProjectPayment[]): Promise<TeamProjectPayment[]> {
  const incoming = Array.isArray(items) ? items : [];

  const { data: existingData, error: existingErr } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId);
  if (existingErr) throw existingErr;

  const existing = (existingData || []).map(fromRow);
  const existingByMemberId = new Map(existing.map((p) => [p.teamMemberId, p] as const));

  const incomingMemberIds = new Set(incoming.map((p) => p.teamMemberId));

  const merged: TeamProjectPayment[] = incoming.map((p) => {
    const prev = existingByMemberId.get(p.teamMemberId);
    if (!prev) return p;

    const isPaid = prev.status === 'Paid';
    return {
      ...p,
      id: prev.id,
      status: isPaid ? 'Paid' : p.status,
      fee: isPaid ? prev.fee : p.fee,
      date: isPaid ? prev.date : p.date,
      teamMemberName: isPaid ? prev.teamMemberName : p.teamMemberName,
    };
  });

  // Always keep paid history, even if the member is removed from the project later.
  for (const prev of existing) {
    if (prev.status === 'Paid' && !incomingMemberIds.has(prev.teamMemberId)) {
      merged.push(prev);
    }
  }

  // Delete only unpaid rows that are no longer present.
  const toDeleteIds = existing
    .filter((p) => p.status === 'Unpaid' && !incomingMemberIds.has(p.teamMemberId))
    .map((p) => p.id);

  if (toDeleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from(TABLE)
      .delete()
      .eq('project_id', projectId)
      .in('id', toDeleteIds);
    if (delErr) throw delErr;
  }

  if (merged.length === 0) return [];
  const rows = merged.map(toRow);
  const { data, error: upsertErr } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'id' })
    .select();
  if (upsertErr) throw upsertErr;
  return (data || []).map(fromRow);
}

export async function markTeamPaymentStatus(id: string, status: 'Paid' | 'Unpaid'): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateTeamPaymentFee(id: string, fee: number, status: 'Paid' | 'Unpaid'): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ fee, status }).eq('id', id);
  if (error) throw error;
}

export async function deleteTeamPaymentsByProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (error) throw error;
}
