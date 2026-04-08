/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/:path*',
        destination: `${process.env.NEXT_PUBLIC_DOCS_URL || 'https://ccp-docs.vercel.app'}/docs/:path*`,
        permanent: false,
      },
    ];
  },
};

export default config;
