// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:5000',
  },
}

module.exports = nextConfig
