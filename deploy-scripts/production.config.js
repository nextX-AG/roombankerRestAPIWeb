// IoT Gateway Supervisor Konfiguration für den Produktionsserver

module.exports = {
  apps: [
    {
      name: 'iot-api',
      script: 'app.py',
      cwd: '/var/www/iot-gateway/roombankerRestAPIWeb/api',
      interpreter: '/var/www/iot-gateway/roombankerRestAPIWeb/venv/bin/python',
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
      cwd: '/var/www/iot-gateway/roombankerRestAPIWeb/api',
      interpreter: '/var/www/iot-gateway/roombankerRestAPIWeb/venv/bin/python',
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
      name: 'iot-auth',
      script: 'auth_service.py',
      cwd: '/var/www/iot-gateway/roombankerRestAPIWeb/api',
      interpreter: '/var/www/iot-gateway/roombankerRestAPIWeb/venv/bin/python',
      env: {
        'FLASK_ENV': 'production',
        'PORT': '8082'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M'
    }
  ]
}; 