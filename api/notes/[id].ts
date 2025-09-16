import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Note ID is required' });
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    switch (req.method) {
      case 'GET': {
        const { data: note, error: fetchError } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          return res.status(404).json({ error: 'Note not found' });
        }

        return res.status(200).json(note);
      }

      case 'PUT': {
        const { title, content } = req.body as { title?: string; content?: string };

        if (!title) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const { data: updatedNote, error: updateError } = await supabase
          .from('notes')
          .update({
            title,
            content: content || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          return res.status(404).json({ error: 'Note not found or access denied' });
        }

        return res.status(200).json(updatedNote);
      }

      case 'DELETE': {
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          return res.status(404).json({ error: 'Note not found or access denied' });
        }

        return res.status(200).json({ message: 'Note deleted successfully' });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
