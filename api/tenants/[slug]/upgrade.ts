import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;
    
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Tenant slug is required' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Get user profile with tenant info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(`
        role,
        tenant_id,
        tenant:tenants(*)
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Check if user is admin
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if tenant slug matches user's tenant
    if (profile.tenant[0].slug !== slug) {
      return res.status(403).json({ error: 'Cannot upgrade other tenants' });
  }

    // Check if already on Pro plan
    if (profile.tenant[0].subscription_plan === 'pro') {
      return res.status(400).json({ error: 'Tenant is already on Pro plan' });
    }
    
    const { data: updatedTenant, error: upgradeError } = await supabase
      .from('tenants')
      .update({
        subscription_plan: 'pro',
        note_limit: 999999, // Unlimited
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single();

    if (upgradeError) {
      return res.status(500).json({ error: upgradeError.message });
    }

    return res.status(200).json({
      message: 'Tenant upgraded to Pro successfully',
      tenant: updatedTenant,
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}