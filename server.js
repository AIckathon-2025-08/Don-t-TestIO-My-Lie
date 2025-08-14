import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './src/app.js';

const { app } = createApp();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.locals.io = io;

io.on('connection', (socket) => {
  const services = app.locals.services;
  const round = services.getActiveRound();
  if (round) {
    socket.emit('vote_update', { roundId: round.id, results: services.getResults(round.id) });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Don’t TestIO My Lie running at http://localhost:${PORT}`);
});
