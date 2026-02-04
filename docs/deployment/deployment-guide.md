# Deployment Guide

This guide covers deployment paths for GovBid Pro using Docker Compose or Kubernetes.

## Docker Compose (Recommended for Staging)

1. Ensure Docker and Compose are installed.
2. Copy environment variables into `.env` files.
3. Launch the stack:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

4. Verify services:

```bash
curl http://localhost:3000/api/health
```

## Kubernetes (Production)

1. Build and push Docker images for frontend, backend, and services.
2. Update image references in `infrastructure/kubernetes/deployment.yaml`.
3. Apply manifests:

```bash
kubectl apply -f infrastructure/kubernetes/deployment.yaml
```

4. Validate pod status:

```bash
kubectl get pods -n govbid
```

## Database Migrations

Run migrations from the backend service:

```bash
pnpm --filter backend prisma migrate deploy
```

## Zero-Downtime Tips

- Use rolling updates for the API and web UI.
- Migrate databases before switching traffic.
- Warm up caches with read-only traffic.

## Observability Checklist

- Confirm `/api/health` and `/metrics` endpoints.
- Validate log aggregation.
- Configure alerting for error spikes.
