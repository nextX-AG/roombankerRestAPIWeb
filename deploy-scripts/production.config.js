// IoT Gateway Supervisor Konfiguration für den Produktionsserver

module.exports = {
  apps: [
    {
      name: 'iot-api',
      script: 'app.py',
      cwd: '/var/www/iot-gateway/api',
      interpreter: '/var/www/iot-gateway/venv/bin/python',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8080'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'iot-processor',
      script: 'message_processor.py',
      cwd: '/var/www/iot-gateway/api',
      interpreter: '/var/www/iot-gateway/venv/bin/python',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8082'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'iot-auth',
      script: 'auth_service.py',
      cwd: '/var/www/iot-gateway/api',
      interpreter: '/var/www/iot-gateway/venv/bin/python',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8081'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'iot-gateway',
      script: 'api_gateway.py',
      cwd: '/var/www/iot-gateway/gateway',
      interpreter: '/var/www/iot-gateway/venv/bin/python',
      env: {
        'FLASK_ENV': 'production',
        'GATEWAY_PORT': '8000'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    },
    {
      name: 'webhook',
      script: 'webhook.js',
      cwd: '/var/www/iot-gateway/deploy-scripts',
      env: {
        'NODE_ENV': 'production',
        'PORT': '8001',
        'WEBHOOK_SECRET': process.env.WEBHOOK_SECRET || ''
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M'
    }
  ]
}; 