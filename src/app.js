import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { createServices } from './services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

export function createApp(){
  const app = express();
  const services = createServices(path.join(rootDir, 'data.sqlite'));

  app.locals.services = services;

  app.set('view engine', 'ejs');
  app.set('views', path.join(rootDir, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/public', express.static(path.join(rootDir, 'public')));
  app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

  app.use((req, res, next) => {
    if (!req.cookies.voterId) res.cookie('voterId', nanoid(), { httpOnly: true, sameSite: 'lax' });
    next();
  });

  const uploadsDir = path.join(rootDir, 'uploads');
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${Date.now()}-${nanoid()}${ext}`);
    }
  });
  const upload = multer({ storage });

  // Routes
  app.get('/', (req, res) => res.redirect('/vote'));

  app.get('/admin', (req, res) => {
    const round = services.getActiveRound();
    res.render('admin', { round });
  });

  app.post('/admin/start', upload.single('photo'), (req, res) => {
    const { candidateName, statement1, statement2, statement3 } = req.body;
    if (!candidateName || !statement1 || !statement2 || !statement3) return res.status(400).send('All fields are required');
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const newId = services.startRound({
      candidateName: candidateName.trim(),
      statements: [statement1.trim(), statement2.trim(), statement3.trim()],
      photoPath
    });
    app.locals.io.emit('round_changed', { roundId: newId });
    res.redirect('/results');
  });

  app.post('/admin/end', (req, res) => {
    services.endActiveRound();
    app.locals.io.emit('round_changed', {});
    res.redirect('/admin');
  });

  app.get('/vote', (req, res) => {
    const round = services.getActiveRound();
    if (!round) return res.render('vote', { round: null, alreadyVoted: false });
    const voterId = req.cookies.voterId;
    const existing = services.getVoterVotes(round.id, voterId);
    const results = services.getResults(round.id);
    res.render('vote', { round, alreadyVoted: existing !== null, results });
  });

  app.post('/vote', (req, res) => {
    const { idx, choice } = req.body; // idx: 0..2
    const round = services.getActiveRound();
    if (!round) return res.status(400).send('No active round');
    const statementIndex = Number(idx);
    if (!(statementIndex >= 0 && statementIndex <= 2)) return res.status(400).send('Invalid statement index');
    if (!['truth','lie'].includes(choice)) return res.status(400).send('Invalid choice');
    const voterId = req.cookies.voterId;
    services.upsertVote(round.id, voterId, statementIndex, choice);
    const results = services.getResults(round.id);
    app.locals.io.emit('vote_update', { roundId: round.id, results });
    res.redirect('/vote');
  });

  app.get('/results', (req, res) => {
    const round = services.getActiveRound();
    if (!round) return res.render('results', { round: null, results: services.emptyResults() });
    const results = services.getResults(round.id);
    res.render('results', { round, results });
  });

  app.get('/api/results', (req, res) => {
    const round = services.getActiveRound();
    if (!round) return res.json({ round: null, results: services.emptyResults() });
    res.json({ round, results: services.getResults(round.id) });
  });

  return { app };
}
