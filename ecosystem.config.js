module.exports = {
  apps: [
    {
      name: 'samba-edvance',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,        // única instância — evita múltiplos pools Prisma
      exec_mode: 'fork',   // não cluster
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
