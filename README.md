# JANO

Museo digital curado + herramienta académica premium.

JANO es una plataforma híbrida entre:

- Un museo digital curado (contenido 100% seleccionado manualmente)
- Una herramienta académica tipo Wikipedia + Genius
- Un sistema de visualización relacional tipo Obsidian Graph View

La idea central es estudiar el arte a través de sus conexiones.

---

# 🏗 Estado actual (MVP funcional)

✔ Base de datos PostgreSQL  
✔ Prisma 7 configurado  
✔ Migraciones funcionando  
✔ Seed inicial  
✔ Backend NestJS con endpoints REST  
✔ Frontend Angular (standalone + SSR ready)  
✔ Vista split (obra / información)  
✔ Relaciones bidireccionales (incoming + outgoing)  
✔ Vista de grafo (layout circular básico)  
✔ Navegación entre entidades desde el grafo  

---

# 📂 Estructura del proyecto

```
Jano/
│
├── backend/
│   └── api/          → NestJS + Prisma + PostgreSQL
│
└── frontend/         → Angular standalone app
```

---

# 🧠 Concepto técnico

Cada entidad puede ser:

- ARTWORK
- CONCEPT
- PERSON
- MOVEMENT
- etc.

Las entidades se conectan mediante relaciones tipadas.

Ejemplo:

```
Obra demo -- EXPLORES --> Tiempo
```

El sistema permite:

- Ver relaciones salientes
- Ver relaciones entrantes
- Visualizar conexiones en grafo
- Navegar entre entidades conectadas

---

# 🗄 Base de datos

Tecnologías:

- PostgreSQL
- Prisma 7

Tablas principales:

- Entity
- Relation

---

# 🚀 Cómo correr el proyecto

---

## 1️⃣ Backend

Ir a:

```
cd backend/api
```

Instalar dependencias:

```
npm install
```

Asegurarse de tener PostgreSQL corriendo.

Ejecutar migraciones:

```
npx prisma migrate dev
```

Ejecutar seed:

```
npx prisma db seed
```

Levantar servidor:

```
npm run start:dev
```

Backend corre en:

```
http://localhost:3000
```

Probar:

```
http://localhost:3000/entities
```

---

## 2️⃣ Frontend

Ir a:

```
cd frontend
```

Instalar dependencias:

```
npm install
```

Levantar servidor:

```
npm start
```

Frontend corre en:

```
http://localhost:4200
```

---

# 🌐 Endpoints principales

```
GET /entities
GET /entities/:slug
GET /entities/:slug/graph
```

---

# 🖥 UI

## Home

Lista todas las entidades.

## Entity view

Layout split:

LEFT → imagen (obra o placeholder)  
RIGHT → información, relaciones, grafo  

Incluye:

- Relaciones salientes
- Relaciones entrantes
- Botón para visualizar grafo

## Graph View

- Nodo central
- Relaciones circulares
- Click en nodo navega a la entidad
- Layout SVG básico (circular)

---

# 🔬 Qué falta por implementar

- Panel Curator (CRUD desde UI)
- Mejor layout de grafo (force-directed real)
- Estilos visuales más refinados
- Filtros por tipo
- Autocomplete de búsqueda
- Paginación
- Sistema de autenticación (curadores)
- Mejor sistema de imágenes para CONCEPT

---

# 🧩 Stack tecnológico

Backend:
- NestJS
- Prisma 7
- PostgreSQL

Frontend:
- Angular (standalone components)
- RxJS
- Control flow moderno (@if, @for)
- Signals
- SVG para visualización de grafo

---

# ⚙ Requisitos

- Node 18+
- PostgreSQL local
- npm

---

# 📈 Próxima iteración

1. Curator Panel
2. Edición de relaciones desde UI
3. Mejor algoritmo de grafo
4. Preparar despliegue (Docker + producción)

---

# 🎯 Visión

JANO no es solo un catálogo.

Es una red de pensamiento visual.
Un sistema de conexiones culturales.
Una herramienta para estudiar el arte desde la relación, no desde la lista.