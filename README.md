# BookFlix API 📚

API GraphQL de bibliothèque numérique permettant de gérer une collection personnelle de livres, avec recherche via Google Books, système de reviews et gestion de profils utilisateurs.

---

## Stack technique

- **Runtime** : Node.js 20+
- **Framework** : NestJS 11 + TypeScript strict
- **API** : GraphQL Code First (@nestjs/graphql + Apollo Server 5)
- **ORM** : Prisma 7 + PostgreSQL 16
- **Auth** : JWT + Passport
- **Compiler** : SWC (dev) + tsc (prod)
- **Tests** : Jest + SWC (219 unitaires + 76 e2e)
- **Sécurité** : Helmet + CORS + Rate Limiting
- **Docker** : API + PostgreSQL + Adminer
- **Déploiement** : Railway

---

## Prérequis

- Node.js >= 20.x
- npm >= 10.x
- Docker + Docker Compose v2

---

## Installation

### 1. Cloner le repository

```bash
git clone https://github.com/<username>/bookflix-api.git
cd bookflix-api
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Édite le `.env` avec tes valeurs :

```env
# App
NODE_ENV=development
PORT=XXXX

# Database
DATABASE_URL="postgresql://bookflix:bookflix_secret@localhost:XXXX/bookflix_db?schema=public"
POSTGRES_USER=bookflix
POSTGRES_PASSWORD=bookflix_secret
POSTGRES_DB=bookflix_db

# Database Test
DATABASE_URL_TEST="postgresql://bookflix_test:bookflix_test_secret@localhost:XXXX/bookflix_test?schema=public"
POSTGRES_USER_TEST=bookflix_test
POSTGRES_PASSWORD_TEST=bookflix_test_secret

# JWT
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=7d

# Google Books API
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
GOOGLE_BOOKS_API_URL=https://www.googleapis.com/books/v1

# Security
FRONTEND_URL=http://localhost:XXXX
THROTTLE_TTL=900000
THROTTLE_LIMIT=100
```

> **Google Books API Key** : obtiens une clé gratuite sur [Google Cloud Console](https://console.cloud.google.com/) en activant l'API "Books API".

---

## Lancer en développement

### 1. Démarrer PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Appliquer les migrations

```bash
npx prisma migrate dev
```

### 3. Générer le client Prisma

```bash
npx prisma generate
```

### 4. Peupler la base de données (optionnel)

```bash
npm run prisma:seed
```

> Le seed insère ~277 livres répartis sur 15 genres via Google Books API.

### 5. Démarrer l'API

```bash
npm run start:dev
```

L'API est disponible sur : `http://localhost:XXXX/graphql`

---

## Lancer avec Docker (production)

```bash
docker compose up --build
```

Services démarrés :
- **API** → `http://localhost:XXXX/graphql`
- **PostgreSQL** → `localhost:XXXX`
- **Adminer** → `http://localhost:XXXX`

---

## Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov

# Tests e2e (nécessite postgres-test sur le port 5433)
docker compose up postgres-test -d
npm run test:e2e
```

### Résultats

| Type | Total | Status |
|---|---|---|
| Unitaires | 219 | ✅ |
| E2E | 76 | ✅ |
| **Total** | **295** | ✅ |

---

## Schéma GraphQL

Le schéma est généré automatiquement au démarrage dans `schema.graphql`.

---

## Fonctionnalités

### Authentification
- Inscription / Connexion avec JWT
- Token valable 7 jours
- Rate limiting : 100 requêtes / 15 minutes par IP

### Livres
- Recherche via Google Books API (mise en cache en DB)
- Recherche avancée par titre, auteur, genre, plage d'années
- Recherche locale dans le cache DB
- Catalogue par genre (15 genres en français)
- Pagination avec metadata (total, totalPages, hasNextPage, hasPreviousPage)
- Note moyenne et nombre de reviews par livre

### Collection personnelle
- Statuts : `TO_READ`, `READING`, `READ`
- Consultation publique/privée selon le profil utilisateur
- Filtrage par statut

### Reviews
- Note de 1 à 5 étoiles + commentaire optionnel
- Création uniquement si statut `READ`
- Une seule review par livre par utilisateur

### Utilisateurs
- Profils publics/privés
- Mise à jour bio, avatar, visibilité

---

## Exemples de queries et mutations

### Authentification

#### Inscription
```graphql
mutation Register {
  register(input: {
    email: "user@bookflix.com"
    username: "bookflixuser"
    password: "password123"
  }) {
    accessToken
    userId
    username
  }
}
```

#### Connexion
```graphql
mutation Login {
  login(input: {
    email: "user@bookflix.com"
    password: "password123"
  }) {
    accessToken
    userId
    username
  }
}
```

> Toutes les requêtes suivantes nécessitent le header :
> ```
> Authorization: Bearer <accessToken>
> ```

---

### Livres

#### Rechercher des livres (Google Books)
```graphql
query SearchBooks {
  searchBooks(input: {
    query: "Clean Code"
    maxResults: 10
  }) {
    items {
      id
      title
      authors
      genre
      coverUrl
      publishedYear
      averageRating
      reviewCount
    }
    total
    totalPages
    hasNextPage
  }
}
```

#### Recherche avancée
```graphql
query SearchAdvanced {
  searchBooks(input: {
    author: "Robert Martin"
    title: "Clean"
    genre: "Technologie"
    yearFrom: 2000
    yearTo: 2020
    maxResults: 10
  }) {
    items {
      id
      title
      authors
      publishedYear
    }
    total
  }
}
```

#### Recherche dans le cache DB
```graphql
query SearchLocal {
  searchLocalBooks(
    input: { query: "Clean Code" }
    page: 1
    limit: 10
  ) {
    items {
      id
      title
      authors
    }
    total
    totalPages
  }
}
```

#### Liste des livres (paginée)
```graphql
query Books {
  books(page: 1, limit: 10) {
    items {
      id
      title
      authors
      genre
      averageRating
      reviewCount
    }
    total
    totalPages
    hasNextPage
    hasPreviousPage
  }
}
```

#### Livres par genre
```graphql
query BooksByGenre {
  booksByGenre(genre: "Fiction", page: 1, limit: 10) {
    items {
      id
      title
      authors
      coverUrl
      averageRating
    }
    total
    totalPages
  }
}
```

#### Détail d'un livre
```graphql
query Book {
  book(id: "uuid-du-livre") {
    id
    title
    authors
    description
    publishedYear
    genre
    coverUrl
    isbn
    averageRating
    reviewCount
  }
}
```

#### Créer un livre manuellement
```graphql
mutation CreateBook {
  createBook(input: {
    title: "Mon livre"
    authors: "Mon auteur"
    genre: "Fiction"
    publishedYear: 2024
  }) {
    id
    title
    authors
  }
}
```

---

### Collection

#### Ajouter un livre à la collection
```graphql
mutation AddToCollection {
  addToCollection(input: {
    bookId: "uuid-du-livre"
    status: TO_READ
  }) {
    id
    status
    bookId
  }
}
```

#### Mettre à jour le statut
```graphql
mutation UpdateStatus {
  updateCollectionStatus(input: {
    bookId: "uuid-du-livre"
    status: READ
  }) {
    id
    status
  }
}
```

#### Ma collection
```graphql
query MyCollection {
  myCollection(page: 1, limit: 10, status: READ) {
    items {
      id
      status
      book {
        title
        authors
        averageRating
      }
    }
    total
    totalPages
  }
}
```

#### Collection d'un utilisateur public
```graphql
query UserCollection {
  userCollection(
    userId: "uuid-utilisateur"
    page: 1
    limit: 10
  ) {
    items {
      id
      status
      book {
        title
        authors
      }
    }
    total
  }
}
```

#### Retirer un livre de la collection
```graphql
mutation RemoveFromCollection {
  removeFromCollection(bookId: "uuid-du-livre") {
    id
    status
  }
}
```

---

### Reviews

#### Créer une review (statut READ requis)
```graphql
mutation CreateReview {
  createReview(input: {
    bookId: "uuid-du-livre"
    rating: 5
    comment: "Excellent livre, je recommande !"
  }) {
    id
    rating
    comment
  }
}
```

#### Reviews d'un livre (paginées)
```graphql
query BookReviews {
  bookReviews(bookId: "uuid-du-livre", page: 1, limit: 10) {
    items {
      id
      rating
      comment
      userId
      createdAt
    }
    total
    totalPages
  }
}
```

#### Reviews d'un utilisateur
```graphql
query UserReviews {
  userReviews(userId: "uuid-utilisateur", page: 1, limit: 10) {
    items {
      id
      rating
      comment
      book {
        title
        authors
      }
    }
    total
  }
}
```

#### Mettre à jour une review
```graphql
mutation UpdateReview {
  updateReview(
    id: "uuid-review"
    input: { rating: 4, comment: "Très bon livre !" }
  ) {
    id
    rating
    comment
  }
}
```

#### Supprimer une review
```graphql
mutation DeleteReview {
  deleteReview(id: "uuid-review") {
    id
  }
}
```

---

### Utilisateurs

#### Mon profil
```graphql
query Me {
  me {
    id
    email
    username
    bio
    avatar
    isPublic
    createdAt
    updatedAt
  }
}
```

#### Profil d'un utilisateur
```graphql
query User {
  user(id: "uuid-utilisateur") {
    id
    username
    bio
    isPublic
    createdAt
  }
}
```

#### Mettre à jour mon profil
```graphql
mutation UpdateProfile {
  updateProfile(input: {
    bio: "Passionné de lecture"
    avatar: "https://example.com/avatar.jpg"
    isPublic: true
  }) {
    id
    bio
    isPublic
  }
}
```

---

## Statuts de lecture

| Statut | Description |
|---|---|
| `TO_READ` | À lire |
| `READING` | En cours de lecture |
| `READ` | Lu ✓ (débloque les reviews) |

---

## Genres disponibles (seed)

Fiction, Science, Histoire, Technologie, Biographie, Philosophie, Art, Cuisine, Voyage, Musique, Psychologie, Économie, Politique, Religion, Sport

---

## Architecture

```
src/
├── auth/               # Authentification JWT
│   ├── decorators/     # @CurrentUser
│   ├── dto/            # RegisterInput, LoginInput, AuthResponse
│   ├── guards/         # JwtAuthGuard, GqlThrottlerGuard
│   └── strategies/     # JwtStrategy
├── books/              # Livres + Google Books API
│   └── dto/            # BookType, SearchBooksInput, PaginatedBooksType
├── collection/         # Collection personnelle
│   └── dto/            # UserBookType, PaginatedUserBooksType
├── common/             # Utilitaires partagés
│   ├── dto/            # Paginated<T>, PaginationArgs
│   └── helpers/        # buildPaginationMeta
├── reviews/            # Reviews et notes
│   └── dto/            # ReviewType, PaginatedReviewsType
├── users/              # Profils utilisateurs
│   └── dto/            # UserType, UserProfileType
└── prisma/             # Service Prisma global
prisma/
├── schema.prisma       # Modèles de données
├── prisma.config.ts    # Configuration Prisma 7
├── seed.ts             # Script de seed (277 livres)
└── migrations/         # Historique des migrations
test/
├── helpers/            # createTestApp, cleanDatabase, auth helpers
├── auth.e2e-spec.ts
├── books.e2e-spec.ts
├── collection.e2e-spec.ts
├── reviews.e2e-spec.ts
└── users.e2e-spec.ts
```

---

## Compte de test

Crée un compte via la mutation `register` :

```graphql
mutation {
  register(input: {
    email: "test@bookflix.com"
    username: "testuser"
    password: "password123"
  }) {
    accessToken
    userId
    username
  }
}
```

---

## API en production

L'API est déployée sur Railway :

**URL** : `https://bookflix-api-production.up.railway.app/graphql`

Test rapide :
```bash
curl -X POST https://bookflix-api-production.up.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ healthcheck }"}'
```

---

## Licence

MIT