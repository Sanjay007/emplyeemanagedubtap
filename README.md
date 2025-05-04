# OrgManager - Employee Management System

A role-based employee management application with advanced organizational capabilities, designed to streamline workforce administration and user interactions. The application includes enhanced visit reporting functionality and verification report management to support comprehensive organizational tracking and management.

## Features

- Role-based access control (Admin, Manager, BDM, BDE)
- Employee management
- Hierarchical organization view
- Attendance tracking
- Visit reports
- Sales reports
- Verification reports
- Product management
- Employee document management

## Tech Stack

- React frontend with shadcn/ui components
- TypeScript for type-safe development
- Express server for API
- PostgreSQL database with Drizzle ORM
- Docker for containerization

## Deploying with Docker Compose

### Prerequisites

- Docker and Docker Compose installed on your system
- Git to clone the repository

### Steps to Deploy

1. Clone the repository
   ```
   git clone <repository-url>
   cd orgmanager
   ```

2. Configure environment variables (optional)
   
   The application comes with default environment variables in the `.env` file. You can modify these as needed:
   ```
   # PostgreSQL configuration
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=orgmanager
   
   # Node environment
   NODE_ENV=production
   ```

3. Build and start the application
   ```
   docker-compose up -d
   ```

   This will:
   - Build the application container
   - Set up a PostgreSQL database container
   - Run database migrations
   - Start the application

4. Access the application
   
   The application will be available at http://localhost:5000

### Stopping the Application

To stop the application:
```
docker-compose down
```

To stop and remove volumes (this will delete all data):
```
docker-compose down -v
```

## Database Management

The application uses Drizzle ORM for database management. The database schema is automatically applied when the application starts.

### Manual Database Operations

To access the PostgreSQL database directly:

```
docker-compose exec db psql -U postgres -d orgmanager
```

## Troubleshooting

- If the application fails to connect to the database, check if the database container is running:
  ```
  docker-compose ps
  ```

- To view application logs:
  ```
  docker-compose logs app
  ```

- To view database logs:
  ```
  docker-compose logs db
  ```