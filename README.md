
---

# JANO

Digital curated museum + academic relational exploration platform.

JANO is a hybrid platform between:

* A manually curated digital museum
* An academic knowledge tool (Wikipedia × Genius)
* A relational visualization system inspired by Obsidian Graph View

The core idea: **study art through its connections.**

---

# 🏗 Current Status (Functional MVP)

* PostgreSQL database configured
* Prisma 7 ORM integrated
* Migrations working
* Initial seed implemented
* NestJS REST API
* Angular standalone frontend (SSR-ready architecture)
* Split entity layout (image + information panel)
* Bidirectional relationships (incoming / outgoing)
* Basic circular graph visualization (SVG)
* Graph-driven entity navigation

---

# 🧠 Concept

Each node in the system is an **Entity**.

An entity can represent:

* ARTWORK
* CONCEPT
* PERSON
* MOVEMENT
* etc.

Entities are connected through typed relationships.

Example:

```
Artwork A -- EXPLORES --> Concept B
```

The system allows:

* Viewing outgoing relations
* Viewing incoming relations
* Graph visualization of connections
* Navigation between related entities

---

# 🏛 Architecture Overview

```
Jano/
│
├── backend/
│   └── api/          → NestJS + Prisma + PostgreSQL
│
├── frontend/         → Angular (standalone + SSR-ready)
│
└── infra/            → Docker compose (database + services)
```

---

# 🗄 Database Layer

### Stack

* PostgreSQL
* Prisma 7

### Core Tables

* `Entity`
* `Relation`

The data model is relational and connection-driven.

Each relation stores:

* source entity
* target entity
* relation type
* metadata

---

# 🚀 Running the Project

You can run it either:

* Locally (Node + local PostgreSQL)
* Or via Docker (recommended for clean setup)

---

# 🐳 — Docker 

From project root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Make sure Docker Desktop is running or Docker is runnig on your device.

This will start:

* PostgreSQL
* Adminer (if configured)

---

# 💻  — Local Development

## 1️⃣ Backend

Navigate to:

```bash
cd backend/api
```

Install dependencies:

```bash
npm install
```

Make sure your `.env` contains:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/jano?schema=public
```

Run migrations:

```bash
npx prisma migrate dev
```

Generate Prisma client (important):

```bash
npx prisma generate
```

Seed database:

```bash
npx prisma db seed
```

Start NestJS in dev mode:

```bash
npm run start:dev
```

Backend runs on:

```
http://localhost:3000
```

Test:

```
http://localhost:3000/entities
```

If database is empty, this endpoint returns:

```
[]
```

---

## 2️⃣ Frontend

Navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Angular:

```bash
npm start
```

Frontend runs on:

```
http://localhost:4200
```

---

# 🌐 API Endpoints

```
GET /entities
GET /entities/:slug
GET /entities/:slug/graph
```

---

# 🖥 UI Overview

## Home

Displays all entities.

## Entity View

Split layout:

LEFT → Artwork image or placeholder
RIGHT → Metadata + relationships

Includes:

* Outgoing relations
* Incoming relations
* Graph visualization toggle

## Graph View

* Central node
* Circular layout
* SVG-based rendering
* Click on node navigates to entity
* Bidirectional relationship support

---

# 🧩 Tech Stack

## Backend

* NestJS
* Prisma 7
* PostgreSQL
* TypeScript

## Frontend

* Angular (Standalone Architecture)
* Signals
* Modern Control Flow (`@if`, `@for`)
* RxJS
* SVG rendering for graph

## Infra

* Docker
* Docker Compose

---

# ⚙ Requirements

* Node 18+
* PostgreSQL (if running locally)
* Docker (recommended)
* npm

---

# 🔬 Roadmap (Next Iteration)

* Curator Panel (Admin CRUD UI)
* Authentication system
* Advanced graph algorithm (force-directed layout)
* Filtering by entity type
* Search + autocomplete
* Pagination
* Improved visual identity
* Image storage strategy
* Production Docker setup

---

# 🎯 Vision

JANO is not a list-based catalog.

It is a **relational knowledge system**.

A visual network of cultural thought.

An academic-grade exploration tool built with modern web architecture.

---

# 📌 Notes for Developers

* After changing `schema.prisma`, always run:

```bash
npx prisma migrate dev
npx prisma generate
```

* If Prisma client errors occur, try:

```bash
rm -rf node_modules
npm install
npx prisma generate
```

* If `/entities` returns `[]`, database is empty.

---

---


# 🗄 Database Inspection & Management

During development, you can inspect and manage the database using the following tools.

---

## 🥇 Prisma Studio (Recommended)

Prisma Studio provides a visual interface to explore and edit your database.

From the backend folder:

```bash
cd backend/api
npx prisma studio
```

This will open:

```
http://localhost:5555
```

With Prisma Studio you can:

* View all tables
* Create, edit, and delete records
* Filter and search data
* Inspect relationships

This is especially useful before implementing the Curator Panel UI.

---

## 🥈 Adminer (If using Docker)

If the Docker stack includes Adminer, it is typically available at:

```
http://localhost:8080
```

Connection settings:

* System: PostgreSQL
* Server: `db` (if using Docker network) or `localhost`
* Username: defined in docker-compose
* Password: defined in docker-compose
* Database: `jano`

Adminer provides a more traditional SQL-based interface.

---

## 🥉 PostgreSQL CLI (Advanced)

You can also connect directly via terminal.

If using Docker:

```bash
docker exec -it <db_container_name> psql -U postgres -d jano
```

If using local PostgreSQL:

```bash
psql -U postgres -d jano
```

Common commands:

```sql
\dt
SELECT * FROM "Entity";
SELECT * FROM "Relation";
```

---

## ⚠ Important Notes

* If `/entities` returns `[]`, the database is empty.
* After modifying `schema.prisma`, always run:

```bash
npx prisma migrate dev
npx prisma generate
```

* If Prisma Client errors occur, regenerate it:

```bash
npx prisma generate
```

---

Perfect 👌 here’s a **clean, professional Data Flow & Architecture Diagram section** you can append to your README.

---

# 🔄 Data Flow & Architecture

JANO follows a layered architecture with a clear separation of concerns between frontend, backend, and database.

---

## 🧩 High-Level Architecture

```
Browser (Angular Frontend)
        │
        │ HTTP (REST)
        ▼
NestJS API (Backend)
        │
        │ Prisma ORM
        ▼
PostgreSQL Database
```

---

## 📡 Request Flow Example

### Example: `GET /entities`

1. User navigates to the Home page.
2. Angular sends an HTTP request:

```
GET http://localhost:3000/entities
```

3. NestJS:

   * Receives request in `EntitiesController`
   * Calls `EntitiesService`
   * Uses `PrismaService`
4. Prisma executes a SQL query against PostgreSQL.
5. Database returns rows.
6. NestJS serializes the response.
7. Angular renders the list of entities.

---

## 🧠 Graph View Data Flow

When visiting:

```
GET /entities/:slug/graph
```

The backend:

* Fetches the central entity
* Retrieves outgoing relations
* Retrieves incoming relations
* Returns a structured graph payload

Frontend:

* Parses graph response
* Renders SVG nodes
* Calculates circular layout
* Enables navigation on node click

---

## 🗄 Backend Layer Responsibilities

### Controller Layer

Handles routing and HTTP interface.

### Service Layer

Contains business logic and orchestration.

### Prisma Layer

Responsible for database access and query execution.

---

## 🎨 Frontend Layer Responsibilities

### UI Layer

* Rendering components
* Layout logic
* Graph visualization (SVG)

### Data Layer

* HTTP requests via Angular services
* State management (Signals / RxJS)
* Entity navigation

---

## 📦 Separation of Concerns

| Layer      | Responsibility       |
| ---------- | -------------------- |
| Angular    | UI & interaction     |
| NestJS     | API & business logic |
| Prisma     | Database abstraction |
| PostgreSQL | Data persistence     |

---

## 🚀 Scalability Considerations

The architecture allows:

* Replacing REST with GraphQL (future)
* Adding authentication layer
* Deploying backend independently
* Moving database to managed cloud provider
* Scaling graph algorithm independently

---

## 🔮 Future Architectural Evolution

* Authentication & authorization (curator roles)
* Caching layer (Redis)
* Graph algorithm optimization
* Image storage abstraction (S3 or similar)
* Docker production orchestration

---

