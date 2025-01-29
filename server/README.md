# Don't Look Up - Server

Backend du jeu "Don't Look Up", un jeu narratif post-apocalyptique généré par IA.

## 🛠️ Installation

1. Assurez-vous d'avoir Python 3.10+ et Poetry installés
2. Clonez le repository
3. Installez les dépendances :

```bash
cd server
poetry install
```

4. Créez un fichier `.env` à la racine du dossier `server` avec :

```env
MISTRAL_API_KEY=votre_clé_api_mistral
```

## 🚀 Lancement du serveur

```bash
poetry run dev
```

Le serveur démarrera sur `http://localhost:8000`

## 🎮 Tests du jeu

Le projet inclut un script de test qui permet de jouer au jeu en mode console et de tester la génération d'histoire.

### Modes de lancement

1. Mode interactif (normal) :

```bash
poetry run test-game
```

2. Mode automatique (pour les tests) :

```bash
poetry run test-game --auto
```

3. Mode automatique avec nombre de tours personnalisé :

```bash
poetry run test-game --auto --max-turns 20
```

4. Mode automatique avec affichage du contexte complet :

```bash
poetry run test-game --auto --show-context
```

### Codes de retour

En mode automatique, le script retourne :

- Code 0 : Victoire
- Code 1 : Défaite, erreur ou timeout (> 15 tours par défaut)

### Exemple d'utilisation dans un script

```bash
# Lancer 5 tests automatiques d'affilée
for i in {1..5}; do
    echo "Test run $i"
    poetry run test-game --auto || echo "Test $i failed"
done
```

## 📚 Structure du projet

```
server/
├── api/            # Routes et modèles FastAPI
├── core/           # Logique métier et générateurs
│   ├── generators/ # Générateurs (histoire, univers, etc.)
│   └── prompts/    # Templates de prompts pour l'IA
├── scripts/        # Scripts utilitaires
└── services/       # Services externes (Mistral, etc.)
```

## 🔄 Workflow de génération

1. Génération de l'univers (`UniverseGenerator`)

   - Style graphique
   - Genre
   - Époque
   - MacGuffin
   - Histoire de base

2. Génération des segments d'histoire (`StoryGenerator`)

   - Texte narratif
   - Choix
   - Prompts d'images
   - Métadonnées (temps, lieu)

3. Gestion de l'état du jeu (`GameState`)
   - Progression de l'histoire
   - Historique des choix
   - État du monde
