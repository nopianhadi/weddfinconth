import supabase from '../lib/supabaseClient';

export type WeddingDayChecklistCategory = {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt?: string;
};

const TABLE_NAME = 'wedding_day_checklist_categories';

function normalizeCategory(row: any): WeddingDayChecklistCategory {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function listChecklistCategoriesByProject(projectId: string): Promise<WeddingDayChecklistCategory[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeCategory);
}

export async function createChecklistCategory(projectId: string, name: string, sortOrder: number = 0): Promise<WeddingDayChecklistCategory> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      project_id: projectId,
      name,
      sort_order: sortOrder,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeCategory(data);
}

export async function updateChecklistCategory(
  categoryId: string,
  fields: { name?: string; sortOrder?: number },
): Promise<WeddingDayChecklistCategory> {
  const payload: Record<string, unknown> = {
    ...(fields.name !== undefined ? { name: fields.name } : {}),
    ...(fields.sortOrder !== undefined ? { sort_order: fields.sortOrder } : {}),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeCategory(data);
}

export async function deleteChecklistCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}
