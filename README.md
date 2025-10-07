# RFP Analysis Application

This application is structured as a monorepo with separate client and server directories.

## Project Structure

```
├── client/          # Frontend React application
│   ├── src/         # React source code
│   ├── public/      # Static assets
│   ├── package.json # Frontend dependencies
│   └── Dockerfile   # Frontend container config
├── server/          # Backend Node.js API
│   ├── routes/      # API routes
│   ├── models/      # Database models
│   ├── services/    # Business logic
│   ├── package.json # Backend dependencies
│   └── Dockerfile   # Backend container config
├── docker-compose.yml      # Development environment
├── docker-compose.prod.yml # Production environment
└── nginx.conf             # Nginx configuration
```

## Development

### Running with Docker Compose
```bash
# Development environment
docker-compose up

# Production environment
docker-compose -f docker-compose.prod.yml up
```

### Running Locally

#### Client
```bash
cd client
npm install
npm run dev
```

#### Server
```bash
cd server
npm install
npm start
```

## Environment Variables

- Copy `.env.example` to `.env` in both client and server directories
- Update the values according to your environment

## Docker

Each service (client/server) has its own Dockerfile for containerization. The Docker Compose files orchestrate the full application stack including the database.