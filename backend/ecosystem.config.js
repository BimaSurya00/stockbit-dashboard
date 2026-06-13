module.exports = {
  apps: [
    {
      name: 'stockbit-server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'stockbit-news-worker',
      script: 'workers/fetch-news.js',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '*/5 * * * *',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
