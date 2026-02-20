/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  // Allow esm.sh for strudel imports in iframe
  async headers() {
    return [
      {
        source: '/strudel.html',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
