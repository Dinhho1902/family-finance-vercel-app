import { GoogleSpreadsheet } from 'google-spreadsheet';
import { SignJWT, importPKCS8 } from 'jose';

async function getAccessToken() {
  const privateKeyRaw = process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!privateKeyRaw || !email) {
    throw new Error('Thiếu cấu hình biến môi trường kết nối Google Sheets (Vui lòng cấu hình NEXT_PUBLIC_...)');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const alg = 'RS256';
  const pkcs8 = await importPKCS8(privateKey, alg);
  
  const jwt = await new SignJWT({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token'
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(pkcs8);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const data = await res.json();
  if (!data.access_token) throw new Error('Không thể lấy được access token từ Google');
  return data.access_token;
}

export async function getDoc() {
  const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('Thiếu GOOGLE_SHEET_ID');

  const token = await getAccessToken();
  const doc = new GoogleSpreadsheet(sheetId, { token });
  await doc.loadInfo();
  return doc;
}


// Utility an toàn để parse số tiền do bị Google Sheets trả về dạng chuỗi định dạng (VD: '50.000.000' -> 50)
function parseMoney(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9]/g, ''));
}

function parseDecimal(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).replace(/,/g, '.');
  return parseFloat(s) || 0;
}

export type Fund = {
  fundName: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  goalAmount: number | null;
  targetDate: string | null;
  monthlyTarget: number | null;
  isVirtual?: boolean;
}

export async function getFundsData(): Promise<Fund[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Funds'];
    if (!sheet) return [];
    
    // Đọc header trước để đảm bảo khi mapping không bị lỗi nếu cột chưa được ai tạo
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    const hasGoalAmount = headers.includes('GoalAmount');
    const hasTargetDate = headers.includes('TargetDate');
    const hasMonthlyTarget = headers.includes('MonthlyTarget');

    const rows = await sheet.getRows();
    const fundsList: Fund[] = rows.map((row: any) => {
      const initBal = parseMoney(row.get('InitialBalance'));
      const goal = hasGoalAmount ? parseMoney(row.get('GoalAmount')) : null;
      const tDate = hasTargetDate ? row.get('TargetDate') : null;
      const mTarget = hasMonthlyTarget ? parseMoney(row.get('MonthlyTarget')) : null;

      return {
        fundName: row.get('FundName') || 'Không tên',
        type: row.get('Type') || 'Khác',
        initialBalance: initBal,
        currentBalance: initBal,
        goalAmount: isNaN(goal as number) ? null : goal,
        targetDate: tDate || null,
        monthlyTarget: isNaN(mTarget as number) ? null : mTarget
      };
    });

    const investments = await getInvestmentsData();
    const totalInvestmentValue = investments.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);

    const savings = await getSavingsData();
    const totalSavingsValue = savings.reduce((acc, curr) => acc + curr.principal, 0);

    const gold = await getGoldData();
    const totalGoldValue = gold.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);

    // Apply Hybrid Logic
    let hasInvestmentFund = false;
    let hasSavingsFund = false;
    let hasGoldFund = false;

    // Check if they exist physically, and override their values
    fundsList.forEach(f => {
      if (f.fundName === 'Quỹ Chứng Khoán') {
        f.initialBalance = totalInvestmentValue;
        f.currentBalance = totalInvestmentValue;
        f.isVirtual = true;
        hasInvestmentFund = true;
      }
      if (f.fundName === 'Quỹ Tiết Kiệm') {
        f.initialBalance = totalSavingsValue;
        f.currentBalance = totalSavingsValue;
        f.isVirtual = true;
        hasSavingsFund = true;
      }
      if (f.fundName === 'Quỹ Vàng') {
        f.initialBalance = totalGoldValue;
        f.currentBalance = totalGoldValue;
        f.isVirtual = true;
        hasGoldFund = true;
      }
    });

    // If they don't exist physically, we virtualize them entirely
    if (!hasInvestmentFund) {
      fundsList.push({
        fundName: 'Quỹ Chứng Khoán',
        type: 'Đầu tư',
        initialBalance: totalInvestmentValue,
        currentBalance: totalInvestmentValue,
        goalAmount: null,
        targetDate: null,
        monthlyTarget: null,
        isVirtual: true
      });
    }

    if (!hasSavingsFund) {
       fundsList.push({
        fundName: 'Quỹ Tiết Kiệm',
        type: 'Tiết kiệm',
        initialBalance: totalSavingsValue,
        currentBalance: totalSavingsValue,
        goalAmount: null,
        targetDate: null,
        monthlyTarget: null,
        isVirtual: true
      });
    }

    if (!hasGoldFund) {
      fundsList.push({
        fundName: 'Quỹ Vàng',
        type: 'Vàng',
        initialBalance: totalGoldValue,
        currentBalance: totalGoldValue,
        goalAmount: null,
        targetDate: null,
        monthlyTarget: null,
        isVirtual: true
      });
    }

    return fundsList;
  } catch (error) {
    console.error("Error fetching funds:", error);
    return [];
  }
}

export type Investment = {
  asset: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

export async function getInvestmentsData(): Promise<Investment[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Investments'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    return rows.map(row => ({
      asset: row.get('Asset') || 'N/A',
      quantity: parseDecimal(row.get('Quantity')),
      avgPrice: parseMoney(row.get('AvgPrice')),
      currentPrice: parseMoney(row.get('CurrentPrice')),
    }));
  } catch (error) {
    console.error("Error fetching investments:", error);
    return [];
  }
}

export type Saving = {
  bankName: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
}

export async function getSavingsData(): Promise<Saving[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Savings'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    return rows.map(row => ({
      bankName: row.get('BankName') || 'N/A',
      principal: parseMoney(row.get('Principal')),
      interestRate: parseDecimal(row.get('InterestRate')),
      startDate: row.get('StartDate') || '',
      maturityDate: row.get('MaturityDate') || '',
    }));
  } catch (error) {
    console.error("Error fetching savings:", error);
    return [];
  }
}

export type Transaction = {
  date: string;
  type: string;
  sourceFund: string;
  destinationFund: string;
  amount: number;
  note: string;
  createdAt: string;
}

export async function getTransactionsData(limit: number = 5): Promise<Transaction[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Transactions'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    // Lấy X dòng cuối cùng (mới nhất)
    const recentRows = rows.slice(-limit).reverse();

    return recentRows.map(row => ({
      date: row.get('Date') || '',
      type: row.get('Type') || '',
      sourceFund: row.get('SourceFund') || '',
      destinationFund: row.get('DestinationFund') || '',
      amount: parseMoney(row.get('Amount')),
      note: row.get('Note') || '',
      createdAt: row.get('CreatedAt') || ''
    }));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export type HistoryPoint = {
  date: string;
  totalValue: number;
}

export async function getHistoryData(): Promise<HistoryPoint[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['History'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    return rows.map(row => ({
      date: row.get('Date') || '',
      totalValue: parseMoney(row.get('TotalValue'))
    }));
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
}

export async function recordNetWorthSnapshot(total: number, invest: number, savings: number, gold: number, cash: number) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['History'];
    if (!sheet) return;

    const today = new Date().toISOString().split('T')[0];
    const rows = await sheet.getRows();
    
    // Nếu hôm nay đã có snapshot rồi, cập nhật thay vì thêm mới để tránh rác dữ liệu
    const existing = rows.find(r => r.get('Date') === today);
    if (existing) {
       existing.set('TotalValue', total);
       existing.set('InvestmentsValue', invest);
       existing.set('SavingsValue', savings);
       existing.set('GoldValue', gold);
       existing.set('CashValue', cash);
       await existing.save();
    } else {
       await sheet.addRow({
         Date: today,
         TotalValue: total,
         InvestmentsValue: invest,
         SavingsValue: savings,
         GoldValue: gold,
         CashValue: cash
       });
    }
  } catch (error) {
    console.error("Error recording snapshot:", error);
  }
}

export type Gold = {
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

export async function getGoldData(): Promise<Gold[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Gold'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    return rows.map(row => ({
      type: row.get('Type') || 'N/A',
      quantity: parseDecimal(row.get('Quantity')),
      avgPrice: parseMoney(row.get('AvgPrice')),
      currentPrice: parseMoney(row.get('CurrentPrice')),
    }));
  } catch (error) {
    console.error("Error fetching gold data:", error);
    return [];
  }
}

export async function getAppSettings(): Promise<Record<string, string>> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return {};
    
    const rows = await sheet.getRows();
    const settings: Record<string, string> = {};
    rows.forEach(row => {
      const key = row.get('Key');
      const val = row.get('Value');
      if (key) settings[key] = val || '';
    });
    return settings;
  } catch (error) {
    console.error("Error fetching app settings:", error);
    return {};
  }
}

export async function updateAppSetting(key: string, value: string) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return;

    const rows = await sheet.getRows();
    const existing = rows.find(r => r.get('Key') === key);
    
    if (existing) {
      existing.set('Value', value);
      await existing.save();
    } else {
      await sheet.addRow({ Key: key, Value: value });
    }
  } catch (error) {
    console.error("Error updating app setting:", error);
  }
}

export type AllocationRecord = {
  date: string;
  month: string;
  totalAmount: number;
  note: string;
  details: string; // JSON string of {fundName, amount}[]
}

export async function getAllocationHistory(): Promise<AllocationRecord[]> {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Allocations'];
    if (!sheet) return [];
    
    const rows = await sheet.getRows();
    return [...rows].reverse().map(row => ({
      date: row.get('Date') || '',
      month: row.get('Month') || '',
      totalAmount: parseMoney(row.get('TotalAmount')),
      note: row.get('Note') || '',
      details: row.get('Details') || '[]',
    }));
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return [];
  }
}

export async function saveAllocationRecord(record: AllocationRecord) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Allocations'];
    if (!sheet) throw new Error("Sheet Allocations không tồn tại.");

    await sheet.addRow({
      Date: record.date,
      Month: record.month,
      TotalAmount: record.totalAmount,
      Note: record.note,
      Details: record.details,
    });
  } catch (error) {
    console.error("Error saving allocation:", error);
    throw error;
  }
}
