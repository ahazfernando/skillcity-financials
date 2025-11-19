# Financial Management System

A modern financial management application built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- [Install Node.js with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd finflow-central-44

# Step 3: Install dependencies
npm install

# Step 4: Set up Firebase
# Create a .env.local file in the root directory with your Firebase configuration
# See FIREBASE_SETUP.md for detailed instructions

# Step 5: Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint

## Technologies

This project is built with:

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn/ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Data fetching and state management
- **Recharts** - Chart library
- **Firebase** - Backend services (Firestore & Storage)

## Project Structure

```
├── app/              # Next.js app directory (routes and layouts)
├── src/
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── data/         # Mock data
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility functions
│   └── types/        # TypeScript type definitions
└── public/           # Static assets
```

## Features

- Dashboard with financial overview
- Invoice management
- Payroll management
- Employee management
- Site management
- Work schedule tracking
- Reminders and notifications

## Deployment

This project can be deployed to any platform that supports Next.js:

- **Vercel** (recommended) - [Deploy to Vercel](https://vercel.com/docs)
- **Netlify** - [Deploy to Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- **AWS Amplify** - [Deploy to AWS](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- **Docker** - Build and deploy using Docker containers

## License

Private project
