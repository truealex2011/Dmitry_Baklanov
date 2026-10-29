/* Enhancement layer over the existing archive; keeps its photo data and collage. */
(() => {
  let view = 'stream', timer = null, previousFocus = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  gPaused = reduced;
  gal.setAttribute('role', 'dialog');
  gal.setAttribute('aria-modal', 'true');
  gal.setAttribute('aria-label', 'Семейная галерея');
  gLb.setAttribute('role', 'dialog');
  gLb.setAttribute('aria-label', 'Просмотр фотографии');
  gBtnClose.setAttribute('aria-label', 'Закрыть галерею');
  gSearch.setAttribute('aria-label', 'Поиск по фотографиям');
  const sheet = document.createElement('div');
  sheet.id = 'gal-sheet';
  gVp.after(sheet);
  const tools = gal.querySelector('.g-btns');
  function button(text, label, parent, click) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = text; el.setAttribute('aria-label', label);
    el.onclick = click; parent.append(el); return el;
  }
  const sheetBtn = button('▦ Альбом', 'Режим альбома', tools, () => setView('sheet'));
  const streamBtn = button('↗ Коллаж', 'Режим коллажа', tools, () => setView('stream'));
  sheetBtn.className = streamBtn.className = 'g-btn';
  tools.prepend(sheetBtn, streamBtn);
  function measure() {
    gal.style.setProperty('--gallery-head', gal.querySelector('header').offsetHeight + 'px');
  }
  new ResizeObserver(measure).observe(gal.querySelector('header'));
  function setView(value) {
    view = value;
    sheet.hidden = view !== 'sheet'; gVp.hidden = view === 'sheet';
    sheetBtn.classList.toggle('active', view === 'sheet');
    streamBtn.classList.toggle('active', view !== 'sheet');
    sheetBtn.setAttribute('aria-pressed', view === 'sheet');
    streamBtn.setAttribute('aria-pressed', view !== 'sheet');
    gBtnPause.hidden = view === 'sheet';
    if (view === 'sheet') renderSheet(); else originalRender();
    measure();
  }
  function cleanTitle(item) {
    const t = item.t || 'Семейный архив';
    return t.length > 65 ? 'Автомобили Дмитрия' : t.replace(/[_]/g, ' ').replace(/\s*\(?\d+\)?\.?$/g, '').replace(/\.$/, '');
  }
  function renderSheet() {
    sheet.replaceChildren();
    const intro = document.createElement('div'); intro.className = 'g-sheet-intro';
    intro.innerHTML = '<strong>Семейные истории / в кадре</strong><span>Выбери снимок. Остановись на моменте.</span>';
    sheet.append(intro);
    if (!gPhotos.length) {
      const empty = document.createElement('div'); empty.className = 'g-sheet-empty';
      empty.innerHTML = '<h3>Ничего не нашлось</h3><div>Попробуй другое имя или вернись ко всем фотографиям.</div>';
      button('Сбросить поиск', 'Сбросить поиск', empty, () => gSetQuery(''));
      sheet.append(empty); return;
    }
    const grid = document.createElement('div'); grid.className = 'g-sheet-grid';
    gPhotos.forEach((it, i) => {
      const card = button('', 'Открыть фото ' + (i + 1) + ': ' + cleanTitle(it), grid, () => gOpenLightbox(i));
      card.className = 'g-sheet-card';
      const img = document.createElement('img'); img.src = getPhotoSrc(it); img.alt = cleanTitle(it);
      img.loading = i < 16 ? 'eager' : 'lazy'; img.decoding = 'async';
      if (i < 16) { try { img.fetchPriority = i < 8 ? 'high' : 'auto'; } catch (e) {} }
      img.onerror = () => { card.classList.add('loaded'); img.alt = 'Снимок недоступен'; };
      img.onload = () => card.classList.add('loaded');
      if (img.complete && img.naturalWidth) card.classList.add('loaded');
      const caption = document.createElement('span'); caption.textContent = cleanTitle(it);
      const number = document.createElement('small'); number.textContent = String(i + 1).padStart(3, '0');
      caption.append(number); card.append(img, caption);
    });
    sheet.append(grid);
  }
  const originalRender = gRender;
  gRender = function() {
    originalRender();
    gTitle.textContent = gTitleBase;
    gCount.textContent = gQuery.trim() ? 'результаты по запросу · листай и тяни в любую сторону' : 'листай и тяни в любую сторону';
    if (view === 'sheet') { gStage.replaceChildren(); gRows = []; renderSheet(); }
    gSyncChips(); measure();
  };
  const originalOpen = openThemeGallery;
  openThemeGallery = function(themeId, startIndex = 0) {
    previousFocus = document.activeElement;
    originalOpen(themeId, startIndex);
    setView(view); gBtnClose.focus();
  };
  const originalClose = gCloseGallery;
  gCloseGallery = function() { stopShow(); originalClose(); previousFocus?.focus(); };
  gBtnClose.removeEventListener('click', originalClose);
  gBtnClose.addEventListener('click', gCloseGallery);
  // Delegation also makes cloned cards in the seamless ribbons interactive.
  const originalMake = gMakeCard;
  gMakeCard = function(it) {
    const card = originalMake(it); card.dataset.photoIndex = it.globalIndex;
    card.tabIndex = 0; card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Открыть фото: ' + cleanTitle(it));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gOpenLightbox(it.globalIndex); } });
    return card;
  };
  // Pointer capture on the viewport used to retarget clicks away from photos.
  gVp.addEventListener('gotpointercapture', e => { gVp.releasePointerCapture(e.pointerId); });
  gStage.addEventListener('click', e => {
    const card = e.target.closest('[data-photo-index]');
    if (card && gDragMoved < 8) gOpenLightbox(Number(card.dataset.photoIndex));
  });
  const lbTools = document.createElement('div'); lbTools.className = 'g-lb-tools'; gLb.append(lbTools);
  const play = button('▷ Слайд-шоу', 'Запустить слайд-шоу', lbTools, () => {
    if (timer) stopShow();
    else { timer = setInterval(() => gNavLightbox(1), 4500); play.textContent = 'Ⅱ Остановить'; play.setAttribute('aria-pressed', 'true'); }
  });
  button('⤢ Масштаб', 'Изменить масштаб фото', lbTools, () => gLb.classList.toggle('zoomed'));
  function stopShow() { clearInterval(timer); timer = null; play.textContent = '▷ Слайд-шоу'; play.setAttribute('aria-pressed', 'false'); }
  const film = document.createElement('div'); film.id = 'g-film'; film.setAttribute('aria-label', 'Миниатюры фотографий'); gLb.append(film);
  let filmItems = null;
  const originalLightbox = gOpenLightbox;
  gOpenLightbox = function(idx) {
    if (!gPhotos[idx]) return;
    originalLightbox(idx); gLb.classList.remove('zoomed');
    gLbImg.alt = cleanTitle(gPhotos[idx]);
    gLbCaption.textContent = cleanTitle(gPhotos[idx]);
    if (filmItems !== gPhotos) {
      filmItems = gPhotos; film.replaceChildren();
      gPhotos.forEach((it, i) => {
        const thumb = button('', 'Кадр ' + (i + 1), film, () => gOpenLightbox(i));
        const img = document.createElement('img'); img.src = getPhotoSrc(it); img.alt = ''; img.loading = 'lazy'; thumb.append(img);
      });
    }
    [...film.children].forEach((el, i) => { el.classList.toggle('active', i === idx); el.setAttribute('aria-pressed', i === idx); });
    film.children[idx]?.scrollIntoView({block:'nearest', inline:'center', behavior:reduced ? 'instant' : 'smooth'});
  };
  // Replace decorative spans with native keyboard-accessible controls.
  [['.lbx','Закрыть фото'],['.lbp','Предыдущее фото'],['.lbn','Следующее фото']].forEach(([selector, label], i) => {
    const old = gLb.querySelector(selector), el = document.createElement('button');
    el.type = 'button'; el.className = old.className; el.textContent = old.textContent; el.setAttribute('aria-label', label);
    el.onclick = () => { if (i === 0) { stopShow(); gLb.classList.remove('on'); } else gNavLightbox(i === 1 ? -1 : 1); };
    old.replaceWith(el);
  });
  new MutationObserver(() => { if (!gLb.classList.contains('on')) stopShow(); }).observe(gLb, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopShow(); });
  gal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const root = gLb.classList.contains('on') ? gLb : gal;
    const focusable = [...root.querySelectorAll('button,input,[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
  });
  // The legacy scan list refers to a removed folder; start with the live archive.
  gPhotos = THEME_GALLERIES.all.items;
  gFullItems = gPhotos;
  setView('stream');
})();
