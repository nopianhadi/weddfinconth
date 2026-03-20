
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function seedProfile() {
    console.log('--- Seeding Default Profile ---');
    
    // Load env
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('.env file not found');
        return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase URL or Key missing in .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile:', fetchError);
        return;
    }

    if (existingProfile) {
        console.log('Profile already exists. Skipping seed.');
        return;
    }

    // Get admin user
    const { data: users, error: userError } = await supabase.from('users').select('id').eq('role', 'Admin').limit(1).maybeSingle();
    
    if (userError) {
        console.error('Error fetching admin user:', userError);
        return;
    }

    const adminUserId = users ? users.id : '11111111-1111-1111-1111-111111111111';

    const defaultProfile = {
        admin_user_id: adminUserId,
        full_name: 'Admin Wedding',
        email: 'admin@dreamywedding.com',
        company_name: 'Dreamy Wedding',
        income_categories: ['DP Acara Pernikahan', 'Pelunasan', 'Tambahan'],
        expense_categories: ['Gaji Tim', 'Sewa Alat', 'Transport', 'Cetak'],
        project_types: ['Pernikahan', 'Engagement', 'Pre-Wedding'],
        event_types: ['Meeting', 'Technical Meeting', 'Bongkar Muat'],
        project_status_config: [
            { id: '1', name: 'Baru', color: '#3b82f6', subStatuses: [], note: '' },
            { id: '2', name: 'Dalam Proses', color: '#f59e0b', subStatuses: [], note: '' },
            { id: '3', name: 'Selesai', color: '#10b981', subStatuses: [], note: '' }
        ],
        notification_settings: { newProject: true, paymentConfirmation: true, deadlineReminder: true },
        security_settings: { twoFactorEnabled: false }
    };

    const { data, error } = await supabase.from('profiles').insert(defaultProfile).select();

    if (error) {
        console.error('Error seeding profile:', error);
    } else {
        console.log('Successfully seeded default profile:', data);
    }
}

seedProfile();
