/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@msq-tx-monitor/tx-types',
    '@msq-tx-monitor/chain-utils',
    '@msq-tx-monitor/msq-common',
    '@msq-tx-monitor/subgraph-client',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },
  // Webpack configuration
  webpack: config => {
    return config;
  },
};

module.exports = nextConfig;
