# Comic Book Generator - Client

Frontend interface for the Comic Book Generator, built with React and Vite.

## 🛠️ Technologies

- React 18
- Vite
- Material-UI (MUI)
- Framer Motion
- React Router
- Context API

## 📁 Project Structure

```
src/
├── components/     # Reusable components
│   ├── GameNavigation/    # Game navigation
│   ├── StoryChoices/      # Choice interface
│   └── TalkWithSarah/     # AI Assistant
├── contexts/       # React contexts (Game, Sound)
├── hooks/          # Custom hooks
├── layouts/        # Layout components
├── pages/          # Application pages
└── utils/          # Utilities and API
```

## 🎮 Key Features

- Interactive comic book interface
- Choice system (predefined or custom)
- Voice narration with controls
- Sound effects and ambient music
- AI Assistant "Sarah" for help
- Responsive design

## 🚀 Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

## 🔧 Configuration

The client requires a running backend server. Configure the API URL in `src/utils/api.js`.

## 📝 Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:coverage
```

## 🎨 Style and Linting

The project uses ESLint and Prettier to maintain clean and consistent code.

```bash
# Check style
yarn lint

# Auto-fix issues
yarn lint:fix
```
