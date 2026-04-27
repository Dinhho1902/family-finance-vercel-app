import * as api from './client-api';

export function initApiInterceptor() {
  if (typeof window === 'undefined') return;
  if ((window as any).__apiMocked) return;
  (window as any).__apiMocked = true;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let urlStr = '';
    if (typeof input === 'string') urlStr = input;
    else if (input instanceof URL) urlStr = input.toString();
    else if (input instanceof Request) urlStr = input.url;

    if (!urlStr.includes('/api/')) return originalFetch(input, init);

    // Các route này đã có server-side handler thật, không cần interceptor
    const REAL_ROUTES = ['/api/sheets', '/api/price-reaction', '/api/risk', '/api/funds', '/api/investments/sync'];
    if (REAL_ROUTES.some(r => urlStr.includes(r))) return originalFetch(input, init);

    console.log('[API Interceptor] Intercepted:', urlStr);
    
    try {
      const url = new URL(urlStr, window.location.origin);
      const pathname = url.pathname;
      let bodyData = null;
      if (init?.body && typeof init.body === 'string') bodyData = JSON.parse(init.body);

      let result: any = null;

      if (pathname === '/api/funds') {
        if (init?.method === 'DELETE') result = await api.deleteFundApi(url.searchParams.get('name')!);
        else result = await api.submitFundApi(bodyData);
      } 
      else if (pathname === '/api/savings') result = await api.submitSavingApi(bodyData);
      else if (pathname === '/api/gold') result = await api.submitGoldApi(bodyData);
      else if (pathname === '/api/transactions') result = await api.submitTransactionApi(bodyData);
      else if (pathname === '/api/investments') result = await api.submitInvestmentApi(bodyData);
      else if (pathname === '/api/allocation/suggest') result = await api.suggestAllocationApi(bodyData);
      else if (pathname === '/api/allocation/save') result = await api.saveAllocationApi(bodyData);
      else if (pathname === '/api/investments/sync') result = await api.syncInvestmentsApi();
      else if (pathname === '/api/price-reaction') result = await api.getPriceReactionApi(url.searchParams.get('tickers') || '');
      else if (pathname === '/api/risk') result = await api.getRiskApi(url.searchParams.get('tickers') || '');

      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
    } catch (error: any) {
      console.error('[API Interceptor] Error executing local mock:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }

    return originalFetch(input, init);
  };
}
