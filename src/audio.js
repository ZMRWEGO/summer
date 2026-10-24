const audio = document.getElementById('bgm');
const button = document.getElementById('musicToggle');
const label = document.getElementById('musicLabel');
audio.volume = 0.75;
audio.loop = true;

// The requested default is ON on every visit. A manual mute lasts for this page
// only and never overrides the user's next-visit preference.
let muted = false;

function updateUI() {
  const playing = !audio.paused && !audio.ended;
  label.textContent = playing ? '配乐 · 开' : (muted ? '配乐 · 关' : '开启配乐');
  button.setAttribute('aria-pressed', String(playing));
  button.setAttribute('aria-label', playing ? '关闭背景音乐' : '播放背景音乐');
  button.classList.toggle('playing', playing);
}

async function requestPlay() {
  if (muted || !audio.paused) return;
  try { await audio.play(); }
  catch { /* Autoplay may wait for the first user gesture. */ }
}

button.addEventListener('click', async () => {
  if (!audio.paused) {
    muted = true; audio.pause();
  } else {
    // A paused default-on track must start on click, never toggle into mute.
    muted = false; await requestPlay();
  }
  updateUI();
});

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('#musicToggle')) requestPlay();
}, { passive: true });
document.addEventListener('keydown', requestPlay);
document.addEventListener('wheel', requestPlay, { passive: true });
audio.addEventListener('play', updateUI);
audio.addEventListener('pause', updateUI);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause();
  else requestPlay();
});
updateUI();
requestPlay();
