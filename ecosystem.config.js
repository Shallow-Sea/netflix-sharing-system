// PM2 配置文件 - 宝塔面板部署
module.exports = {
  apps: [
    {
      name: 'netflix-api',
      script: 'server.js',
      cwd: '/www/wwwroot/catapi.dmid.cc',
      instances: 1,
      exec_mode: 'cluster',
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 日志配置
      error_file: '/www/wwwroot/catapi.dmid.cc/logs/error.log',
      out_file: '/www/wwwroot/catapi.dmid.cc/logs/out.log',
      log_file: '/www/wwwroot/catapi.dmid.cc/logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
      
      // 性能配置
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=1024',
      
      // 监控配置
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'client'],
      
      // 重启配置
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      
      // 异常处理
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // 进程标识
      instance_var: 'INSTANCE_ID',
      
      // 合并日志
      merge_logs: true
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: 'your_server_ip',
      ref: 'origin/main', 
      repo: 'your_git_repo',
      path: '/www/wwwroot/catapi.dmid.cc',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': ''
    }
  }
};
