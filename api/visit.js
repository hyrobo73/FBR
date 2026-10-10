
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
        res.setHeader('Allow', 'POST');
        return res.status(405).json({
            error: 'POST 요청만 허용됩니다.'
        });
    }

    const sessionId = req.body?.sessionId;

    // UUID 형식 검증
    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
        typeof sessionId !== 'string' ||
        !uuidPattern.test(sessionId)
    ) {
        return res.status(400).json({
            error: '올바르지 않은 세션 ID입니다.'
        });
    }

    try {
        const { data, error } = await supabase.rpc(
            'record_visitor',
            { p_session_id: sessionId }
        );

        if (error) {
            console.error('Visitor counter error:', error.message);
            return res.status(500).json({
                error: '방문 통계를 불러오지 못했습니다.'
            });
        }

        const result = data?.[0];

        if (!result) {
            return res.status(500).json({
                error: '집계 결과가 없습니다.'
            });
        }

        return res.status(200).json({
            today: Number(result.today_visitors),
            total: Number(result.total_visitors)
        });
    } catch (error) {
        console.error('Visitor API error:', error.message);
        return res.status(500).json({
            error: '서버 오류가 발생했습니다.'
        });
    }
}
