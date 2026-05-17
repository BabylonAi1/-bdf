/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // These packages must be loaded by Node at runtime, not bundled by webpack.
  // - @napi-rs/canvas:    ships a native .node Skia binary
  // - tesseract.js:       loads worker_threads + wasm at runtime
  // - puppeteer:          spawns a Chrome binary
  // - sharp / pdfjs-dist: pulled in transitively
  serverExternalPackages: [
    '@napi-rs/canvas',
    'tesseract.js',
    'puppeteer',
    'pdfjs-dist',
    'unpdf',
  ],
  webpack: (config) => {
    // pdfjs-dist uses canvas in browser builds — we only call it from server.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
