import path from 'path';
import Database from 'better-sqlite3';

export function createServices(sqlitePath){
  const db = new Database(path.resolve(sqlitePath));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_name TEXT NOT NULL,
      statement1 TEXT NOT NULL,
      statement2 TEXT NOT NULL,
      statement3 TEXT NOT NULL,
      photo_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      voter_id TEXT NOT NULL,
      statement_idx INTEGER NOT NULL CHECK(statement_idx IN (0,1,2)),
      choice TEXT CHECK(choice IN ('truth','lie')) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(round_id, voter_id, statement_idx),
      FOREIGN KEY(round_id) REFERENCES rounds(id)
    );
  `);

  try {
    const roundCols = db.prepare('PRAGMA table_info(rounds)').all().map(c => c.name);
    if (!roundCols.includes('statement1') && roundCols.includes('statement')) {
      const tx = db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS rounds_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_name TEXT NOT NULL,
            statement1 TEXT NOT NULL,
            statement2 TEXT NOT NULL,
            statement3 TEXT NOT NULL,
            photo_path TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        db.exec(`
          INSERT INTO rounds_new (id, candidate_name, statement1, statement2, statement3, photo_path, is_active, created_at)
          SELECT id, candidate_name, statement as statement1, '' as statement2, '' as statement3, photo_path, is_active, created_at FROM rounds;
        `);
        db.exec('DROP TABLE rounds');
        db.exec('ALTER TABLE rounds_new RENAME TO rounds');
      });
      tx();
    } else {
      if (!roundCols.includes('statement1')) db.exec('ALTER TABLE rounds ADD COLUMN statement1 TEXT');
      if (!roundCols.includes('statement2')) db.exec('ALTER TABLE rounds ADD COLUMN statement2 TEXT');
      if (!roundCols.includes('statement3')) db.exec('ALTER TABLE rounds ADD COLUMN statement3 TEXT');
    }
  } catch {}

  try {
    const voteCols = db.prepare('PRAGMA table_info(votes)').all().map(c => c.name);
    if (!voteCols.includes('statement_idx')) {
      db.exec('DROP TABLE IF EXISTS votes');
      db.exec(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          round_id INTEGER NOT NULL,
          voter_id TEXT NOT NULL,
          statement_idx INTEGER NOT NULL CHECK(statement_idx IN (0,1,2)),
          choice TEXT CHECK(choice IN ('truth','lie')) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(round_id, voter_id, statement_idx),
          FOREIGN KEY(round_id) REFERENCES rounds(id)
        );
      `);
    }
  } catch {}

  const getActiveRoundStmt = db.prepare('SELECT * FROM rounds WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
  const deactivateAllStmt = db.prepare('UPDATE rounds SET is_active = 0 WHERE is_active = 1');
  const insertRoundStmt = db.prepare('INSERT INTO rounds (candidate_name, statement1, statement2, statement3, photo_path, is_active) VALUES (?,?,?,?,?,1)');
  const getVotesForVoterStmt = db.prepare('SELECT statement_idx, choice FROM votes WHERE round_id = ? AND voter_id = ? ORDER BY statement_idx');
  const upsertVoteStmt = db.prepare(`INSERT INTO votes (round_id, voter_id, statement_idx, choice) VALUES (?,?,?,?)
    ON CONFLICT(round_id, voter_id, statement_idx) DO UPDATE SET choice = excluded.choice, created_at = CURRENT_TIMESTAMP`);
  const countVotesStmt = db.prepare(`SELECT statement_idx, choice, COUNT(*) as count FROM votes WHERE round_id = ? GROUP BY statement_idx, choice`);

  function getActiveRound(){
    const r = getActiveRoundStmt.get();
    if (!r) return null;
    return {
      id: r.id,
      candidate_name: r.candidate_name,
      statements: [r.statement1, r.statement2, r.statement3],
      photo_path: r.photo_path,
      is_active: r.is_active,
      created_at: r.created_at
    };
  }

  function startRound({ candidateName, statements, photoPath }){
    const tx = db.transaction(() => {
      deactivateAllStmt.run();
      const info = insertRoundStmt.run(candidateName, statements[0], statements[1], statements[2], photoPath);
      return info.lastInsertRowid;
    });
    return tx();
  }

  function endActiveRound(){
    deactivateAllStmt.run();
  }

  function upsertVote(roundId, voterId, statementIndex, choice){
    upsertVoteStmt.run(roundId, voterId, statementIndex, choice);
  }

  function getVoterVotes(roundId, voterId){
    const rows = getVotesForVoterStmt.all(roundId, voterId);
    if (!rows || rows.length === 0) return null;
    return rows;
  }

  function emptyResults(){
    return {
      statements: [ {truth:0, lie:0, total:0}, {truth:0, lie:0, total:0}, {truth:0, lie:0, total:0} ],
      overall: { truth:0, lie:0, total:0 }
    };
  }

  function getResults(roundId){
    const rows = countVotesStmt.all(roundId);
    const per = [ {truth:0, lie:0, total:0}, {truth:0, lie:0, total:0}, {truth:0, lie:0, total:0} ];
    for (const row of rows){
      const idx = row.statement_idx;
      if (row.choice === 'truth') per[idx].truth = row.count;
      if (row.choice === 'lie') per[idx].lie = row.count;
      per[idx].total = per[idx].truth + per[idx].lie;
    }
    const overall = per.reduce((acc, s) => ({ truth: acc.truth + s.truth, lie: acc.lie + s.lie, total: acc.total + s.total }), { truth:0, lie:0, total:0 });
    return { statements: per, overall };
  }

  return {
    getActiveRound,
    startRound,
    endActiveRound,
    upsertVote,
    getVoterVotes,
    getResults,
    emptyResults
  };
}
