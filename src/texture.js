import * as THREE from 'three';

export function createBannerTexture() {
  const canvas = document.createElement('canvas');
  // 4K print master. All layout coordinates remain in the original 1600×1080
  // design space and are supersampled onto the larger canvas.
  canvas.width = 4096;
  canvas.height = 2765;
  const ctx = canvas.getContext('2d');
  ctx.scale(canvas.width / 1600, canvas.height / 1080);
  ctx.textRendering = 'geometricPrecision';
  ctx.fontKerning = 'normal';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  const ink = '#101213';
  const blue = '#2944c7';
  const mono = 'ui-monospace, "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace';
  const sans = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif';
  const label = (text, x, y, size = 18, color = blue) => {
    ctx.fillStyle = color; ctx.font = `${size}px ${mono}`; ctx.fillText(text, x, y);
  };
  const text = (value, x, y, size, weight = 400, color = ink, family = sans) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${family}`; ctx.fillText(value, x, y);
  };

  function meter(x, value, caption) {
    const y = 390, h = 455, w = 38;
    ctx.fillStyle = 'rgba(45,50,52,.055)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(45,50,52,.16)'; ctx.lineWidth = 2; ctx.stroke();
    const fill = Math.max(0.025, Math.min(1, value));
    const fh = (h - 18) * fill;
    ctx.fillStyle = blue;
    ctx.beginPath(); ctx.roundRect(x + 7, y + h - 9 - fh, w - 14, fh, 12); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 14, 38, 10, 0, 0, Math.PI * 2); ctx.fill();
    label(caption, x - 4, y - 45, 16, ink);
  }

  function draw({ page = 0, wind = 0, gusts = 0, stretch = 0, fps = 60, scroll = 0, pins = 4 }) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e8e6df'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Fine woven fibres: deterministic and deliberately quiet behind the print.
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 7) {
      ctx.strokeStyle = x % 14 ? 'rgba(255,255,255,.055)' : 'rgba(40,45,45,.022)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 7) {
      ctx.strokeStyle = y % 14 ? 'rgba(255,255,255,.045)' : 'rgba(40,45,45,.018)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Custom editorial print: fewer micro-labels, heavier type and a stitched
    // registration line keep the artwork legible while the cloth is moving.
    text('Kimi K3.1 Pro', 135, 172, 96, 700);
    text('由 Kimi 呈现', 140, 232, 34, 700, blue);
    text('一块实时渲染、随风生长的布', 140, 273, 23, 700, '#353a3c', sans);
    ctx.strokeStyle = blue; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(140, 307); ctx.lineTo(965, 307); ctx.stroke();
    ctx.fillStyle = blue; ctx.beginPath(); ctx.arc(140, 307, 8, 0, Math.PI * 2); ctx.fill();

    label('实时布料数据', 1070, 137, 22);
    const rows = [
      ['风速', `${wind.toFixed(1)} 米/秒`], ['阵风', `${gusts} 次`],
      ['求解', '60 赫兹 × 4'], ['帧率', `${Math.round(fps)} 帧/秒`],
      ['拉伸', `${Math.max(0, stretch).toFixed(2)} %`], ['衣夹', `${pins} / 4`],
      ['滚动', `${Math.round(scroll * 100)}%`],
    ];
    rows.forEach(([a, b], i) => {
      label(a, 1070, 180 + i * 36, 20, '#404649');
      label(b, 1340, 180 + i * 36, 19, ink);
    });

    meter(110, wind / 24, `风速`);
    text(`${Math.round(wind * 3.2)}`, 105, 374, 23, 700, ink, mono);
    meter(1430, scroll, `滚动`);

    if (page === 0) {
      label('田野笔记 00', 365, 425, 23);
      text('悬于天际', 360, 590, 100, 700);
      text('一块布，一整个夏天。', 365, 705, 29, 400, '#353a3c', sans);
    } else if (page === 1) {
      label('01 · 实时布料', 365, 425, 23);
      label('风速', 365, 485, 21, '#353a3c');
      text(wind.toFixed(1), 360, 600, 112, 700);
      text('米/秒', 665, 600, 28, 700, blue, sans);
      label('阵风', 365, 704, 21, '#353a3c');
      text(`${gusts}`, 360, 820, 108, 700);
      text('次', 485, 820, 30, 700, blue, sans);
      label('帧率', 875, 425, 21, '#353a3c');
      text(`${Math.round(fps)}`, 870, 545, 108, 700);
      text('帧/秒', 1120, 545, 27, 700, blue, sans);
      label('拉伸', 875, 704, 21, '#353a3c');
      text(Math.max(0, stretch).toFixed(2), 870, 820, 100, 700);
      text('%', 1230, 820, 29, 700, blue);
    } else if (page === 2 || page === 3) {
      label(page === 2 ? '02 · 抓一抓' : '03 · 代码织成', 365, 425, 23);
      text('1,749', 360, 555, 112, 700);
      text('个粒子', 740, 555, 48, 700, blue, sans);
      text('10,066', 360, 690, 112, 700);
      text('组弹簧', 805, 690, 48, 700, blue, sans);
      text('由代码织成，因你而动。', 365, 760, 29, 400, '#353a3c', sans);
    } else {
      label('04 · 金色时刻', 365, 425, 23);
      text('风里', 360, 550, 100, 700);
      text('再见。', 360, 660, 100, 700);
      text('在光线变化的地方相见。', 365, 725, 29, 400, '#353a3c', sans);
    }

    label('100% 代码 — 无图片，无视频', 140, 1000, 19, '#353a3c');
    ctx.fillStyle = ink; ctx.font = `700 25px ${sans}`;
    ctx.fillText('风塑形，光织面', 980, 950);
    for (let x = 900; x <= 1320; x += 60) {
      ctx.strokeStyle = blue; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 7, 985); ctx.lineTo(x + 7, 999); ctx.moveTo(x + 7, 985); ctx.lineTo(x - 7, 999); ctx.stroke();
    }
    texture.needsUpdate = true;
  }

  draw({});
  return { texture, draw };
}

export function createWeaveTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) {
    ctx.strokeStyle = i % 8 ? '#898989' : '#767676';
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(22, 15);
  return texture;
}
