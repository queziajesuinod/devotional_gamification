# Environment Variables Configuration

This document lists all environment variables required for deploying Devocional Quest in production.

## Database Configuration

```bash
DATABASE_URL=postgresql://user:password@postgres:5432/devocional_quest
DB_HOST=postgres
DB_PORT=5432
DB_NAME=devocional_quest
DB_USER=devocional_user
DB_PASSWORD=your_secure_password_here
```

## Server Configuration

```bash
NODE_ENV=production
PORT=3009
EXPO_PORT=8081
```

## Security

```bash
# Generate a secure random string (at least 32 characters)
JWT_SECRET=2ff87d8700792e573417946d6d65b097f78735d88ed3f4b8162612684d1e2845
```

## CORS Configuration

```bash
# Your production domain
CORS_ORIGIN=https://your-domain.com
```

## App Configuration

```bash
APP_NAME=Devocional Quest
APP_URL=https://your-domain.com
```

## Redis Configuration

```bash
# Redis connection settings
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here
```

## Traefik Configuration (for docker-compose)

```bash
TRAEFIK_DOMAIN=your-domain.com
TRAEFIK_NETWORK=traefik-public
```

## Optional: S3/Storage Configuration

If you want to use external S3-compatible storage for user uploads:

```bash
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=devocional-quest-uploads
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1
```

## How to Generate JWT_SECRET

Run this command to generate a secure random string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use this online tool: https://www.grc.com/passwords.htm (use the "63 random alpha-numeric characters" option)
