// 적뢰 스킨 이미지 전환용 추가 파일. 루트의 skins.js 다음에 로드하세요.
// 이미지 경로: assets/skins/lee-red.png, assets/skins/lee-red-back.png
(() => {
  'use strict';

  const RED_FRONT = 'assets/skins/lee-red.png';
  const RED_BACK = 'assets/skins/lee-red-back.png';
  const checks = new Map();
  const warned = new Set();
  let queued = false;

  function exists(src) {
    if (!checks.has(src)) {
      checks.set(src, new Promise(resolve => {
        const probe = new Image();
        probe.onload = () => resolve(true);
        probe.onerror = () => resolve(false);
        probe.src = src;
      }));
    }
    return checks.get(src);
  }

  function basePath(node) {
    const id = node.dataset.character;
    if (!id) return '';
    return `assets/sprites/${id}${node.id === 'player-sprite' ? '-back' : ''}.png`;
  }

  function applyTo(node, redPath) {
    if (!node) return;
    const image = node.querySelector('img.champion-art');
    if (!image) return;
    const red = node.dataset.character === 'lee' && node.dataset.skin === 'storm';
    const wanted = red ? redPath : basePath(node);
    if (!wanted) return;

    if (!red) {
      if (image.dataset.redSkinApplied) {
        delete image.dataset.redSkinApplied;
        delete image.dataset.redSkinRequested;
        if (image.getAttribute('src') !== wanted) image.src = wanted;
      }
      return;
    }

    if (image.dataset.redSkinApplied === wanted && image.getAttribute('src') === wanted) return;
    if (image.dataset.redSkinRequested === wanted) return;
    image.dataset.redSkinRequested = wanted;
    exists(wanted).then(ok => {
      if (image.dataset.redSkinRequested !== wanted) return;
      delete image.dataset.redSkinRequested;
      if (!image.isConnected || node.dataset.character !== 'lee' || node.dataset.skin !== 'storm') return;
      if (!ok) {
        if (!warned.has(wanted)) {
          warned.add(wanted);
          console.warn(`적뢰 이미지가 없습니다: ${wanted}. 기본 그림을 유지합니다.`);
        }
        return;
      }
      image.dataset.redSkinApplied = wanted;
      if (image.getAttribute('src') !== wanted) image.src = wanted;
    });
  }

  function refresh() {
    applyTo(document.getElementById('player-sprite'), RED_BACK);
    document.querySelectorAll('.pick-portrait').forEach(portrait => applyTo(portrait, RED_FRONT));
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh();
    });
  }

  // 기존 skins.js가 장착 상태를 data-skin에 반영하면 사진만 교체한다.
  // 다른 캐릭터로 교체하거나 적뢰를 해제하면 기본 이미지로 돌아간다.
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-skin', 'data-character', 'data-sprite-key']
  });
  schedule();
})();