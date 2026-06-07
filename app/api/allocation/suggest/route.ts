import { NextRequest, NextResponse } from 'next/server';
import { computeAllocations, type RefinedFund } from '@/lib/allocation';
import { checkOrigin, errorResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const forbidden = checkOrigin(req);
  if (forbidden) return forbidden;
  try {
    const { funds, investments, savings, gold, income, accruedInterest, allocationHistory } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const amountToAllocate = Number(income) || 0;

    if (amountToAllocate <= 0) {
      return NextResponse.json({ suggestions: [], summary: 'Không có tiền để phân bổ.' });
    }

    // Compute derived fields from raw Fund data
    const today = new Date();
    const totalAssets = (investments || 0) + (savings || 0) + (gold || 0) +
      funds.reduce((acc: number, f: any) => acc + (f.currentBalance || 0), 0) +
      (accruedInterest || 0);

    const refinedFunds: RefinedFund[] = funds.map((f: any) => {
      const gap = Math.max(0, (f.goalAmount || 0) - (f.currentBalance || 0));
      const daysRemaining = f.targetDate
        ? Math.ceil((new Date(f.targetDate).getTime() - today.getTime()) / (1000 * 3600 * 24))
        : null;
      return {
        ...f,
        gap,
        daysRemaining,
        spentThisMonth: 0,
        remainingMonthlyQuota: f.monthlyTarget ?? null,
      };
    });

    const allocations = computeAllocations(refinedFunds, amountToAllocate, totalAssets);

    if (allocations.length === 0) {
      return NextResponse.json({ suggestions: [], summary: 'Không có quỹ nào cần phân bổ.' });
    }

    if (!apiKey) {
      return NextResponse.json({
        suggestions: allocations.map((a) => ({ fundName: a.fundName, amount: a.amount, reason: 'Phân bổ theo logic.' })),
        summary: 'Phân bổ tĩnh (Thiếu API Key AI)',
      });
    }

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
    const pct = (n: number, total: number) => total > 0 ? Math.round(n / total * 100) : 0;

    // Build fund context for AI
    const fundContext = refinedFunds.map(f => {
      const completionPct = f.goalAmount ? pct(f.currentBalance, f.goalAmount) : null;
      const monthsToGoal = f.gap > 0 && f.monthlyTarget ? Math.ceil(f.gap / f.monthlyTarget) : null;
      const parts = [
        `- ${f.fundName} (${f.type}):`,
        `  Số dư: ${fmt(f.currentBalance)} VND`,
        f.goalAmount ? `  Mục tiêu: ${fmt(f.goalAmount)} VND (đạt ${completionPct}%, còn thiếu ${fmt(f.gap)} VND)` : null,
        f.daysRemaining !== null ? `  Deadline: ${f.daysRemaining > 0 ? `còn ${f.daysRemaining} ngày` : 'đã quá hạn'}` : null,
        monthsToGoal ? `  Dự kiến đạt mục tiêu: ~${monthsToGoal} tháng nữa (theo chỉ tiêu tháng)` : null,
      ].filter(Boolean);
      return parts.join('\n');
    }).join('\n');

    // Build allocation history context (last 3 months)
    const recentHistory = Array.isArray(allocationHistory)
      ? allocationHistory.slice(0, 3).map((r: any) => `  ${r.month}: ${fmt(r.totalAmount)} VND`).join('\n')
      : '';

    const allocationLines = allocations.map(a => `- ${a.fundName}: +${fmt(a.amount)} VND`).join('\n');

    const prompt = `Bạn là trợ lý tài chính cá nhân. Dưới đây là tình hình tài chính của người dùng.

TỔNG TÀI SẢN: ${fmt(totalAssets)} VND
- Đầu tư chứng khoán: ${fmt(investments || 0)} VND
- Tiết kiệm ngân hàng: ${fmt(savings || 0)} VND (lãi dự thu: ${fmt(accruedInterest || 0)} VND)
- Vàng: ${fmt(gold || 0)} VND

TÌNH TRẠNG CÁC QUỸ:
${fundContext}

LỊCH SỬ PHÂN BỔ GẦN ĐÂY:
${recentHistory || '  Chưa có lịch sử'}

KẾT QUẢ PHÂN BỔ THÁNG NÀY (${fmt(amountToAllocate)} VND):
${allocationLines}

Hãy viết nhận xét ngắn gọn cho mỗi phần phân bổ (1 câu, tập trung vào tiến độ mục tiêu hoặc mức độ cấp thiết) và 1 câu tổng kết tình hình.

TRẢ VỀ JSON: { "suggestions": [ { "fundName": "...", "reason": "1 câu" } ], "summary": "1 câu tổng kết" }`;

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
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      // AI unavailable/malformed — fall back to the deterministic allocation.
      return NextResponse.json({
        suggestions: allocations.map((a) => ({ fundName: a.fundName, amount: a.amount, reason: '' })),
        summary: 'Phân bổ theo logic (AI tạm thời không khả dụng).',
      });
    }
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
    return errorResponse('POST /api/allocation/suggest', e);
  }
}
