# BookFlix API 📚

API GraphQL de bibliothèque numérique permettant de gérer une collection personnelle de livres, avec recherche via Google Books, système de reviews et gestion de profils utilisateurs.

---

## Stack technique

- **Runtime** : Node.js 20+
- **Framework** : NestJS 11 + TypeScript strict
- **API** : GraphQL Code First (@nestjs/graphql + Apollo Server 5)
- **ORM** : Prisma 7 + PostgreSQL 16
- **Auth** : JWT + Passport
- **Tests** : Jest + SWC
- **Docker** : API + PostgreSQL + Adminer

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
PORT=3000

# Database
DATABASE_URL="postgresql://bookflix:bookflix_secret@localhost:5432/bookflix_db?schema=public"
POSTGRES_USER=bookflix
POSTGRES_PASSWORD=bookflix_secret
POSTGRES_DB=bookflix_db

# JWT
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=7d

# Google Books API
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
GOOGLE_BOOKS_API_URL=https://www.googleapis.com/books/v1
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

### 3. Peupler la base de données (optionnel)

```bash
npm run prisma:seed
```

> Le seed insère ~277 livres répartis sur 15 genres via Google Books API.

### 4. Générer le client Prisma

```bash
npx prisma generate
```

### 5. Démarrer l'API

```bash
npm run start:dev
```

L'API est disponible sur : `http://localhost:3000/graphql`

---

## Lancer avec Docker (production)

```bash
docker compose up --build
```

Services démarrés :
- **API** → `http://localhost:3000/graphql`
- **PostgreSQL** → `localhost:5432`
- **Adminer** → `http://localhost:8080`

---

## Tests

```bash
# Tests unitaires
npm run test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:cov
```

---

## Schéma GraphQL

Le schéma est généré automatiquement au démarrage dans `schema.graphql`.

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

#### Rechercher des livres
```graphql
query SearchBooks {
  searchBooks(input: {
    query: "Clean Code"
    maxResults: 10
  }) {
    id
    title
    authors
    genre
    coverUrl
    publishedYear
  }
}
```

#### Liste des livres (paginée)
```graphql
query Books {
  books(page: 1, limit: 10) {
    id
    title
    authors
    genre
  }
}
```

#### Livres par genre
```graphql
query BooksByGenre {
  booksByGenre(genre: "Fiction", page: 1, limit: 10) {
    id
    title
    authors
    coverUrl
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
    id
    status
    book {
      title
      authors
    }
  }
}
```

#### Collection d'un utilisateur public
```graphql
query UserCollection {
  userCollection(userId: "uuid-utilisateur", page: 1, limit: 10) {
    id
    status
    book {
      title
      authors
    }
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

#### Reviews d'un livre
```graphql
query BookReviews {
  bookReviews(bookId: "uuid-du-livre", page: 1, limit: 10) {
    id
    rating
    comment
    userId
    createdAt
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
  }
}
```

#### Mettre à jour mon profil
```graphql
mutation UpdateProfile {
  updateProfile(input: {
    bio: "Passionné de lecture"
    isPublic: true
  }) {
    id
    bio
    isPublic
  }
}
```

---

## Compte de test

Lance le seed puis crée un compte via la mutation `register` :

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

## Architecture

src/
├── auth/          # Authentification JWT
├── books/         # Livres + Google Books API
├── collection/    # Collection personnelle
├── reviews/       # Reviews et notes
├── users/         # Profils utilisateurs
└── prisma/        # Service Prisma global
prisma/
├── schema.prisma  # Modèles de données
├── seed.ts        # Script de seed
└── migrations/    # Historique des migrations

---

## Statuts de lecture

| Statut | Description |
|--------|-------------|
| `TO_READ` | À lire |
| `READING` | En cours de lecture |
| `READ` | Lu ✓ (débloque les reviews) |

---

## Licence

MIT