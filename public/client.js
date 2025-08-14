(function(){
  // Floating palms generator
  function spawnPalms(){
    let layer = document.querySelector('.palm-layer');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'palm-layer';
      document.body.appendChild(layer);
    }
    const count = 12; // 1.5x more floating emojis
    for (let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'palm';
      el.style.left = Math.round(Math.random()*100) + 'vw';
      el.style.setProperty('--dur', (10 + Math.random()*8) + 's');
      el.style.setProperty('--drift', Math.round((Math.random()*2-1)*60) + 'px');
      // Randomize tropical emoji
      const pool = ['🌴','🏖️','🍹'];
      el.textContent = pool[Math.floor(Math.random()*pool.length)];
      layer.appendChild(el);
      // remove after animation
      setTimeout(() => el.remove(), 20000);
    }
  }
  setInterval(spawnPalms, 4000);
  spawnPalms();

  // Emoji fireworks on vote
  const burstLayer = (() => {
    const l = document.createElement('div');
    l.className = 'burst-layer';
    document.body.appendChild(l);
    return l;
  })();

  function triggerBurst(type, x, y){
    const particles = 20;
    const emoji = type === 'truth' ? '🍻' : '😿';
    for (let i=0;i<particles;i++){
      const p = document.createElement('span');
      p.className = 'particle';
      const angle = Math.random()*Math.PI*2;
      const power = 40 + Math.random()*60;
      const dx = Math.cos(angle) * power;
      const dy = Math.sin(angle) * power;
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', (-Math.abs(dy)) + 'px');
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.textContent = emoji;
      burstLayer.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  // Intercept vote submit: play burst and send via fetch to avoid reload
  document.addEventListener('click', async (e) => {
    const truthBtn = e.target.closest('button.truth');
    const lieBtn = e.target.closest('button.lie');
    if (truthBtn || lieBtn){
      const form = e.target.closest('form');
      if (!form) return;
      e.preventDefault();
      const btn = truthBtn || lieBtn;
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width/2;
      const y = rect.top + rect.height/2 + window.scrollY;
      const isTruth = !!truthBtn;
      triggerBurst(isTruth ? 'truth' : 'lie', x, y);
      try {
        const data = new URLSearchParams();
        const idx = form.querySelector('input[name="idx"]').value;
        data.set('idx', idx);
        data.set('choice', isTruth ? 'truth' : 'lie');
        data.set('ajax', '1');
        await fetch('/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-requested-with': 'fetch', 'Accept': 'application/json' },
          body: data.toString()
        });
      } catch (_) {}
    }
  });

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
