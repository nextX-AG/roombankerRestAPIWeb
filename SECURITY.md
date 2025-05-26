# Security Guidelines for evAlarm-IoT Gateway

## MongoDB Security Incident (26.05.2025)

### What happened:
- MongoDB was exposed to the internet on port 27017 without authentication
- The database was compromised by ransomware attackers
- All data was deleted and a ransom demand was left

### Security Measures Implemented:

1. **MongoDB Port Protection**
   - Removed external port mapping in docker-compose.yml
   - MongoDB is now only accessible within the Docker network

2. **MongoDB Authentication**
   - Added mandatory authentication with username/password
   - All services now use authenticated connection strings

3. **Secure Configuration**
   ```yaml
   # NO external ports!
   mongo:
     image: mongo:5.0
     # ports:  # NEVER expose MongoDB to the internet!
     #   - "27017:27017"
     environment:
       - MONGO_INITDB_ROOT_USERNAME=evalarm_admin
       - MONGO_INITDB_ROOT_PASSWORD=evalarm_secure_password_2024!
       - MONGO_INITDB_DATABASE=evalarm_iot
   ```

### Deployment Checklist:

1. **Before Deployment:**
   - [ ] Verify MongoDB has NO external port mapping
   - [ ] Ensure authentication is enabled
   - [ ] Create `.env` file from `production.env.example`
   - [ ] Change default passwords in `.env` file
   - [ ] NEVER commit `.env` file to git
   - [ ] Test locally first

2. **On Server:**
   - [ ] Copy `.env` file to server (use secure transfer like scp)
   - [ ] Backup existing data (if any)
   - [ ] Stop all containers: `docker-compose down`
   - [ ] Remove compromised volume: `docker volume rm evalarm-gateway_mongo_data_new`
   - [ ] Pull new configuration
   - [ ] Start with new secure config: `docker-compose up -d`

3. **After Deployment:**
   - [ ] Verify MongoDB port 27017 is NOT accessible from outside
   - [ ] Test with: `nmap -p 27017 <server-ip>` (should show closed/filtered)
   - [ ] Re-create all necessary data (customers, templates, etc.)

### Firewall Rules (Additional Protection):

```bash
# Block MongoDB port on server firewall
iptables -A INPUT -p tcp --dport 27017 -j DROP
iptables -A INPUT -p tcp --dport 27017 -s 172.16.0.0/12 -j ACCEPT  # Allow Docker network only
```

### Environment Variables:

Create a `.env` file based on `production.env.example`:

```bash
# Copy the example file
cp production.env.example .env

# Edit with secure values
nano .env

# Example secure password generation:
openssl rand -base64 32
```

**Important**: 
- Use strong, unique passwords in production
- Never use the default passwords from examples
- Keep `.env` file out of version control
- Restrict file permissions: `chmod 600 .env`

### Important Notes:
- NEVER expose database ports directly to the internet
- Always use authentication for databases
- Regularly backup your data
- Monitor for unauthorized access attempts 