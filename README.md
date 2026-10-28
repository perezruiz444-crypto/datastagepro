# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


## Desarrollo y validación

```sh
npm ci
npm test
npm run lint
npm run build
```

La compilación ejecuta TypeScript antes de Vite. El flujo de procesamiento es local y no requiere conectividad con Supabase.

El Excel coloca `Pedimento_Unificado` en A y conserva desde B los encabezados, el orden y los valores de los `.asc`. El año de la clave procede de `Fecha_Inicial` en `Resumen`; si falta se usa el año indicado o el actual. Las fracciones y subdivisiones se mantienen separadas. Las filas se apilan en el orden de carga, sin deduplicar por pedimento. Al combinar fuentes, los encabezados de cada tabla deben coincidir exactamente en nombre y orden; de lo contrario se informa un error.

El formato Texto conserva códigos, ceros y montos como texto. Las columnas con fechas ISO válidas se exportan como fechas de Excel sin hora. El modo Numérico es opcional y mantiene protegidos los identificadores. Los reportes individuales usan el mismo formato que el consolidado.
