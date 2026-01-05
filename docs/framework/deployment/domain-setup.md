# DTT Framework - Domain Setup Guide

## Overview

This guide provides comprehensive instructions for configuring custom domains for your DTT Framework deployment, including DNS settings, SSL/TLS certificates, and various domain configurations for both Vercel and DigitalOcean.

---

## Table of Contents

1. [Domain Configuration for Vercel](#domain-configuration-for-vercel)
2. [Domain Configuration for DigitalOcean](#domain-configuration-for-digitalocean)
3. [DNS Settings](#dns-settings)
4. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
5. [Custom Domain Verification](#custom-domain-verification)
6. [Subdomain Configuration](#subdomain-configuration)
7. [Redirects](#redirects)
8. [CDN Configuration](#cdn-configuration)
9. [Troubleshooting Domain Issues](#troubleshooting-domain-issues)

---

## Domain Configuration for Vercel

### Step 1: Add Domain to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Click **"Add"**
5. Enter your domain name (e.g., `your-app.com`)
6. Click **"Add"**

### Step 2: Choose Domain Type

Vercel offers two domain types:

| Type | Description | Cost |
|------|-------------|------|
| **Production Domain** | Main domain for production | Free |
| **Preview Domain** | For preview deployments | Free |
| **Wildcard Domain** | For all subdomains | Paid |

### Step 3: Configure DNS Records

Vercel will display the required DNS records:

#### A Record

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 300
```

#### CNAME Record

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
```

### Step 4: Update DNS Records

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the DNS records:

#### Example for Cloudflare

1. Go to **DNS** → **Records**
2. Add A record:
   - **Type**: A
   - **Name**: `@`
   - **IPv4 address**: `76.76.21.21`
   - **Proxy status**: Proxied (orange cloud) or DNS only (gray cloud)
3. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `www`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy status**: Proxied or DNS only

#### Example for GoDaddy

1. Go to **DNS Management**
2. Add A record:
   - **Type**: A
   - **Name**: `@`
   - **Value**: `76.76.21.21`
   - **TTL**: 1 Hour
3. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 1 Hour

### Step 5: Verify DNS Propagation

Wait for DNS propagation (can take up to 24 hours):

```bash
# Check DNS propagation
dig your-app.com

# Or use online tools:
# https://dnschecker.org/
# https://whatsmydns.net/
```

### Step 6: Update Environment Variables

Update your `NEXT_PUBLIC_APP_URL` in Vercel:

```bash
# Via Vercel Dashboard
# Settings → Environment Variables → Edit
NEXT_PUBLIC_APP_URL=https://your-app.com

# Via CLI
vercel env add NEXT_PUBLIC_APP_URL production
```

### Step 7: Redeploy Application

Redeploy to apply changes:

```bash
# Via CLI
vercel --prod

# Or via Dashboard
# Deployments → Redeploy
```

### Step 8: Verify Domain

1. Go to **Settings** → **Domains**
2. Wait for the domain status to show **"Valid Configuration"**
3. Visit your domain: `https://your-app.com`

---

## Domain Configuration for DigitalOcean

### For App Platform

#### Step 1: Add Domain to App Platform

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Select your app
3. Go to **Settings** → **Domains**
4. Click **"Add Domain"**
5. Enter your domain name (e.g., `your-app.com`)
6. Click **"Add Domain"**

#### Step 2: Configure DNS Records

DigitalOcean will display the required DNS records:

```
Type: CNAME
Name: @
Value: your-app.ondigitalocean.app
TTL: 300
```

#### Step 3: Update DNS Records

Add the CNAME record to your domain registrar.

#### Step 4: Configure SSL

DigitalOcean App Platform automatically provisions SSL certificates via Let's Encrypt.

#### Step 5: Update Environment Variables

```bash
# In App Platform settings
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### For Droplets

#### Step 1: Point Domain to Droplet IP

Add an A record pointing to your Droplet's IP address:

```
Type: A
Name: @
Value: your-droplet-ip
TTL: 300
```

#### Step 2: Configure Nginx Server Block

```bash
# Edit Nginx configuration
nano /etc/nginx/sites-available/dtt-framework
```

Update the server name:

```nginx
server {
    listen 80;
    server_name your-app.com www.your-app.com;

    location / {
        proxy_pass http://localhost:3000;
        # ... rest of configuration
    }
}
```

#### Step 3: Test and Reload Nginx

```bash
# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### Step 4: Configure SSL with Let's Encrypt

```bash
# Obtain SSL certificate
certbot --nginx -d your-app.com -d www.your-app.com
```

#### Step 5: Update Environment Variables

```bash
# Edit .env file
nano /var/www/dtt-framework/.env

# Update APP_URL
NEXT_PUBLIC_APP_URL=https://your-app.com

# Restart application
pm2 restart dtt-framework
```

---

## DNS Settings

### Understanding DNS Record Types

| Record Type | Purpose | Example |
|-------------|---------|---------|
| **A** | Maps domain to IPv4 address | `your-app.com → 76.76.21.21` |
| **AAAA** | Maps domain to IPv6 address | `your-app.com → 2606:4700::1` |
| **CNAME** | Maps domain to another domain | `www.your-app.com → your-app.com` |
| **MX** | Mail exchange server | `@ → mail.your-app.com` |
| **TXT** | Text records for verification | `@ → v=spf1 include:_spf.google.com ~all` |
| **SRV** | Service records | `_sip._tcp.your-app.com` |

### Common DNS Configurations

#### Root Domain (A Record)

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 300
```

#### WWW Subdomain (CNAME)

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
```

#### API Subdomain (CNAME)

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 300
```

#### Wildcard Subdomain (CNAME)

```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
TTL: 300
```

### DNS TTL (Time to Live)

| TTL Value | Use Case |
|-----------|----------|
| **300 (5 minutes)** | Development/testing |
| **3600 (1 hour)** | Production standard |
| **86400 (1 day)** | Rarely changed records |

### DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate globally.

#### Check Propagation Status

```bash
# Check from different locations
dig your-app.com

# Or use online tools
# https://dnschecker.org/
# https://whatsmydns.net/
```

---

## SSL/TLS Certificate Setup

### Vercel SSL

Vercel automatically provisions SSL certificates for all domains:

- **Automatic**: No configuration needed
- **Free**: Let's Encrypt certificates
- **Auto-renewal**: Certificates renew automatically

#### Check SSL Status

1. Go to **Settings** → **Domains**
2. Check the SSL certificate status
3. Should show **"Valid Certificate"**

### DigitalOcean App Platform SSL

DigitalOcean App Platform also provides automatic SSL:

- **Automatic**: Provisioned via Let's Encrypt
- **Free**: No additional cost
- **Auto-renewal**: Automatic renewal

### DigitalOcean Droplet SSL with Let's Encrypt

#### Install Certbot

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx
```

#### Obtain SSL Certificate

```bash
# For single domain
certbot --nginx -d your-app.com

# For multiple domains
certbot --nginx -d your-app.com -d www.your-app.com

# For wildcard (requires DNS challenge)
certbot certonly --manual --preferred-challenges dns -d "*.your-app.com"
```

#### SSL Configuration

Certbot automatically configures Nginx with SSL:

```nginx
server {
    listen 443 ssl;
    server_name your-app.com www.your-app.com;

    ssl_certificate /etc/letsencrypt/live/your-app.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-app.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of configuration
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-app.com www.your-app.com;
    return 301 https://$server_name$request_uri;
}
```

#### Test SSL Configuration

```bash
# Test SSL certificate
certbot certificates

# Test SSL configuration
openssl s_client -connect your-app.com:443

# Or use online tools
# https://www.ssllabs.com/ssltest/
```

#### Auto-Renewal

Certbot sets up automatic renewal by default:

```bash
# Test renewal
certbot renew --dry-run

# Check renewal timer
systemctl list-timers | grep certbot
```

### SSL Best Practices

1. **Use HTTPS Only**: Redirect all HTTP traffic to HTTPS
2. **Strong Ciphers**: Use strong SSL/TLS ciphers
3. **HSTS**: Enable HTTP Strict Transport Security
4. **Certificate Monitoring**: Monitor certificate expiration
5. **Regular Updates**: Keep SSL libraries updated

---

## Custom Domain Verification

### Why Verification is Needed

Domain verification ensures:
- You own the domain
- Prevents unauthorized domain usage
- Required for SSL certificates

### Verification Methods

#### Method 1: DNS TXT Record

Add a TXT record to your DNS:

```
Type: TXT
Name: @
Value: vercel-domain-verification=your-verification-code
TTL: 300
```

#### Method 2: HTML File Upload

Upload a verification file:

```bash
# Create verification file
echo "verification-code" > .well-known/vercel-domain-verification

# Upload to your server
```

#### Method 3: Meta Tag

Add meta tag to your HTML:

```html
<meta name="vercel-domain-verification" content="your-verification-code">
```

### Verify Domain Ownership

#### Via Vercel Dashboard

1. Go to **Settings** → **Domains**
2. Click **"Verify"** next to your domain
3. Follow the verification instructions
4. Wait for verification to complete

#### Via CLI

```bash
# Verify domain
vercel domains verify your-app.com
```

### Verification Status

| Status | Description | Action Required |
|--------|-------------|-----------------|
| **Pending** | Verification in progress | Wait for DNS propagation |
| **Verified** | Domain verified | No action needed |
| **Failed** | Verification failed | Check DNS records |

---

## Subdomain Configuration

### Common Subdomain Patterns

| Subdomain | Purpose | Example |
|-----------|---------|---------|
| **www** | Main website | `www.your-app.com` |
| **api** | API endpoints | `api.your-app.com` |
| **app** | Application | `app.your-app.com` |
| **admin** | Admin panel | `admin.your-app.com` |
| **staging** | Staging environment | `staging.your-app.com` |
| **dev** | Development environment | `dev.your-app.com` |

### Configuring Subdomains in Vercel

#### Add Subdomain

1. Go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter subdomain (e.g., `api.your-app.com`)
4. Click **"Add"**

#### Configure DNS Records

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 300
```

### Configuring Subdomains in DigitalOcean

#### For App Platform

Add each subdomain in **Settings** → **Domains**.

#### For Droplets

Add CNAME records to your DNS:

```
Type: CNAME
Name: api
Value: your-app.com
TTL: 300
```

Configure Nginx server block:

```nginx
server {
    listen 80;
    server_name api.your-app.com;

    location / {
        proxy_pass http://localhost:3000;
        # ... rest of configuration
    }
}
```

### Wildcard Subdomains

Configure a wildcard subdomain for all subdomains:

```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
TTL: 300
```

---

## Redirects

### WWW to Non-WWW Redirect

#### In Vercel

Add redirect configuration to `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.your-app.com"
        }
      ],
      "destination": "https://your-app.com/:path*",
      "permanent": true
    }
  ]
}
```

#### In Nginx

```nginx
server {
    listen 80;
    server_name www.your-app.com;
    return 301 https://your-app.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.your-app.com;
    return 301 https://your-app.com$request_uri;
}
```

### HTTP to HTTPS Redirect

#### In Vercel

Vercel automatically redirects HTTP to HTTPS for custom domains.

#### In Nginx

```nginx
server {
    listen 80;
    server_name your-app.com www.your-app.com;
    return 301 https://$server_name$request_uri;
}
```

### Custom Path Redirects

#### In Vercel

```json
{
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    },
    {
      "source": "/blog/:slug",
      "destination": "/articles/:slug",
      "permanent": true
    }
  ]
}
```

#### In Nginx

```nginx
server {
    # ... other configuration

    location /old-path {
        return 301 /new-path;
    }

    rewrite ^/blog/(.*)$ /articles/$1 permanent;
}
```

### Domain Migration Redirects

When migrating domains, set up redirects:

```nginx
server {
    listen 80;
    server_name old-domain.com www.old-domain.com;
    return 301 https://new-domain.com$request_uri;
}

server {
    listen 443 ssl;
    server_name old-domain.com www.old-domain.com;
    return 301 https://new-domain.com$request_uri;
}
```

---

## CDN Configuration

### Vercel Edge Network

Vercel automatically uses its global Edge Network for CDN:

- **Global**: 100+ edge locations worldwide
- **Automatic**: No configuration needed
- **Smart Caching**: Intelligent cache invalidation

### Cloudflare CDN

#### Step 1: Add Domain to Cloudflare

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Scan existing DNS records
4. Change nameservers to Cloudflare

#### Step 2: Configure DNS Records

Update DNS records in Cloudflare:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
Proxy status: Proxied (orange cloud)
```

#### Step 3: Configure SSL

In Cloudflare SSL/TLS settings:

- **SSL Mode**: Full (strict)
- **Always Use HTTPS**: On
- **Automatic HTTPS Rewrites**: On

#### Step 4: Configure Caching

In Cloudflare Caching settings:

- **Caching Level**: Standard
- **Browser Cache TTL**: Respect Existing Headers
- **Always Online**: On

### DigitalOcean CDN (Spaces)

For static assets, use DigitalOcean Spaces CDN:

```bash
# Create a Space
# Enable CDN
# Configure custom CDN endpoint
```

---

## Troubleshooting Domain Issues

### Issue: Domain Not Resolving

**Symptoms:**
- Domain returns "server not found"
- DNS lookup fails

**Solutions:**

```bash
# Check DNS propagation
dig your-app.com

# Check from multiple locations
# https://dnschecker.org/

# Verify DNS records at registrar
# Ensure records are correct

# Wait for propagation (up to 48 hours)
```

### Issue: SSL Certificate Not Issued

**Symptoms:**
- HTTPS not working
- Certificate errors in browser

**Solutions:**

```bash
# Check DNS records
dig your-app.com

# Verify domain is pointing correctly
# Ensure A/CNAME records are correct

# Check SSL status in dashboard
# Vercel: Settings → Domains
# DigitalOcean: Settings → Domains

# Manually trigger certificate issuance
# Vercel: Click "Issue Certificate"
# DigitalOcean: Automatic, check logs
```

### Issue: Mixed Content Errors

**Symptoms:**
- Browser shows "mixed content" warnings
- Some resources load over HTTP

**Solutions:**

```javascript
// Ensure all resources use HTTPS
// Update image URLs
// Update API endpoints
// Update CDN URLs

// Use relative URLs
<img src="/images/logo.png" />

// Or use protocol-relative URLs
<img src="//cdn.example.com/image.png" />
```

### Issue: Redirect Loops

**Symptoms:**
- Browser shows "too many redirects"
- Page won't load

**Solutions:**

```bash
# Check redirect configurations
# Ensure no conflicting redirects

# Check Nginx configuration
nginx -t

# Check Vercel redirects
# Review vercel.json

# Clear browser cache
# Test in incognito mode
```

### Issue: Subdomain Not Working

**Symptoms:**
- Subdomain returns error
- Subdomain doesn't resolve

**Solutions:**

```bash
# Check DNS records
dig api.your-app.com

# Verify CNAME record
# Ensure it points to correct target

# Check server configuration
# Ensure server block includes subdomain

# Restart services
systemctl reload nginx
pm2 restart dtt-framework
```

### Issue: DNS Propagation Delay

**Symptoms:**
- Domain works on some devices but not others
- Inconsistent behavior

**Solutions:**

```bash
# Check propagation status
# https://dnschecker.org/
# https://whatsmydns.net/

# Clear DNS cache
# Windows: ipconfig /flushdns
# Mac: sudo dscacheutil -flushcache
# Linux: sudo systemd-resolve --flush-caches

# Wait for full propagation (up to 48 hours)
```

### Issue: HSTS Configuration Issues

**Symptoms:**
- Can't access HTTP version
- Browser forces HTTPS

**Solutions:**

```bash
# Clear HSTS settings in browser
# Chrome: chrome://net-internals/#hsts

# Check HSTS configuration
# Ensure correct headers

# Temporarily disable HSTS for testing
```

---

## Best Practices

### 1. Use HTTPS Everywhere

```nginx
# Always redirect HTTP to HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### 2. Implement HSTS

```nginx
# Add HSTS header
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 3. Monitor SSL Certificates

```bash
# Set up certificate monitoring
# Use tools like:
# - SSL Mate
# - UptimeRobot
# - Pingdom
```

### 4. Use DNSSEC

Enable DNSSEC for additional security:

1. Go to your domain registrar
2. Enable DNSSEC
3. Follow the setup instructions

### 5. Implement CAA Records

Add CAA records to specify certificate authorities:

```
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"
TTL: 300
```

### 6. Regular DNS Audits

Regularly audit your DNS configuration:

```bash
# Check all DNS records
dig your-app.com ANY

# Check DNS propagation
# https://dnschecker.org/

# Check DNS security
# https://securitytrails.com/
```

---

## Related Documentation

- [Vercel Deployment](./vercel.md) - Vercel deployment guide
- [DigitalOcean Deployment](./digitalocean.md) - DigitalOcean deployment guide
- [Environment Variables](./environment-variables.md) - Complete variable reference
- [Production Checklist](./production-checklist.md) - Pre-deployment checklist
- [Monitoring](./monitoring.md) - Monitoring and alerting setup
