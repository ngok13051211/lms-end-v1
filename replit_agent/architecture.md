# Architecture Overview

## Overview

This repository contains a full-stack web application for a tutoring platform called "HomiTutor" that facilitates connections between students and tutors. The application is built using a modern tech stack with React on the frontend and Express.js on the backend, following a monorepo structure. The platform includes features such as user authentication, tutor profiles, booking management, messaging between users, and payment processing.

## System Architecture

The application follows a client-server architecture with a clear separation between the frontend and backend components, while sharing some common types and schemas through a shared directory.

### High-Level Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│                     │      │                     │      │                     │
│   React Frontend    │◄────►│   Express Backend   │◄────►│  PostgreSQL (Neon)  │
│   (Vite + React)    │      │                     │      │                     │
│                     │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
                                      │
                                      │
                                      ▼
                             ┌─────────────────────┐
                             │                     │
                             │   Cloudinary CDN    │
                             │   (File Storage)    │
                             │                     │
                             └─────────────────────┘
```

### Directory Structure

The application follows a monorepo approach with the following high-level structure:

- `/client`: React frontend code
- `/server`: Express.js backend code
- `/shared`: Shared types, schemas, and utilities
- `/db`: Database connection and migration utilities

## Key Components

### Frontend Architecture

The frontend is built with React using Vite as the build tool. It utilizes a modern stack with the following key technologies:

1. **State Management**:
   - Redux Toolkit for global state management
   - React Query for server state management and API calls

2. **Routing**:
   - Wouter for lightweight client-side routing

3. **UI Components**:
   - ShadCN UI (based on Radix UI) for accessible component primitives
   - Tailwind CSS for styling

4. **Form Handling**:
   - React Hook Form with Zod for form validation

The frontend follows a feature-based organization with these key directories:

- `/client/src/components`: Reusable UI components
- `/client/src/pages`: Page components corresponding to routes
- `/client/src/features`: Redux slices organized by feature
- `/client/src/hooks`: Custom React hooks
- `/client/src/lib`: Utility functions and configurations

### Backend Architecture

The backend is built with Express.js and follows a controller-service pattern:

1. **API Structure**:
   - RESTful API design
   - Versioned API endpoints (v1)
   - Controllers organized by domain

2. **Authentication**:
   - JWT-based authentication
   - Role-based authorization (student, tutor, admin)

3. **File Handling**:
   - Multer for handling file uploads
   - Cloudinary for cloud storage of user avatars and other media

The backend follows this organization:

- `/server/controllers`: Request handlers organized by domain
- `/server/middlewares`: Express middlewares for auth, validation, etc.
- `/server/services`: Business logic separated from controllers
- `/server/config`: Configuration for external services

### Database Architecture

The application uses a PostgreSQL database (specifically Neon Database's serverless PostgreSQL) with Drizzle ORM for database access:

1. **Schema Design**:
   - Strongly typed schema using Drizzle ORM
   - Zod validation integrated with Drizzle
   - Relations defined for entity relationships

2. **Key Entities**:
   - Users (students, tutors, admins)
   - Tutor profiles
   - Subjects and education levels
   - Bookings and payments
   - Conversations and messages

The database-related code is organized in:

- `/shared/schema.ts`: Database schema definitions
- `/db/index.ts`: Database connection setup
- `/db/migrations`: Schema migrations
- `/db/seed.ts`: Seed data for development

## Data Flow

### Authentication Flow

1. User registers/logs in through the frontend
2. Backend validates credentials and issues a JWT token
3. Token is stored in localStorage and included in subsequent API requests
4. Protected routes check token validity using the `authMiddleware`

### Tutor-Student Interaction Flow

1. Students browse tutor listings and profiles
2. Students can message tutors or book sessions directly
3. Tutors can accept or decline booking requests
4. Payment processing occurs through integrated payment system
5. After sessions, students can leave reviews for tutors

### File Upload Flow

1. User selects a file (e.g., avatar image) 
2. File is temporarily stored on the server using Multer
3. File is then uploaded to Cloudinary
4. Cloudinary URL is stored in the database and returned to the client

## External Dependencies

### Cloud Services

1. **Neon Database**: Serverless PostgreSQL database
   - Used for storing all application data
   - Connected through `@neondatabase/serverless` library

2. **Cloudinary**: Media storage and CDN
   - Used for storing user avatars and other uploads
   - Configured in `/server/config/cloudinary.ts`

### Key Libraries

1. **Frontend**:
   - React and React DOM (UI library)
   - Redux Toolkit (state management)
   - TanStack Query (data fetching)
   - Tailwind CSS (styling)
   - ShadCN UI + Radix UI (component library)
   - Zod (validation)
   - React Hook Form (form handling)

2. **Backend**:
   - Express (web framework)
   - Drizzle ORM (database access)
   - Multer (file upload handling)
   - JWT (authentication)
   - bcrypt (password hashing)
   - CORS (cross-origin resource sharing)

## Deployment Strategy

The application is configured for deployment on Replit, as evidenced by the `.replit` configuration file. The deployment setup includes:

1. **Build Process**:
   - Frontend: Vite builds static assets to `dist/public`
   - Backend: ESBuild bundles the server code to `dist/index.js`
   - Combined build command: `npm run build`

2. **Runtime Environment**:
   - Node.js 20
   - PostgreSQL 16
   - Environment variables for database connection and other configurations

3. **Startup Command**:
   - Production: `NODE_ENV=production node dist/index.js`
   - Development: `tsx server/index.ts`

4. **Port Configuration**:
   - Local port: 5000
   - External port: 80

The application uses a single-server deployment model where the Express backend serves both the API endpoints and the static frontend assets. This simplifies deployment while maintaining a clear separation of concerns in the codebase.