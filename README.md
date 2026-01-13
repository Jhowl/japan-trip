# Japan Trip Dashboard

Local, desktop-only planning dashboard for the November 2026 Japan trip. Built with Express, EJS, and SQLite, and designed to run on a home network inside Docker.

## Features

- Useful links and notes with optional uploads and YouTube embeds.
- To-do checklists and shopping lists with owner tags (Ellie or Johnny).
- Monthly calendar and itinerary list views.
- Owner selection modal with localStorage persistence.
- Minimal dark mode toggle.

## Tech Stack

- Node.js (Express)
- SQLite (single local file)
- EJS server-rendered views
- Tailwind (CDN) + custom CSS

## Project Structure

- `server.js`: Express routes and view rendering.
- `db.js`: SQLite setup and table initialization.
- `views/`: EJS templates.
- `public/`: CSS and JS assets.
- `uploads/`: Uploaded files (mounted in Docker).
- `data/`: SQLite database (mounted in Docker).

## Run With Docker

```bash
docker-compose up --build
```

The app runs at `http://localhost:3010`.

## Local Run (Without Docker)

```bash
npm install
npm start
```

## Health Check

- Endpoint: `GET /health`
- Docker uses it for container health status.

## Notes

- The app is desktop-first and uses full-screen layout (no mobile optimization).
- No authentication is enabled (intended for private LAN use).
