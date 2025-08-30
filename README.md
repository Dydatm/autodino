# AutoDino 🦕

Plateforme web moderne d'automatisation pour la prospection et l'extraction de données.

## 🚀 Stack Technique

- **Frontend**: Next.js 15 (App Router) avec React 19 et TypeScript
- **Styling**: Tailwind CSS v4 avec design moderne et responsive
- **Backend**: API Routes Next.js avec architecture App Router
- **Base de données**: Prisma ORM avec PostgreSQL
- **Authentification**: JWT avec bcrypt pour la sécurité
- **Scripts**: Python 3 pour l'extraction d'emails

## 📋 Fonctionnalités

### 🔐 Authentification Complète
- Inscription avec validation email/mot de passe
- Connexion sécurisée avec JWT
- Protection des routes avec middleware
- Gestion des sessions utilisateur

### 🤖 Automatisations Disponibles
- **Email Extractor**: Extraction d'emails depuis une liste de sites web
- **Prospect Finder**: Identification de prospects (à venir)
- **Contact Scraper**: Récupération de coordonnées (à venir)

### 💼 Interface Moderne
- Dashboard intuitif avec suivi des tâches
- Interface de configuration en 2 étapes
- Suivi en temps réel des progressions
- Design responsive mobile-first

## 🛠️ Installation

### Prérequis
- Node.js 18+ et npm
- Python 3.8+ avec pip
- PostgreSQL

### Configuration

1. **Cloner et installer les dépendances**:
```bash
cd autodino
npm install
```

2. **Configurer l'environnement virtuel Python**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install requests
```

3. **Configurer la base de données**:
```bash
# Modifier le .env avec vos credentials PostgreSQL
cp .env.example .env

# Générer le client Prisma et créer la DB
npx prisma generate
npx prisma db push
```

4. **Variables d'environnement** (`.env`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/autodino?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3002"
```

## 🚀 Démarrage

```bash
npm run dev
```

## ⚙️ Configuration Production

Ajoutez un fichier `.env` avec au minimum:

```env
PUBLIC_BASE_URL=https://votre-domaine.tld
JWT_SECRET=valeur-tres-secrete-et-longue
DATABASE_URL=file:./prisma/dev.db

# SMTP (privilégiez SMTP_URL)
# SMTP_URL=smtp://user:pass@smtp.exemple.com:587

# Ou configuration séparée
SMTP_HOST=smtp.exemple.com
SMTP_PORT=587
SMTP_USER=mon-utilisateur
SMTP_PASS=mon-mot-de-passe
MAIL_FROM="AutoDino <no-reply@exemple.com>"
REPLY_TO=support@exemple.com

# Token pour bootstrap admin
ADMIN_SETUP_TOKEN=collez_un_token_long_unique
```

### Bootstrap Admin

Créer/marquer un admin (non soumis à vérification e‑mail):

```bash
curl -X POST "$PUBLIC_BASE_URL/api/admin/bootstrap" \
  -H "Authorization: Bearer $ADMIN_SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemple.com","password":"MotDePasseFort123","firstname":"Admin","lastname":"Root"}'
```

L'application sera disponible sur `http://localhost:3002`

## 📖 Utilisation

### 1. Créer un compte
- Accédez à `/register`
- Remplissez le formulaire avec email et mot de passe sécurisé
- Vous serez automatiquement connecté

### 2. Utiliser Email Extractor
1. **Dashboard** → **Use cases** → **Email Extractor**
2. **Étape 1 - Configuration**:
   - Nommez votre automatisation
   - Uploadez un fichier CSV avec une colonne contenant des URLs
   - Sélectionnez la colonne des URLs
   - Terminez la configuration
3. **Étape 2 - Exécution**:
   - Lancez le traitement
   - Suivez la progression en temps réel
   - Téléchargez le résultat une fois terminé

### 3. Gestion des automatisations
- Consultez l'historique dans le Dashboard
- Dupliquez une configuration existante
- Supprimez les anciennes automatisations

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/           # Routes API (auth, jobs, upload, etc.)
│   ├── login/         # Page de connexion
│   ├── register/      # Page d'inscription
│   ├── dashboard/     # Dashboard principal
│   ├── use-cases/     # Catalogue d'automatisations
│   ├── job/[id]/      # Interface d'exécution des jobs
│   ├── layout.tsx     # Layout global
│   ├── page.tsx       # Page d'accueil (redirection)
│   └── globals.css    # Styles globaux AutoDino
├── components/        # Composants réutilisables
├── lib/              # Utilitaires (prisma, auth, etc.)
├── types/            # Types TypeScript
└── middleware.ts     # Protection des routes
```

## 🔒 Sécurité

- Hashage bcrypt des mots de passe (salt rounds: 12)
- JWT sécurisé avec expiration (7 jours)
- Validation stricte des données côté serveur
- Protection CSRF intégrée
- Variables d'environnement pour tous les secrets
- Middleware de protection des routes

## 🎨 Design System

- **Couleurs**: 
  - Fond: `#F5F1EF` (beige clair)
  - Primaire: `#37A646` (vert AutoDino)
- **Typographie**: Geist Sans pour une lisibilité optimale
- **Composants**: Design moderne avec coins arrondis et ombres subtiles
- **Animations**: Transitions fluides et feedback utilisateur

## 📦 Scripts Disponibles

```bash
npm run dev          # Démarrage en développement (port 3002)
npm run build        # Build de production
npm run start        # Démarrage en production
npm run lint         # Linting ESLint
npm run db:generate  # Génération client Prisma
npm run db:migrate   # Migration de la DB
npm run db:push      # Push du schéma vers la DB
```

## 🐛 Développement

### Logs et Debug
- Les logs des processus Python sont visibles dans l'interface
- Console serveur pour les erreurs API
- Middleware de logging des requêtes

### Base de données
```bash
# Voir les données
npx prisma studio

# Reset de la DB
npx prisma migrate reset
```

## 📈 Roadmap

- [ ] Implémentation complète de Prospect Finder
- [ ] Ajout de Contact Scraper
- [ ] Système de notifications en temps réel
- [ ] Export multi-formats (JSON, Excel)
- [ ] API publique avec authentification
- [ ] Intégration webhooks
- [ ] Dashboard analytics avancé

## 🤝 Contribution

Cette plateforme est conçue pour être extensible. Pour ajouter une nouvelle automatisation :

1. Créer le script Python dans `scripts/`
2. Ajouter les types TypeScript dans `src/types/`
3. Créer les routes API nécessaires
4. Ajouter la carte dans `use-cases/page.tsx`
5. Implémenter l'interface d'exécution

---

**AutoDino** - Automatisez vos tâches, libérez votre temps ! 🦕