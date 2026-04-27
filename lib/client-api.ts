import { getDoc, updateAppSetting, recordNetWorthSnapshot } from './google-sheets';

export async function submitFundApi(body: any) {
  const { fundName, type, initialBalance, goalAmount, targetDate, isUpdate } = body;
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Funds'];
  if (!sheet) throw new Error("Chưa setup tab Funds");
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const existing = rows.find((r: any) => r.get('FundName') === fundName);

  if (isUpdate && existing) {
    existing.set('Type', type);
    existing.set('InitialBalance', initialBalance);
    existing.set('GoalAmount', goalAmount || '');
    existing.set('TargetDate', targetDate || '');
    await existing.save();
  } else if (!existing) {
    await sheet.addRow({ FundName: fundName, Type: type, InitialBalance: initialBalance, GoalAmount: goalAmount || '', TargetDate: targetDate || '' });
  } else throw new Error("Tên Quỹ đã tồn tại!");
  return { success: true };
}

export async function deleteFundApi(name: string) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Funds'];
  const rows = await sheet.getRows();
  const rowToDelete = rows.find((r: any) => r.get('FundName') === name);
  if (rowToDelete) { await rowToDelete.delete(); return { success: true }; }
  throw new Error("Không tìm thấy quỹ");
}

export async function submitSavingApi(body: any) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Savings'];
  const rows = await sheet.getRows();
  if (body.actionType === 'DELETE_SAVING') {
    const row = rows.find((r: any) => r.get('BankName') === body.bankName);
    if(row) { await row.delete(); return { success: true}; }
    throw new Error('Not found');
  } else {
    if (rows.find((r: any) => r.get('BankName') === body.bankName)) throw new Error('Đã tồn tại');
    await sheet.addRow({ BankName: body.bankName, Principal: body.principal, InterestRate: body.interestRate, StartDate: body.startDate, MaturityDate: body.maturityDate || '' });
    return { success: true };
  }
}

export async function submitGoldApi(body: any) {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Gold'];
    const rows = await sheet.getRows();
    
    if (body.actionType === 'UPDATE_GOLD') {
      const targetRow = rows.find((r: any) => r.get('Type') === body.originalType);
      if (targetRow) {
        targetRow.set('Type', body.type); targetRow.set('Quantity', body.quantity); targetRow.set('AvgPrice', body.avgPrice); targetRow.set('CurrentPrice', body.currentPrice || targetRow.get('CurrentPrice'));
        await targetRow.save();
      }
    } else if (body.actionType === 'DELETE_GOLD') {
      const targetRow = rows.find((r: any) => r.get('Type') === body.type);
      if (targetRow) await targetRow.delete();
    } else if (body.actionType === 'SYNC_PRICE') {
         const priceRes = await fetch('https://www.vang.today/api/prices');
         const data = await priceRes.json();
         if (data.success && data.prices) {
             const pSJC = data.prices['SJL1L10']?.buy || 0; 
             const pNhan = data.prices['SJ9999']?.buy || data.prices['PQHN24NTT']?.buy || pSJC;
             for (const row of rows) {
                const type = row.get('Type');
                let rawPrice = pSJC;
                if (type.includes('Nhẫn')) rawPrice = pNhan;
                if (rawPrice > 0) { row.set('CurrentPrice', Math.round(rawPrice / 10)); await row.save(); }
             }
           await updateAppSetting('last_gold_sync', new Date().toISOString());
         }
    } else {
      await sheet.addRow({ Type: body.type, Quantity: body.quantity, AvgPrice: body.avgPrice, CurrentPrice: body.currentPrice || body.avgPrice });
    }
    return { success: true };
}

export async function submitTransactionApi(body: any) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Transactions'];
  await sheet.addRow({ Date: body.date, Type: body.type, SourceFund: body.sourceFund, DestinationFund: body.destinationFund, Amount: body.amount, Note: body.note, CreatedAt: new Date().toISOString() });
  
  // Apply changes to funds
  const fundsSheet = doc.sheetsByTitle['Funds'];
  const fundRows = await fundsSheet.getRows();
  
  if (body.type === 'Transfer') {
    const src = fundRows.find((r: any) => r.get('FundName') === body.sourceFund);
    const dest = fundRows.find((r: any) => r.get('FundName') === body.destinationFund);
    if (src) { src.set('InitialBalance', Number(src.get('InitialBalance') || 0) - Number(body.amount)); await src.save(); }
    if (dest) { dest.set('InitialBalance', Number(dest.get('InitialBalance') || 0) + Number(body.amount)); await dest.save(); }
  } else if (body.type === 'Expense') {
    const src = fundRows.find((r: any) => r.get('FundName') === body.sourceFund);
    if (src) { src.set('InitialBalance', Number(src.get('InitialBalance') || 0) - Number(body.amount)); await src.save(); }
  } else if (body.type === 'Income') {
    const dest = fundRows.find((r: any) => r.get('FundName') === body.destinationFund);
    if (dest) { dest.set('InitialBalance', Number(dest.get('InitialBalance') || 0) + Number(body.amount)); await dest.save(); }
  }
  return { success: true };
}

export async function submitInvestmentApi(body: any) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Investments'];
  const rows = await sheet.getRows();
  
  if (body.actionType === 'UPDATE_ASSET') {
      const targetRow = rows.find((r: any) => r.get('Asset') === body.originalAsset);
      if (targetRow) {
        targetRow.set('Asset', body.asset); targetRow.set('Quantity', body.quantity); targetRow.set('AvgPrice', body.avgPrice); targetRow.set('CurrentPrice', body.currentPrice || targetRow.get('CurrentPrice'));
        await targetRow.save();
      }
  } else if (body.actionType === 'DELETE_ASSET') {
      const targetRow = rows.find((r: any) => r.get('Asset') === body.asset);
      if (targetRow) await targetRow.delete();
  } else {
      await sheet.addRow({ Asset: body.asset, Quantity: body.quantity, AvgPrice: body.avgPrice, CurrentPrice: body.currentPrice || body.avgPrice });
  }
  return { success: true };
}

export async function suggestAllocationApi(body: any) {
    const { computeAllocations } = require('@/lib/allocation');
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const { funds, income, accruedInterest, allocationHistory } = body;
    
    const allocations = computeAllocations(funds, Number(income), 0);
    const amountToAllocate = Number(income) || 0;
    if (amountToAllocate <= 0 || allocations.length === 0) {
      return { suggestions: [], summary: "Không có tiền để phân bổ." };
    }
    
    // Fallback if no apiKey
    if(!apiKey || apiKey === "null") {
        return { suggestions: allocations.map((a:any) => ({ fundName: a.fundName, amount: a.amount, reason: "Phân bổ theo logic."})), summary: "Phân bổ tĩnh (Thiếu API Key AI)" };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const totalAssets = funds.reduce((acc: number, f: any) => acc + (f.currentBalance || 0), 0) + (accruedInterest || 0);

    const fmt = (n: number) => Math.round(n).toString();
    const allocationLines = allocations.map((a:any) => `- ${a.fundName}: +${fmt(a.amount)} VND`).join('\n');

    const prompt = `Bạn là trợ lý tài chính báo cáo kết quả:
Số tiền: ${fmt(amountToAllocate)}
KẾT QUẢ:
${allocationLines}
TRẢ VỀ JSON: { "suggestions": [ { "fundName": "...", "amount": <number>, "reason": "1 câu ngắn" } ], "summary": "1 câu tổng kết" }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });
    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const aiResult = JSON.parse(content);
    return { suggestions: allocations.map((a:any) => ({ fundName: a.fundName, amount: a.amount, reason: aiResult.suggestions?.find((s:any)=>s.fundName === a.fundName)?.reason || '' })), summary: aiResult.summary };
}

export async function saveAllocationApi(body: any) {
    const { record, newFundsBalances } = body;
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Allocations'];
    await sheet.addRow({ Date: record.date, Month: record.month, TotalAmount: record.totalAmount, Note: record.note, Details: record.details });
    
    const fundsSheet = doc.sheetsByTitle['Funds'];
    const rows = await fundsSheet.getRows();
    for(const f of newFundsBalances) {
      const row = rows.find((r:any) => r.get('FundName') === f.fundName);
      if(row) {
        row.set('InitialBalance', f.currentBalance);
        await row.save();
      }
    }
    return { success: true };
}

export async function syncInvestmentsApi() {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Investments'];
    const rows = await sheet.getRows();
    
    // Mocking TCBS fetch due to exact behavior (CORS issues on client: if CORS fails, bypass proxy not needed for native iOS, but needed for Web dev)
    for(const row of rows) {
      const asset = row.get('Asset');
      if(asset && asset.length === 3 && asset !== 'Tiền') {
         try {
           const res = await fetch(`https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${asset}&type=stock&resolution=D&size=2`);
           const data = await res.json();
           if(data && data.data && data.data.length > 0) {
              row.set('CurrentPrice', Math.round(data.data[data.data.length - 1].close * 1000));
              await row.save();
           }
         } catch(e) { console.error('TCBS Error', e); }
      }
    }
    await updateAppSetting('last_sync', new Date().toISOString());
    return { success: true };
}

export async function getPriceReactionApi(tickers: string) {
    const res = await fetch(`https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${tickers.split(',')[0]}&type=stock&resolution=D&size=30`);
    const data = await res.json();
    return { data: data.data };
}

export async function getRiskApi(tickers: string) {
    return { data: { risk: "Trained Model - TCBS" } };
}
