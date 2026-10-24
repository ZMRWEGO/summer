const button = document.getElementById('orientationToggle');
const label = document.getElementById('orientationLabel');
const toast = document.getElementById('orientationToast');
let toastTimer;

function updateUI() {
  const landscape = innerWidth > innerHeight;
  label.textContent = landscape ? '竖屏' : '横屏';
  button.setAttribute('aria-pressed', String(landscape));
  button.setAttribute('aria-label', landscape ? '切换为竖屏' : '切换为横屏');
}
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message; toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

button.addEventListener('click', async () => {
  const shouldEnterLandscape = innerWidth < innerHeight;
  try {
    if (shouldEnterLandscape) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (!screen.orientation?.lock) throw new Error('orientation-lock-unavailable');
      await screen.orientation.lock('landscape');
      showToast('已切换为横屏');
    } else {
      if (screen.orientation?.unlock) screen.orientation.unlock();
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      showToast('已退出横屏锁定');
    }
  } catch {
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* no-op */ }
    }
    showToast('当前浏览器不支持锁定方向，请手动旋转手机');
  }
  setTimeout(updateUI, 120);
});
addEventListener('resize', updateUI);
document.addEventListener('fullscreenchange', () => setTimeout(updateUI, 80));
updateUI();
