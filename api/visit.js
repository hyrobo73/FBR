import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Supabase environment variables are missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase.rpc('record_page_view');
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('No counter data');
    return res.status(200).json({
      today: Number(result.today_count),
      total: Number(result.total_count)
    });
  } catch (error) {
    console.error('Counter failure:', error);
    return res.status(500).json({ error: 'Unable to update counter' });
  }
}
