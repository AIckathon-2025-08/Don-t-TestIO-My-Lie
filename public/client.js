(function(){
  const resultsEl = document.getElementById('results');
  function updateBars(results){
    if (!resultsEl || !results || !Array.isArray(results.statements)) return;
    results.statements.forEach((s, i) => {
      const rowTruth = resultsEl.querySelector(`.bar-track.truth[data-idx="${i}"] .bar.truth`);
      const rowLie = resultsEl.querySelector(`.bar-track.lie[data-idx="${i}"] .bar.lie`);
      const total = s.total || (s.truth + s.lie);
      if (rowTruth){
        rowTruth.style.width = total ? (s.truth * 100 / total) + '%' : '0%';
        const cnt = resultsEl.querySelector(`.bar-track.truth[data-idx="${i}"] .truth-count`);
        if (cnt) cnt.textContent = String(s.truth);
      }
      if (rowLie){
        rowLie.style.width = total ? (s.lie * 100 / total) + '%' : '0%';
        const cnt = resultsEl.querySelector(`.bar-track.lie[data-idx="${i}"] .lie-count`);
        if (cnt) cnt.textContent = String(s.lie);
      }
    });
  }

  const socket = window.io ? window.io() : null;
  if (socket) {
    socket.on('vote_update', (payload) => {
      if (payload && payload.results) updateBars(payload.results);
    });
    socket.on('round_changed', () => {
      window.location.reload();
    });
  }
})();
