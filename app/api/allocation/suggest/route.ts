import { NextRequest, NextResponse } from 'next/server';
import { computeAllocations } from '@/lib/allocation';

export async function POST(req: NextRequest) {
  try {
    const { funds, income, accruedInterest, allocationHistory } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const allocations = computeAllocations(funds, Number(income), 0);
    const amountToAllocate = Number(income) || 0;

    if (amountToAllocate <= 0 || allocations.length === 0) {
      return NextResponse.json({ suggestions: [], summary: 'Không có tiền để phân bổ.' });
    }

    if (!apiKey) {
      return NextResponse.json({
        suggestions: allocations.map((a) => ({ fundName: a.fundName, amount: a.amount, reason: 'Phân bổ theo logic.' })),
        summary: 'Phân bổ tĩnh (Thiếu API Key AI)',
      });
    }

    const fmt = (n: number) => Math.round(n).toString();
    const allocationLines = allocations.map((a) => `- ${a.fundName}: +${fmt(a.amount)} VND`).join('\n');
    const prompt = `Bạn là trợ lý tài chính báo cáo kết quả:
Số tiền: ${fmt(amountToAllocate)}
KẾT QUẢ:
${allocationLines}
TRẢ VỀ JSON: { "suggestions": [ { "fundName": "...", "amount": <number>, "reason": "1 câu ngắn" } ], "summary": "1 câu tổng kết" }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const aiResult = JSON.parse(content);

    return NextResponse.json({
      suggestions: allocations.map((a) => ({
        fundName: a.fundName,
        amount: a.amount,
        reason: aiResult.suggestions?.find((s: any) => s.fundName === a.fundName)?.reason || '',
      })),
      summary: aiResult.summary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
