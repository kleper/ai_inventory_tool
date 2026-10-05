/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
    output: 'standalone',
    async headers() {
        return [
            {
                // Match all API routes (proxy and direct v1)
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" }, // Authorized for all (per user request)
                    { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
                    { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
                ]
            }
        ]
    },
    async rewrites() {
        return [
            {
                source: '/api/proxy/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/:path*`, // Proxy to Backend
            },
            {
                // Allow direct access to /api/v1 for external tools (e.g. GeoJSON)
                source: '/api/v1/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/api/v1/:path*`,
            },
            {
                source: '/ws/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/:path*`, // Proxy WebSockets
            },
            {
                source: '/mcp/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/mcp/:path*`, // Proxy MCP
            },
            {
                source: '/mcp',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/mcp`, // Proxy MCP Root
            },
            {
                source: '/media/:path*',
                destination: `${process.env.INTERNAL_API_URL || 'http://backend:8000'}/media/:path*`, // Serve Media
            }
        ];
    },
};

module.exports = withPWA(nextConfig);
