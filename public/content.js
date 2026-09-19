// ─── Artrix In-Page Content Script ───────────────────────────────────────────
// Provides on-page text selection pill ("Ask Artrix 🦌") and OCR / Vision Area Snip Tool

(() => {
  if (window.__artrixContentScriptInjected) {
    return;
  }
  window.__artrixContentScriptInjected = true;

  let floatingPill = null;
  let snipOverlay = null;

  // ── 1. Floating Quick Action Pill ────────────────────────────────────────────
  function createOrGetPill() {
    if (floatingPill) return floatingPill;
    const pill = document.createElement('div');
    pill.id = 'artrix-floating-pill';
    pill.className = 'artrix-floating-pill';
    pill.innerHTML = `
      <span class="artrix-pill-icon">🦌</span>
      <span class="artrix-pill-text">Ask Artrix</span>
    `;

    pill.addEventListener('mousedown', (e) => {
      // Prevent selection collapse before click fires
      e.preventDefault();
      e.stopPropagation();
    });

    pill.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text) return;

      const pillText = pill.querySelector('.artrix-pill-text');
      if (pillText) pillText.textContent = 'Sent to Artrix ✓';
      pill.classList.add('artrix-pill-success');

      chrome.runtime.sendMessage({
        action: 'SEND_SELECTION_TO_ARTRIX',
        text,
        pageTitle: document.title || '',
        pageUrl: window.location.href || '',
      });

      setTimeout(() => {
        hidePill();
      }, 700);
    });

    document.documentElement.appendChild(pill);
    floatingPill = pill;
    return pill;
  }

  function showPill(rect) {
    const pill = createOrGetPill();
    const pillText = pill.querySelector('.artrix-pill-text');
    if (pillText) pillText.textContent = 'Ask Artrix';
    pill.classList.remove('artrix-pill-success');

    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Position above the selection if possible, otherwise below
    let top = rect.top + scrollY - 42;
    if (top < scrollY + 10) {
      top = rect.bottom + scrollY + 10;
    }
    const left = Math.max(10, Math.min(window.innerWidth - 150, rect.left + scrollX + (rect.width / 2) - 60));

    pill.style.top = `${top}px`;
    pill.style.left = `${left}px`;
    pill.classList.add('artrix-pill-visible');
  }

  function hidePill() {
    if (floatingPill) {
      floatingPill.classList.remove('artrix-pill-visible');
    }
  }

  function handleSelectionCheck() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hidePill();
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      hidePill();
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hidePill();
        return;
      }
      showPill(rect);
    } catch {
      hidePill();
    }
  }

  document.addEventListener('mouseup', () => {
    setTimeout(handleSelectionCheck, 20);
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      setTimeout(handleSelectionCheck, 20);
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (floatingPill && !floatingPill.contains(e.target)) {
      hidePill();
    }
  });

  // ── 2. Screen / Area Snip Tool for OCR & Vision Reasoning ───────────────────
  function startSnipTool() {
    if (snipOverlay) removeSnipTool();

    const overlay = document.createElement('div');
    overlay.id = 'artrix-snip-overlay';
    overlay.className = 'artrix-snip-overlay';

    overlay.innerHTML = `
      <div class="artrix-snip-header">
        <span class="artrix-snip-badge">🦌 Artrix Vision</span>
        <span>Drag a rectangle around text, equations, or diagrams to reason with Artrix. Press <b>Esc</b> to cancel.</span>
        <button class="artrix-snip-close" id="artrix-snip-close">✕</button>
      </div>
      <div class="artrix-snip-box" id="artrix-snip-box" style="display: none;">
        <div class="artrix-snip-pill">Release to analyze</div>
      </div>
    `;

    document.documentElement.appendChild(overlay);
    snipOverlay = overlay;

    const snipBox = overlay.querySelector('#artrix-snip-box');
    const closeBtn = overlay.querySelector('#artrix-snip-close');

    closeBtn.addEventListener('click', removeSnipTool);

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseDown = (e) => {
      if (e.target.closest('#artrix-snip-close')) return;
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      snipBox.style.display = 'block';
      updateBox(startX, startY, startX, startY);
    };

    const onMouseMove = (e) => {
      if (!isDrawing) return;
      currentX = e.clientX;
      currentY = e.clientY;
      updateBox(startX, startY, currentX, currentY);
    };

    const updateBox = (x1, y1, x2, y2) => {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);

      snipBox.style.left = `${left}px`;
      snipBox.style.top = `${top}px`;
      snipBox.style.width = `${width}px`;
      snipBox.style.height = `${height}px`;
    };

    const onMouseUp = async (e) => {
      if (!isDrawing) return;
      isDrawing = false;

      const x1 = startX;
      const y1 = startY;
      const x2 = e.clientX;
      const y2 = e.clientY;

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x1 - x2);
      const height = Math.abs(y1 - y2);

      if (width < 15 || height < 15) {
        removeSnipTool();
        return;
      }

      // Hide overlay so screenshot captures the clean page content
      overlay.style.display = 'none';

      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'CAPTURE_ACTIVE_TAB' }, (res) => {
          if (!res?.success || !res?.dataUrl) {
            console.error('[Artrix Content] Capture failed:', res?.error);
            showSnipToast('⚠️ Capture failed: ' + (res?.error || 'Unknown error'));
            removeSnipTool();
            return;
          }

          const img = new Image();
          img.onload = () => {
            // Compute exact scale ratio between captured raster resolution and CSS viewport
            const scaleX = img.naturalWidth / window.innerWidth;
            const scaleY = img.naturalHeight / window.innerHeight;

            const cropW = Math.max(1, Math.round(width * scaleX));
            const cropH = Math.max(1, Math.round(height * scaleY));

            const canvas = document.createElement('canvas');
            canvas.width = cropW;
            canvas.height = cropH;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(
              img,
              Math.round(left * scaleX),
              Math.round(top * scaleY),
              cropW,
              cropH,
              0,
              0,
              canvas.width,
              canvas.height
            );

            const croppedDataUrl = canvas.toDataURL('image/png');

            chrome.runtime.sendMessage({
              action: 'SEND_SNIP_TO_ARTRIX',
              image: croppedDataUrl,
              pageTitle: document.title || '',
              pageUrl: window.location.href || '',
            });

            showSnipToast('✓ Snippet sent to Artrix!');
            removeSnipTool();
          };

          img.onerror = () => {
            console.error('[Artrix Content] Failed to decode captured image');
            showSnipToast('⚠️ Failed to decode screen image');
            removeSnipTool();
          };

          img.src = res.dataUrl;
        });
      }, 70);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        removeSnipTool();
      }
    };

    overlay.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    overlay._cleanup = () => {
      overlay.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }

  function removeSnipTool() {
    if (snipOverlay) {
      if (snipOverlay._cleanup) snipOverlay._cleanup();
      snipOverlay.remove();
      snipOverlay = null;
    }
  }

  function showSnipToast(text) {
    const toast = document.createElement('div');
    toast.className = 'artrix-snip-toast';
    toast.textContent = text;
    document.documentElement.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('artrix-snip-toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  // ── 3. Listen for Messages from Extension ────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'START_SNIP') {
      startSnipTool();
      sendResponse({ status: 'ok' });
    }
  });
})();
