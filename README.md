# TalentBoard — Backend API

A production-grade REST API for a full-stack job board application. Built with Node.js, Express, and TypeScript, containerized with Docker, and deployed to AWS EC2 with a fully automated CI/CD pipeline.

## Live Demo

Frontend: [https://thetalentboard.vercel.app](https://thetalentboard.vercel.app)
API Base URL: [https://52-87-172-34.sslip.io](https://52-87-172-34.sslip.io)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| ORM | Prisma 5 |
| Database | PostgreSQL (AWS RDS) |
| File Storage | AWS S3 |
| Containerization | Docker |
| Web Server | Nginx (reverse proxy + SSL) |
| SSL | Let's Encrypt (via Certbot) |
| Deployment | AWS EC2 (Ubuntu 24.04) |
| CI/CD | GitHub Actions |

## Architecture

```
React Frontend (Vercel)
        ↓ HTTPS
Nginx (reverse proxy + SSL termination)
        ↓
Express API (Docker container, port 4000)
        ↓
PostgreSQL (AWS RDS)    AWS S3 (resume uploads)
```

## Features

- User registration and login with bcrypt password hashing
- JWT authentication with protected routes
- Job listings — create and browse
- Job applications with optional resume upload to S3
- Middleware-based auth protecting write endpoints
- Dockerized for consistent local and production environments
- Automated deployment via GitHub Actions on every push to main

## API Endpoints

### Auth
```
POST /register    Create a new user account
POST /login       Authenticate and receive a JWT token
```

### Jobs
```
GET  /jobs        List all job postings (public)
POST /jobs        Create a new job posting (authenticated)
```

### Applications
```
POST /applications    Apply to a job with optional resume upload (authenticated)
GET  /applications    Get current user's applications (authenticated)
```

## Local Development

**Prerequisites:** Node.js 20+, PostgreSQL, Docker (optional)

```bash
# Clone the repo
git clone https://github.com/sadeepabandara/talentboard-backend.git
cd talentboard-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Generate Prisma client
npx prisma generate

# Run locally
npm run dev
```

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/jobboard
JWT_SECRET=your_secret_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket
```

## Docker

```bash
# Build the image
docker build -t talentboard-backend .

# Run the container
docker run -d -p 4000:4000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  --name talentboard \
  talentboard-backend
```

## CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow that:

1. Builds a Docker image
2. Pushes it to Docker Hub
3. SSHs into the EC2 instance
4. Pulls the new image and restarts the container

Zero manual deployment steps required.

## Database Schema

```
users
  id, name, email, password_hash, created_at

jobs
  id, title, description, company, user_id → users, created_at

applications
  id, job_id → jobs, user_id → users, resume_url, status, applied_at
```
