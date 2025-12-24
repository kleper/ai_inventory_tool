/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/:path*`, // Proxy to Backend
            },
            {
                source: '/ws/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/:path*`, // Proxy WebSockets
            }
        ];
    },
};

module.exports = withPWA(nextConfig);
