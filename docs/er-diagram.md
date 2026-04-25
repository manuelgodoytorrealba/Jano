# Diagrama Entidad-Relacion

## Vision general

`Jano` es una plataforma de conocimiento sobre arte. El modelo de datos combina tres capas:

- una capa editorial centrada en `Entity`
- una capa de grafo semantico entre entidades mediante `Relation`
- una capa de usuario con guardados y colecciones

La tabla central es `Entity`. Representa obras, artistas, conceptos, movimientos, periodos, textos y lugares. A partir de ahi se cuelgan medios, fuentes, notas internas, detalles tipados y relaciones de usuario.

## Entidades principales

### `Entity`

Nucleo del dominio.

- `id`
- `type`: `ARTWORK`, `ARTIST`, `CONCEPT`, `MOVEMENT`, `PERIOD`, `TEXT`, `PLACE`
- `title`
- `slug`
- `summary`
- `content`
- `contentLevel`
- `status`
- `startYear`, `endYear`

### `Relation`

Relacion dirigida entre dos filas de `Entity`.

- `fromId` -> entidad origen
- `toId` -> entidad destino
- `type` -> tipo semantico de la relacion, por ejemplo `CREATED_BY`
- `weight`
- `justification`

Sirve para modelar el grafo de conocimiento. Una obra puede apuntar a un artista, un movimiento, un concepto o un periodo.

### `Media` y `EntityMedia`

`Media` almacena el recurso multimedia. `EntityMedia` resuelve la relacion N:M con `Entity` y añade metadatos de presentacion.

En `Media` destacan:

- `url`
- `originType`
- `provider`
- `qualityTier`
- `storageKey`
- `mimeType`
- `width`, `height`
- `derivedFromMediaId`

En `EntityMedia` destacan:

- `entityId`
- `mediaId`
- `role`
- `sortOrder`
- `isPrimary`
- `displayMode`
- `focalX`, `focalY`

### `Source` y `SourceRef`

`Source` representa una fuente bibliografica o documental. `SourceRef` vincula una fuente con una entidad concreta y permite guardar la cita localizada.

En `Source`:

- `type`: `BOOK`, `ARTICLE`, `WEBSITE`, `CATALOG`, `PAPER`
- `author`
- `title`
- `publisher`
- `year`
- `url`

En `SourceRef`:

- `entityId`
- `sourceId`
- `page`
- `quote`
- `note`

### `CuratorNote` y `Contributor`

Son tablas 1:N desde `Entity`.

- `CuratorNote` guarda notas internas editoriales.
- `Contributor` guarda personas colaboradoras y su rol respecto a la entidad.

### Detalles tipados 1:1

Amplian `Entity` solo cuando aplica el tipo:

- `ArtworkDetails`
- `ArtistDetails`
- `ConceptDetails`
- `PeriodDetails`

Cada una usa `entityId` como PK y FK al mismo tiempo.

### `User`, `SavedEntity`, `Collection`, `CollectionEntity`

Cubren la parte de usuario:

- `User` representa cuentas autenticadas
- `SavedEntity` es favoritos, N:M entre `User` y `Entity`
- `Collection` es una coleccion creada por un usuario
- `CollectionEntity` es la tabla puente N:M entre `Collection` y `Entity`

## Cardinalidades clave

- `Entity` 1:N `Relation` como origen
- `Entity` 1:N `Relation` como destino
- `Entity` N:M `Media` a traves de `EntityMedia`
- `Entity` N:M `Source` a traves de `SourceRef`
- `Entity` 1:N `CuratorNote`
- `Entity` 1:N `Contributor`
- `Entity` 0..1:1 `ArtworkDetails`
- `Entity` 0..1:1 `ArtistDetails`
- `Entity` 0..1:1 `ConceptDetails`
- `Entity` 0..1:1 `PeriodDetails`
- `User` N:M `Entity` a traves de `SavedEntity`
- `User` 1:N `Collection`
- `Collection` N:M `Entity` a traves de `CollectionEntity`
- `Media` 0..N:1 `Media` por `derivedFromMediaId`

## Lectura funcional del modelo

- `Entity` resuelve el catalogo principal y el contenido editorial.
- `Relation` convierte ese catalogo en un grafo navegable de conocimiento artistico.
- `Media` y `EntityMedia` separan el asset de su uso visual en cada entidad.
- `Source` y `SourceRef` soportan trazabilidad academica y citas.
- `User`, `SavedEntity` y `Collection` anaden personalizacion sin contaminar el nucleo editorial.

## Diagrama Mermaid

```mermaid
erDiagram
  Entity {
    string id PK
    string type
    string title
    string slug UK
    string summary
    string content
    string contentLevel
    string status
    int startYear
    int endYear
  }

  Relation {
    string id PK
    string fromId FK
    string toId FK
    string type
    float weight
    string justification
  }

  Media {
    string id PK
    string url
    string originType
    string provider
    string qualityTier
    string derivedFromMediaId FK
    string storageKey
    string mimeType
    int width
    int height
  }

  EntityMedia {
    string id PK
    string entityId FK
    string mediaId FK
    string role
    int sortOrder
    boolean isPrimary
    string displayMode
  }

  Source {
    string id PK
    string type
    string author
    string title
    string publisher
    int year
    string url
  }

  SourceRef {
    string id PK
    string entityId FK
    string sourceId FK
    string page
    string quote
    string note
  }

  CuratorNote {
    string id PK
    string entityId FK
    string body
    string role
    string note
  }

  ArtworkDetails {
    string entityId PK,FK
    string authorNation
    string technique
    string materials
    string dimensions
    string location
    string collection
    string state
  }

  ArtistDetails {
    string entityId PK,FK
    string country
    string city
    int birthYear
    int deathYear
    string disciplines
    string bioShort
    string links
  }

  ConceptDetails {
    string entityId PK,FK
    string definition
  }

  PeriodDetails {
    string entityId PK,FK
    string definition
  }

  User {
    string id PK
    string email UK
    string passwordHash
    string name
    string role
    string plan
  }

  SavedEntity {
    string id PK
    string userId FK
    string entityId FK
  }

  Collection {
    string id PK
    string userId FK
    string name
    string description
    boolean isDefault
  }

  CollectionEntity {
    string id PK
    string collectionId FK
    string entityId FK
  }

  Entity ||--o{ Relation : "from"
  Entity ||--o{ Relation : "to"

  Entity ||--o{ EntityMedia : "has"
  Media ||--o{ EntityMedia : "used_in"
  Media o|--o{ Media : "derived_from"

  Entity ||--o{ SourceRef : "documented_by"
  Source ||--o{ SourceRef : "referenced_in"

  Entity ||--o{ CuratorNote : "has"
  Entity ||--o{ Contributor : "has"

  Entity ||--o| ArtworkDetails : "details"
  Entity ||--o| ArtistDetails : "details"
  Entity ||--o| ConceptDetails : "details"
  Entity ||--o| PeriodDetails : "details"

  User ||--o{ SavedEntity : "saves"
  Entity ||--o{ SavedEntity : "saved_by"

  User ||--o{ Collection : "owns"
  Collection ||--o{ CollectionEntity : "contains"
  Entity ||--o{ CollectionEntity : "included_in"
```  }

  Contributor {
    string id PK
    string entityId FK
    string name
    string role
    string note
  }

  ArtworkDetails {
    string entityId PK,FK
    string authorNation
    string technique
    string materials
    string dimensions
    string location
    string collection
    string state
  }

  ArtistDetails {
    string entityId PK,FK
    string country
    string city
    int birthYear
    int deathYear
    string disciplines
    string bioShort
    string links
  }

  ConceptDetails {
    string entityId PK,FK
    string definition
  }

  PeriodDetails {
    string entityId PK,FK
    string definition
  }

  User {
    string id PK
    string email UK
    string passwordHash
    string name
    string role
    string plan
  }

  SavedEntity {
    string id PK
    string userId FK
    string entityId FK
  }

  Collection {
    string id PK
    string userId FK
    string name
    string description
    boolean isDefault
  }

  CollectionEntity {
    string id PK
    string collectionId FK
    string entityId FK
  }

  Entity ||--o{ Relation : "from"
  Entity ||--o{ Relation : "to"

  Entity ||--o{ EntityMedia : "has"
  Media ||--o{ EntityMedia : "used_in"
  Media o|--o{ Media : "derived_from"

  Entity ||--o{ SourceRef : "documented_by"
  Source ||--o{ SourceRef : "referenced_in"

  Entity ||--o{ CuratorNote : "has"
  Entity ||--o{ Contributor : "has"

  Entity ||--o| ArtworkDetails : "details"
  Entity ||--o| ArtistDetails : "details"
  Entity ||--o| ConceptDetails : "details"
  Entity ||--o| PeriodDetails : "details"

  User ||--o{ SavedEntity : "saves"
  Entity ||--o{ SavedEntity : "saved_by"

  User ||--o{ Collection : "owns"
  Collection ||--o{ CollectionEntity : "contains"
  Entity ||--o{ CollectionEntity : "included_in"
```

## Nota de modelado

El modelo real mezcla enfoque relacional y enfoque de grafo:

- relacional para persistencia, integridad y consultas CRUD
- de grafo para expresar relaciones semanticas entre entidades culturales

Por eso `Entity` y `Relation` son el corazon conceptual del sistema, mientras el resto de tablas actuan como extensiones editoriales, multimedia y de usuario.
