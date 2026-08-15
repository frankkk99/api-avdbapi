const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }], unoptimized: true },
  outputFileTracingIncludes: {
    '/api/avdb-scan': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/browser-session': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/bulk-discover': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/bulk-test': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
};
export default nextConfig;
