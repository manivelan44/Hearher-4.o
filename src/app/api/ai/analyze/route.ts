// POST /api/ai/analyze — Gemini complaint analysis
import { NextRequest, NextResponse } from 'next/server';
import { analyzeComplaint } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { description, type } = await req.json();
        if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });

        const analysis = await analyzeComplaint(description, type || 'verbal');
        return NextResponse.json(analysis);
    } catch (error) {
        console.error('[/api/ai/analyze]', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
