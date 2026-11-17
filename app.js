(function () {
  const audio = document.getElementById('audio');
  const playBtn = document.getElementById('playBtn');
  const ring = document.getElementById('ringFill');
  const fill = document.getElementById('fill');
  const knob = document.getElementById('knob');
  const track = document.getElementById('track');
  const wave = document.getElementById('wave');
  const curTime = document.getElementById('curTime');
  const durTime = document.getElementById('durTime');
  const status = document.getElementById('status');
  const againBtn = document.getElementById('againBtn');

  const RING_LEN = 578;
  const BAR_COUNT = 36;
  const defaultStatus = '点击中间按钮，收听这段留言';

  /* ---------- waveform ---------- */
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('span');
    bar.className = 'branch';
    const waveShape = Math.abs(Math.sin(i * 0.62)) * 0.6 + Math.abs(Math.sin(i * 0.23 + 1)) * 0.4;
    const h = 22 + waveShape * 78;
    bar.style.setProperty('--h', h.toFixed(0));
    bar.style.setProperty('--d', (i * 47 % 700) + 'ms');
    wave.appendChild(bar);
  }

  /* ---------- helpers ---------- */
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    return pad(s / 60) + ':' + pad(s % 60);
  };

  function setStatus(text, silent) {
    if (status.textContent !== text) status.textContent = text;
    if (!silent) status.style.opacity = '1';
  }

  let duration = 11.337;

  function setDuration(d) {
    if (!isFinite(d) || d <= 0) return;
    duration = d;
    durTime.textContent = fmt(Math.round(d));
    track.setAttribute('aria-valuemax', d.toFixed(1));
  }

  if (audio.readyState >= 1 && audio.duration) setDuration(audio.duration);
  audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
  audio.addEventListener('durationchange', () => setDuration(audio.duration));

  function renderProgress() {
    const p = duration ? Math.min(audio.currentTime / duration, 1) : 0;
    fill.style.width = (p * 100).toFixed(2) + '%';
    knob.style.left = (p * 100).toFixed(2) + '%';
    ring.style.strokeDashoffset = String(RING_LEN * (1 - p));
    curTime.textContent = fmt(audio.currentTime);
    track.setAttribute('aria-valuenow', audio.currentTime.toFixed(1));
  }

  /* ---------- playback ---------- */
  function play() {
    const p = audio.play();
    if (p && p.catch) {
      p.catch((err) => {
        document.body.classList.remove('is-playing');
        setStatus('播放没成功，轻触按钮再试一次');
        console.warn('playback blocked:', err && err.name);
      });
    }
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      if (audio.ended || audio.currentTime >= duration - 0.05) audio.currentTime = 0;
      play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener('play', () => {
    document.body.classList.add('is-playing');
    againBtn.hidden = true;
    setStatus('正在播放…');
  });

  audio.addEventListener('pause', () => {
    document.body.classList.remove('is-playing');
    if (!audio.ended) setStatus('已暂停，轻触继续');
  });

  audio.addEventListener('ended', () => {
    document.body.classList.remove('is-playing');
    renderProgress();
    fill.style.width = '100%';
    knob.style.left = '100%';
    setStatus('留言听完了');
    againBtn.hidden = false;
    againBtn.focus({ preventScroll: true });
  });

  audio.addEventListener('timeupdate', renderProgress);
  audio.addEventListener('error', () => {
    setStatus('音频加载失败，请检查网络后刷新');
  });

  againBtn.addEventListener('click', () => {
    audio.currentTime = 0;
    play();
  });

  /* ---------- seeking ---------- */
  let dragging = false;

  function seekFromEvent(e) {
    const rect = track.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const ratio = Math.min(Math.max(x / rect.width, 0), 1);
    if (isFinite(duration) && duration > 0) {
      audio.currentTime = ratio * duration;
      renderProgress();
    }
  }

  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    track.setPointerCapture && track.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  track.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
  track.addEventListener('pointerup', () => { dragging = false; });
  track.addEventListener('pointercancel', () => { dragging = false; });

  track.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 2 : 0.5;
    if (e.key === 'ArrowRight') {
      audio.currentTime = Math.min(audio.currentTime + step, duration);
      renderProgress();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      audio.currentTime = Math.max(audio.currentTime - step, 0);
      renderProgress();
      e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter') {
      playBtn.click();
      e.preventDefault();
    }
  });

  /* ---------- media session ---------- */
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: '来自叫叫的神秘语音',
      artist: '叫叫',
      album: '神秘频道'
    });
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      audio.currentTime = Math.max(audio.currentTime - 3, 0);
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
      audio.currentTime = Math.min(audio.currentTime + 3, duration);
    });
  }

  renderProgress();
  status.textContent = defaultStatus;
})();
