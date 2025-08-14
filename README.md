# Don’t TestIO My Lie

A simple Truth or Lie voting game for company intros. Admin sets a candidate and three statements, employees vote Truth or Lie for each, and results update live.

## Features
- Admin page to start a new round with candidate name, three statements, and optional photo
- Voting page for employees (one vote per statement per device)
- Results page with live updates via WebSockets
- SQLite storage, no external DB
- Dockerized for easy run

## Quickstart (Docker)

```bash
docker-compose up -d --build
# App is on http://localhost:3000
```

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Pages
- `/admin`: create or end a round
- `/vote`: vote Truth or Lie for each statement
- `/results`: live results

## Environment
- `PORT` (default 3000)

## Data
- SQLite file: `data.sqlite` in project root
- Uploaded photos: `uploads/`

## Notes
- One vote per statement per device is enforced via a cookie.
- Starting a new round automatically deactivates the previous one.

## License
MIT
