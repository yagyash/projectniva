# Villa Niva – Rooted Heaven (Full Stack + K8s)

This repository contains:
- **backend/**: Node.js + Express + MongoDB API
- **frontend/**: Next.js + Tailwind landing page with booking calendar
- **k8s/**: Kubernetes manifests for MongoDB, API, and frontend with NGINX Ingress

## Local Development

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
# API on http://localhost:5000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# Web on http://localhost:3000
```

## Docker Build

```bash
# Backend
docker build -t yourrepo/villa-niva-backend:latest backend
# Frontend
docker build -t yourrepo/villa-niva-frontend:latest frontend
```

## Kubernetes Deploy

1. Push both images to your registry (update image names in manifests).
2. Apply manifests:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-mongo.yaml
kubectl apply -f k8s/20-backend.yaml
kubectl apply -f k8s/30-frontend-and-ingress.yaml
```
3. Point DNS or `/etc/hosts` to your ingress controller IP:
```
127.0.0.1 villa.local
```
4. Open:
- Frontend: http://villa.local
- API health: http://villa.local/api/health

## Notes
- Frontend calls API through `/api` path (Ingress routes to backend).
- Update **ConfigMap** values for MongoDB/Frontend URL if you use Atlas or different domains.
- Seed DB: `kubectl exec -it deploy/villa-backend -n villa-niva -- node scripts/seed.js`