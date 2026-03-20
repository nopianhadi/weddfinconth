import supabase from '../lib/supabaseClient';
import { Profile, ProjectStatusConfig } from '../types';

const TABLE = 'profiles';

function asJsonObject<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return null;
}

function fromRow(row: any): Profile {
  return {
    id: row.id,
    adminUserId: row.admin_user_id || '',
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    companyName: row.company_name || '',
    website: row.website || '',
    address: row.address || '',
    bankAccount: row.bank_account || '',
    authorizedSigner: row.authorized_signer || '',
    idNumber: row.id_number || undefined,
    bio: row.bio || '',
    incomeCategories: row.income_categories || [],
    expenseCategories: row.expense_categories || [],
    projectTypes: row.project_types || [],
    eventTypes: row.event_types || [],
    assetCategories: row.asset_categories || [],
    sopCategories: row.sop_categories || [],
    packageCategories: row.package_categories || [],
    projectStatusConfig: (row.project_status_config || []) as ProjectStatusConfig[],
    notificationSettings: row.notification_settings && typeof row.notification_settings === 'object'
      ? { newProject: !!row.notification_settings.newProject, paymentConfirmation: !!row.notification_settings.paymentConfirmation, deadlineReminder: !!row.notification_settings.deadlineReminder }
      : { newProject: true, paymentConfirmation: true, deadlineReminder: true },
    securitySettings: row.security_settings && typeof row.security_settings === 'object'
      ? { twoFactorEnabled: !!row.security_settings.twoFactorEnabled }
      : { twoFactorEnabled: false },
    briefingTemplate: row.briefing_template || '',
    termsAndConditions: row.terms_and_conditions || undefined,
    logoBase64: row.logo_base64 || undefined,
    signatureBase64: row.signature_base64 || undefined,
    brandColor: row.brand_color || undefined,
    publicPageConfig: row.public_page_config ? {
      template: row.public_page_config.template || 'classic',
      title: row.public_page_config.title || 'Vena Pictures',
      introduction: row.public_page_config.introduction || '',
      galleryImages: row.public_page_config.galleryImages || [],
    } : {
      template: (row.public_page_template || 'classic') as any,
      title: row.public_page_title || 'Vena Pictures',
      introduction: row.public_page_introduction || '',
      galleryImages: [],
    },
    packageShareTemplate: row.package_share_template || undefined,
    bookingFormTemplate: row.booking_form_template || undefined,
    // Prefer dedicated column; else, fallback to booking_form_template JSON envelope { chatTemplates: [...] }
    chatTemplates: row.chat_templates || (asJsonObject(row.booking_form_template)?.chatTemplates ?? []),
    billingTemplates: asJsonObject(row.booking_form_template)?.billingTemplates ?? undefined,
    invoiceShareTemplate: asJsonObject(row.booking_form_template)?.invoiceShareTemplate ?? undefined,
    receiptShareTemplate: asJsonObject(row.booking_form_template)?.receiptShareTemplate ?? undefined,
    expenseShareTemplate: asJsonObject(row.booking_form_template)?.expenseShareTemplate ?? undefined,
    portalShareTemplate: asJsonObject(row.booking_form_template)?.portalShareTemplate ?? undefined,
    checklistTemplates: asJsonObject(row.booking_form_template)?.checklistTemplates ?? undefined,
  } as Profile;
}

function toRow(p: Partial<Profile>): any {
  return {
    ...(p.adminUserId !== undefined ? { admin_user_id: p.adminUserId } : {}),
    ...(p.fullName !== undefined ? { full_name: p.fullName } : {}),
    ...(p.email !== undefined ? { email: p.email } : {}),
    ...(p.phone !== undefined ? { phone: p.phone } : {}),
    ...(p.companyName !== undefined ? { company_name: p.companyName } : {}),
    ...(p.website !== undefined ? { website: p.website } : {}),
    ...(p.address !== undefined ? { address: p.address } : {}),
    ...(p.bankAccount !== undefined ? { bank_account: p.bankAccount } : {}),
    ...(p.authorizedSigner !== undefined ? { authorized_signer: p.authorizedSigner } : {}),
    ...(p.idNumber !== undefined ? { id_number: p.idNumber } : {}),
    ...(p.bio !== undefined ? { bio: p.bio } : {}),
    ...(p.incomeCategories !== undefined ? { income_categories: p.incomeCategories } : {}),
    ...(p.expenseCategories !== undefined ? { expense_categories: p.expenseCategories } : {}),
    ...(p.projectTypes !== undefined ? { project_types: p.projectTypes } : {}),
    ...(p.eventTypes !== undefined ? { event_types: p.eventTypes } : {}),
    ...(p.assetCategories !== undefined ? { asset_categories: p.assetCategories } : {}),
    ...(p.sopCategories !== undefined ? { sop_categories: p.sopCategories } : {}),
    ...(p.packageCategories !== undefined ? { package_categories: p.packageCategories } : {}),
    ...(p.termsAndConditions !== undefined ? { terms_and_conditions: p.termsAndConditions } : {}),
    ...(p.logoBase64 !== undefined ? { logo_base64: p.logoBase64 } : {}),
    ...(p.signatureBase64 !== undefined ? { signature_base64: p.signatureBase64 } : {}),
    ...(p.brandColor !== undefined ? { brand_color: p.brandColor } : {}),
    ...(p.publicPageConfig !== undefined ? {
      // Only write to JSONB column that actually exists in the current schema
      public_page_config: p.publicPageConfig,
    } : {}),
    ...(p.projectStatusConfig !== undefined ? { project_status_config: p.projectStatusConfig } : {}),
    ...(p.packageShareTemplate !== undefined ? { package_share_template: p.packageShareTemplate } : {}),
    ...(p.bookingFormTemplate !== undefined ? { booking_form_template: p.bookingFormTemplate } : {}),
    ...(p.briefingTemplate !== undefined ? { briefing_template: p.briefingTemplate } : {}),
    ...(p.notificationSettings !== undefined ? { notification_settings: p.notificationSettings } : {}),
    ...(p.securitySettings !== undefined ? { security_settings: p.securitySettings } : {}),
    ...(p.chatTemplates !== undefined ? { chat_templates: p.chatTemplates } : {}),
  };
}

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? fromRow(data) : null;
}

export async function upsertProfile(input: Partial<Profile> & { id?: string }): Promise<Profile> {
  // Declare payload variable at function scope
  let bookingFormTemplatePayload: string | undefined = undefined;

  // If any of the templates are provided, merge into booking_form_template JSON envelope
  if (
    input.chatTemplates !== undefined ||
    input.billingTemplates !== undefined ||
    input.invoiceShareTemplate !== undefined ||
    input.receiptShareTemplate !== undefined ||
    input.expenseShareTemplate !== undefined ||
    input.portalShareTemplate !== undefined ||
    input.checklistTemplates !== undefined
  ) {
    let existingEnvelope: any = {};
    if (input.id) {
      const { data: current } = await supabase.from(TABLE).select('booking_form_template').eq('id', input.id).maybeSingle();
      const parsed = asJsonObject(current?.booking_form_template);
      if (parsed && typeof parsed === 'object') {
        existingEnvelope = parsed;
      } else if (typeof current?.booking_form_template === 'string' && current.booking_form_template) {
        existingEnvelope = { bookingFormTemplate: current.booking_form_template };
      }
    }
    const merged: any = { ...existingEnvelope };
    if (input.chatTemplates !== undefined) merged.chatTemplates = input.chatTemplates;
    if (input.billingTemplates !== undefined) merged.billingTemplates = input.billingTemplates;
    if (input.invoiceShareTemplate !== undefined) merged.invoiceShareTemplate = input.invoiceShareTemplate;
    if (input.receiptShareTemplate !== undefined) merged.receiptShareTemplate = input.receiptShareTemplate;
    if (input.expenseShareTemplate !== undefined) merged.expenseShareTemplate = input.expenseShareTemplate;
    if (input.portalShareTemplate !== undefined) merged.portalShareTemplate = input.portalShareTemplate;
    if (input.checklistTemplates !== undefined) merged.checklistTemplates = input.checklistTemplates;
    
    bookingFormTemplatePayload = JSON.stringify(merged);
  }

  const row = toRow({ 
    ...input, 
    bookingFormTemplate: bookingFormTemplatePayload ?? input.bookingFormTemplate, 
  } as any);
  if (input.id) {
    const { error } = await supabase.from(TABLE).update(row).eq('id', input.id);
    if (error) throw error;
    const { data, error: err2 } = await supabase.from(TABLE).select('*').eq('id', input.id).single();
    if (err2) throw err2;
    return fromRow(data);
  } else {
    const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
    if (error) throw error;
    return fromRow(data);
  }
}
