
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const { pageId, sessionId } = req.body || {};

  const validPage =
    typeof pageId === 'string' &&
    /^[a-z0-9_-]{1,100}$/.test(pageId);

  const validSession =
    typeof sessionId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f-]{27,28}$/i.test(sessionId);

  if (!validPage || !validSession) {
    return res.status(400).json({
      error: 'Invalid request'
    });
  }

  try {
    const { data, error } = await supabase.rpc(
      'record_page_session',
      {
        p_page_id: pageId,
        p_session_id: sessionId
      }
    );

    if (error) throw error;

    return res.status(200).json({
      today: Number(data[0].today_visitors),
      total: Number(data[0].total_visitors)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: '방문객 집계 실패'
    });
  }
}
