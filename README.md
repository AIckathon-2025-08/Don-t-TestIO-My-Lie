# Don’t TestIO My Lie

A lightweight, real-time “Truth or Lie” game for team intros. The admin sets a candidate with three statements. Everyone votes Truth or Lie for each statement, and results update live.

## Features
- Admin can start/end rounds (name, 3 statements, optional photo)
- Voting per statement (one vote per device via cookie)
- Live results via WebSockets without page reloads
- Bright, joyful UI with floating tropical emojis 🌴 🏖️ 🍹
- Dockerized, uses SQLite (no external DB)

## Tech stack
- Node.js, Express, EJS
- Socket.IO for realtime updates
- better-sqlite3 for persistent storage
- Multer for photo uploads

## Quickstart (Docker)

```bash
# from project root
docker-compose up -d --build
# open http://localhost:3000
```

Volumes/ports
- App: `3000:3000`
- Persistent files in your working dir: `data.sqlite`, `uploads/`

Stop/remove
```bash
docker-compose down
```

Reset database (wipe all rounds and votes)
```bash
docker-compose down
rm -f data.sqlite
mkdir -p uploads && chmod 777 uploads
docker-compose up -d --build
```

## Local development (without Docker)

```bash
npm install
npm run dev
# open http://localhost:3000
```

Scripts
- `npm run dev` – start with nodemon
- `npm start` – start server

## App pages
- `/admin` – start new round (name + three statements + optional photo), end active round
- `/vote` – vote Truth/Lie per statement (page doesn’t reload on vote)
- `/results` – live results per statement

## How to play
1) Share the app link `http://localhost:3000` (or your deployed URL) with the team.
2) On the Admin page (`/admin`):
   - Enter the candidate’s name, three statements, and (optionally) upload a photo.
   - Click Start. This activates a new round and deactivates any previous one.
3) Participants go to `/vote`:
   - For each of the 3 statements, choose Truth or Lie.
   - Votes are recorded instantly; a small celebration animation is shown. The page does not reload.
   - Each device can vote once per statement (tracked by a cookie).
4) Open `/results` to display the live scoreboard:
   - Bars update in real-time as votes arrive.
   - Ideal to project on a screen during the event.
5) When the round is over, the Admin can press End active round on `/admin`, then start a new round for the next person.

## API (server-rendered + small JSON endpoints)
- `POST /admin/start` form-data fields:
  - `candidateName` (string, required)
  - `statement1`, `statement2`, `statement3` (strings, required)
  - `photo` (file, optional)
- `POST /admin/end` – end current active round
- `POST /vote` – body (URL-encoded or JSON)
  - `idx` (0..2), `choice` in `truth|lie`
  - If `Accept: application/json` or header `x-requested-with: fetch` is present, returns `{ ok, results }` instead of redirect
- `GET /api/results` – returns `{ round, results }`

WebSocket events
- `vote_update` – `{ roundId, results }` broadcast on every vote
- `round_changed` – fired when a new round starts or an active round ends

## Data model
- `rounds(id, candidate_name, statement1..3, photo_path, is_active, created_at)`
- `votes(id, round_id, voter_id, statement_idx, choice, created_at)`

Notes
- One vote per statement per device: tracked by `voterId` cookie
- Starting a new round automatically deactivates previously active rounds

## File uploads
- Stored under `uploads/` (served as `/uploads/...`)
- Recommended: square images ~512×512 (cropped by object-fit)

## Theming and UI
- Styles live in `public/styles.css`
- You can tweak CSS variables (colors, gradients) at the top of the file
- Floating emojis are controlled in `public/client.js` (`spawnPalms`)

## Troubleshooting
- Permission error on `uploads` in Docker: ensure host folder exists and is writable
  ```bash
  mkdir -p uploads && chmod 777 uploads
  docker-compose up -d --build
  ```
- Seeing “Invalid choice”: client sends votes via fetch; clear browser cache and retry

## Security & scope
- Minimal auth by design (party game); for internal use only
- If you need admin protection, add a simple token or SSO in middleware

## License
MIT
