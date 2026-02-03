# Montor – Task & Project Manager

Node.js + React app with MongoDB. **Admin** creates users and assigns projects; **users** add tasks with status, due date, and time spent.

## Features

- **Login**: Admin and User roles (JWT).
- **Admin**: Create users, view any user’s data (tasks + assigned projects), create projects, assign users to projects. Projects have multiple activities/tasks.
- **User**: Add tasks (title, status, due date, time spent), link tasks to assigned projects. View assigned projects and add activities per project (component-style tasks).

## Setup

### 1. Backend (server)

```bash
cd server
cp .env.example .env
# Edit .env: MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DATABASENAME_without_space_without_specialchar, JWT_SECRET
npm install
npm run seed:admin   # Creates first admin (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env)
npm run dev         # http://localhost:5000
```

### 2. Frontend (client)

```bash
cd client
npm install
npm run dev         # http://localhost:3000, proxies /api to backend
```

### 3. First login

- Use the admin credentials from `.env` (e.g. `admin@montor.local` / `admin123`).
- Then create users and projects from the Admin UI.

## MongoDB

Connection string format (already used in `server/config/db.js`):

```
mongodb+srv://<MONGODB_USERNAME>:<MONGODB_PASSWORD>@cluster0.dt9hl.mongodb.net/<MONGODB_DATABASENAME_without_space_without_specialchar>?retryWrites=true&w=majority
```

Database name must be **without spaces and without special characters**.

## Project structure

- **server**: Express, Mongoose (User, Project, Task), JWT auth, `/api/auth`, `/api/users`, `/api/projects`, `/api/tasks`.
- **client**: React (Vite), React Router, auth context, Admin (users, projects, user detail) and User (tasks, projects, project activities) pages.
