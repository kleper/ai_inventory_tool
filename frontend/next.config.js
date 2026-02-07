/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
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
            },
            {
                source: '/media/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/media/:path*`, // Serve Media
            }
        ];
    },
};

module.exports = withPWA(nextConfig);
