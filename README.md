# App Template of mini-interaction

Use this repository as a starting point for your mini-interaction Discord app.

## 1. Prepare the project

-   Clone the repo and install dependencies: `npm install`
-   Create your `.env` from `.env.example`, then fill in the values you need

## 2. Run locally

-   Register commands: `npm run register` to load `dist/commands/**.js`
-   Run build to build `dist` folder
-   Run `vercel --prod` to connect your repository on vercel to run your app

## 3. Deploy to Vercel

-   Install the Vercel CLI once: `npm install -g vercel`
-   Log in and link this project: `vercel login` then `vercel link`
-   Sync environment variables: `vercel env pull` (optional, but keeps CLI and dashboard in sync)
-   Deploy: `vercel --prod`

That’s it—your template is ready for Vercel-powered Discord App.

> [!NOTE]
> It is easier to do all of these on Vercel. All you have to import your repository and add env.
