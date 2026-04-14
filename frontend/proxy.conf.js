const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000';

module.exports = {
  '/api': {
    target: apiTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/uploads': {
    target: apiTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
