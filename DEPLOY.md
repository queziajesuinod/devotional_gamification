# Deployment Guide - Devocional Quest

This guide explains how to deploy Devocional Quest using Docker, Portainer, and Traefik.

## Prerequisites

- Docker and Docker Compose installed
- Traefik reverse proxy running
- Domain name pointed to your server
- Portainer (optional, for easier management)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd devotional_gamification
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with the following variables (see `ENV_VARIABLES.md` for details):

```bash
# Database
DB_NAME=devocional_quest
DB_USER=devocional_user
DB_PASSWORD=your_secure_password_here

# Redis
REDIS_PASSWORD=your_redis_password_here

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters_long

# Domain
TRAEFIK_DOMAIN=your-domain.com
TRAEFIK_NETWORK=traefik-public
CORS_ORIGIN=https://your-domain.com

# App
APP_NAME=Devocional Quest
APP_URL=https://your-domain.com
```

**Important:** Generate a secure JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Build and Deploy

```bash
# Build the Docker image
docker-compose build

# Start the services
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### 4. Run Database Migrations

After the containers are running, execute the database migrations:

```bash
docker-compose exec app pnpm db:push
```

### 5. Seed Initial Data

Populate the database with initial devotional content and groups:

```bash
docker-compose exec app npx tsx scripts/seed.ts
```

## Deployment with Portainer

### 1. Access Portainer

Navigate to your Portainer instance (e.g., `https://portainer.your-domain.com`)

### 2. Create a New Stack

1. Go to **Stacks** → **Add Stack**
2. Name it `devocional-quest`
3. Choose **Git Repository** or **Upload** method

### 3. Configure Environment Variables

In the Portainer stack configuration, add the environment variables from step 2 above.

### 4. Deploy the Stack

Click **Deploy the stack** and wait for the containers to start.

### 5. Run Migrations (via Portainer Console)

1. Go to **Containers** → `devocional-app`
2. Click **Console** → **Connect**
3. Run:
   ```bash
   pnpm db:push
   npx tsx scripts/seed.ts
   ```

## Traefik Configuration

### Redis Session Cache

The application uses Redis for session caching to improve authentication performance:

- **Session Storage**: User sessions are cached in Redis with 7-day TTL
- **Reduced Database Load**: Authentication checks use Redis instead of PostgreSQL
- **Automatic Expiration**: Sessions automatically expire after 7 days
- **Health Monitoring**: Redis status included in `/api/health` endpoint

Redis is automatically configured in the Docker Compose setup with persistent storage.

## Traefik Configuration

The `docker-compose.yml` includes Traefik labels for:

- **Frontend (Expo Web)**: Accessible at `https://your-domain.com`
- **Backend API**: Accessible at `https://your-domain.com/api` and `https://your-domain.com/trpc`
- **SSL/TLS**: Automatic Let's Encrypt certificates
- **CORS**: Configured for cross-origin requests

### Required Traefik Setup

Ensure your Traefik instance has:

1. **Network**: A network named `traefik-public` (or update `TRAEFIK_NETWORK` in `.env`)
2. **Entry Points**: `websecure` (port 443)
3. **Certificate Resolver**: `letsencrypt` configured

Example Traefik `docker-compose.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./letsencrypt:/letsencrypt
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

## Database Backup

### Manual Backup

```bash
docker-compose exec postgres pg_dump -U devocional_user devocional_quest > backup.sql
```

### Restore from Backup

```bash
docker-compose exec -T postgres psql -U devocional_user devocional_quest < backup.sql
```

### Automated Backups

Consider using a cron job or a backup container like `postgres-backup-s3`.

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs -f

# App only
docker-compose logs -f app

# Database only
docker-compose logs -f postgres
```

### Health Check

The app includes a health check endpoint:

```bash
curl https://your-domain.com/health
```

## Updating the Application

### 1. Pull Latest Changes

```bash
git pull origin main
```

### 2. Rebuild and Restart

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### 3. Run Migrations (if needed)

```bash
docker-compose exec app pnpm db:push
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs app
```

Common issues:
- Missing environment variables
- Database connection failure
- Port conflicts

### Database Connection Error

Verify:
1. PostgreSQL container is running: `docker-compose ps`
2. Database credentials in `.env` are correct
3. `DATABASE_URL` matches the credentials

### Traefik Not Routing

Check:
1. Traefik network exists: `docker network ls`
2. Domain DNS is pointing to your server
3. Traefik labels are correct in `docker-compose.yml`
4. Traefik dashboard shows the routes

### SSL Certificate Issues

Ensure:
1. Port 80 and 443 are open
2. Domain is correctly pointed to your server
3. Let's Encrypt rate limits haven't been exceeded

## Security Recommendations

1. **Use Strong Passwords**: Generate secure passwords for `DB_PASSWORD` and `JWT_SECRET`
2. **Firewall**: Only expose ports 80 and 443 to the internet
3. **Regular Updates**: Keep Docker images and dependencies updated
4. **Backups**: Implement automated database backups
5. **Monitoring**: Set up monitoring and alerting (e.g., Uptime Kuma, Prometheus)

## Performance Optimization

1. **Database Indexing**: Already configured in schema
2. **Connection Pooling**: Configured in Drizzle ORM
3. **Caching**: Consider adding Redis for session caching
4. **CDN**: Use a CDN for static assets

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review environment variables
- Verify Traefik configuration
- Check database connectivity

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Portainer Documentation](https://docs.portainer.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
