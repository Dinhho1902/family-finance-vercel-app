/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    // connect-src must include every host the client talks to directly:
    // Supabase (auth/realtime), and the API routes are same-origin ('self').
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Next.js requires 'unsafe-inline' for its bootstrap/runtime scripts.
      "script-src 'self' 'unsafe-inline'",
      // Tailwind/Recharts inject inline styles.
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
