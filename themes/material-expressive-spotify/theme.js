/* =====================================================================
   Material 3 Expressive · Catppuccin Mocha (Mauve): theme.js
   Pairs with user.css. Everything is defensive: if an element is not found
   the script does nothing and user.css falls back to plain styling.

   1. Wavy seek bar        paints .me3-seek over Spotify's native progress bar
   2. Like state           data-me3-like="on|off" on every like / save button
   3. Carousel surfaces    data-me3-shelf on blocks that hold one heading + cards
   4. Play on artwork      one floating overlay over the hovered row's artwork
   5. Player controls      data-me3-ctl by position, data-me3-state for shuffle / repeat

   Performance: the old version watched the WHOLE document and measured layout
   every 200 ms, which fought with the virtualised sidebar list while it
   scrolled. Now the observers only watch the main view and the player bar
   (never the sidebar), and nothing here reads layout except on hover.
   ===================================================================== */
(function me3Theme() {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const player = () => (window.Spicetify && window.Spicetify.Player) || null;
  const elementsMatching = (scope, selector) => {
    if (!scope || scope.nodeType !== 1) return [];
    return (scope.matches(selector) ? [scope] : []).concat($$(selector, scope));
  };
  const libraryApi = () => {
    try { return window.Spicetify.Platform.LibraryAPI; } catch (_) { return null; }
  };

  // The Player wrapper can exist before its internal state is assigned on
  // macOS. Treat that short window as unavailable instead of letting one
  // incomplete wrapper abort the whole theme.
  function playerCall(method, fallback) {
    const p = player();
    if (!p || typeof p[method] !== "function") return fallback;
    try { return p[method](); } catch (_) { return fallback; }
  }

  function debounce(fn, ms) {
    let timer = 0;
    return () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = 0;
        try { fn(); } catch (_) { /* never let the theme break Spotify */ }
      }, ms);
    };
  }

  /* Anything the person did in the last 1.5 s may legitimately change a like. */
  let lastUserAction = 0;
  ["pointerdown", "keydown"].forEach((type) =>
    doc.addEventListener(type, () => { lastUserAction = performance.now(); }, true)
  );

  const LIBRARY_COLLAPSED_CONTROL = [
    '[aria-label*="Expand" i][aria-label*="Library" i]',
    '[aria-label*="Your Library" i][aria-expanded="false"]',
    '[data-testid*="expand" i][data-testid*="library" i]',
  ].join(",");

  function syncLibraryCollapsed() {
    root.classList.toggle("me3-library-collapsed", !!$(LIBRARY_COLLAPSED_CONTROL));
  }

  doc.addEventListener(
    "click",
    (e) => {
      if (e.target.closest && e.target.closest(LIBRARY_COLLAPSED_CONTROL)) {
        setTimeout(syncLibraryCollapsed, 0);
      }
    },
    true
  );

  /* ------------------------------------------------------------------
     1. WAVY SEEK BAR
     ------------------------------------------------------------------ */
  const SEEK_HOST = ".playback-bar .playback-progressbar";
  const SEEK_UPDATE_MS = 100;
  const seek = {
    host: null,
    root: null,
    playing: false,
    dragging: false,
    dragValue: 0,
    holdUntil: 0,
    holdValue: 0,
    timer: 0,
    frame: 0,
  };

  function detectPlaying() {
    const playing = playerCall("isPlaying", null);
    if (typeof playing === "boolean") return playing;
    return !!$('[data-testid="control-button-playpause"][aria-label="Pause" i]');
  }

  function fractionFromPointer(e) {
    if (!seek.host) return 0;
    const r = seek.host.getBoundingClientRect();
    return r.width ? clamp01((e.clientX - r.left) / r.width) : 0;
  }

  function currentFraction() {
    if (seek.dragging) return seek.dragValue;
    if (performance.now() < seek.holdUntil) return seek.holdValue;

    const v = playerCall("getProgressPercent", null);
    if (Number.isFinite(v)) return clamp01(v);

    const fill = seek.host && $(".x-progressBar-fillColor, .x-progressBar-foreground", seek.host);
    if (fill) {
      const raw = getComputedStyle(fill).getPropertyValue("--progress-bar-transform").trim();
      const n = parseFloat(raw);
      if (Number.isFinite(n)) return clamp01(raw.endsWith("%") ? n / 100 : n);
    }
    return 0;
  }

  function setData(el, key, value) {
    if (el.dataset[key] !== value) el.dataset[key] = value;
  }

  function paintSeek() {
    const el = seek.root;
    if (!el || !el.isConnected) return;
    const f = currentFraction();
    el.style.setProperty("--p", f.toFixed(4));
    setData(el, "playing", seek.playing ? "true" : "false");
    setData(el, "dragging", seek.dragging ? "true" : "false");
    setData(el, "end", f > 0.985 ? "true" : "false");
  }

  function seekLoop() {
    paintSeek();
    const keepGoing = seek.root && seek.root.isConnected && seek.playing;
    seek.timer = keepGoing ? setTimeout(seekLoop, SEEK_UPDATE_MS) : 0;
  }

  function kickSeek() {
    if (!seek.timer && seek.root && seek.playing) seek.timer = setTimeout(seekLoop, 0);
  }

  function scheduleSeekPaint() {
    if (seek.frame) return;
    seek.frame = requestAnimationFrame(() => {
      seek.frame = 0;
      paintSeek();
    });
  }

  function onSeekPointerDown(e) {
    if (e.button !== 0 || !seek.host) return;
    seek.dragging = true;
    seek.dragValue = fractionFromPointer(e);
    scheduleSeekPaint();

    const move = (ev) => {
      seek.dragValue = fractionFromPointer(ev);
      scheduleSeekPaint();
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      seek.dragValue = fractionFromPointer(ev);
      seek.dragging = false;
      seek.holdValue = seek.dragValue;
      seek.holdUntil = performance.now() + 500;
      const p = player();
      try {
        if (p && typeof p.seek === "function") p.seek(seek.holdValue);
      } catch (_) { /* player still initialising; keep the visual position */ }
      paintSeek();
    };

    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
  }

  function mountSeek() {
    const host = $(SEEK_HOST);
    if (!host) {
      root.classList.remove("me3-seek-ready");
      seek.host = seek.root = null;
      return;
    }
    if (host === seek.host && seek.root && seek.root.isConnected) return;

    seek.host = host;
    let el = $(":scope > .me3-seek", host);
    if (!el) {
      el = doc.createElement("div");
      el.className = "me3-seek";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML =
        '<span class="me3-seek__active"><span class="me3-seek__wave"></span></span>' +
        '<span class="me3-seek__flat"></span>' +
        '<span class="me3-seek__track"></span>' +
        '<span class="me3-seek__thumb"></span>';
      host.appendChild(el);
    }
    seek.root = el;

    if (!host.__me3Bound) {
      host.__me3Bound = true;
      host.addEventListener("pointerdown", onSeekPointerDown, true);
    }

    root.classList.add("me3-seek-ready");
    seek.playing = detectPlaying();
    paintSeek();
    kickSeek();
  }

  /* ------------------------------------------------------------------
     2. LIKE STATE
        Every like / save button gets data-me3-like="on|off".
        - now-playing button: asked from Spotify's library API
        - track rows: asked from the library API by track URI (batched, cached)
        - everything else: read from the button itself
     ------------------------------------------------------------------ */
  const SAVE_LABELS = [
    "Add to Liked Songs",
    "Remove from Liked Songs",
    "Save to Your Library",
    "Remove from Your Library",
  ].map((label) => `button[aria-label="${label}" i]`);

  const ROW_LIKE = [
    ".main-trackList-rowHeartButton",
    'button[data-testid="add-to-playlist-button"]',
    'button[aria-label="Add to playlist" i]',
    ...SAVE_LABELS,
  ].join(",");

  const OTHER_LIKE = [
    ".control-button-heart",
    ".main-addButton-button",
    'button[data-testid="add-button"]',
    'button[aria-label="Add to Your Library" i]',
    ...SAVE_LABELS,
  ].join(",");

  const ANY_LIKE_CLICK = ROW_LIKE + "," + OTHER_LIKE + ",.main-nowPlayingWidget-plusButton,.main-nowPlayingWidget-plusButton *";

  const previousLike = new WeakMap();
  const savedCache = new Map(); // track uri -> boolean
  let likeRefreshTimer = 0;

  function looksSaved(btn) {
    const label = (btn.getAttribute("aria-label") || "").toLowerCase();
    return (
      btn.classList.contains("main-addButton-active") ||
      btn.getAttribute("aria-checked") === "true" ||
      btn.getAttribute("aria-pressed") === "true" ||
      /textBrightAccent/.test(btn.className || "") ||
      /remove from|saved|added to|unlike|unsave/.test(label)
    );
  }

  function setLike(btn, saved) {
    const next = saved ? "on" : "off";
    const prev = previousLike.get(btn);
    if (prev === next) return;
    previousLike.set(btn, next);
    btn.setAttribute("data-me3-like", next);

    // Pop only right after a person's action, never on page load or song change.
    if (prev === "off" && next === "on" && performance.now() - lastUserAction < 1500) {
      btn.setAttribute("data-me3-pop", "");
      setTimeout(() => btn.removeAttribute("data-me3-pop"), 700);
    }
  }

  function nowPlayingLikeButton() {
    const widget =
      $(".main-nowPlayingWidget-nowPlaying") ||
      $('[data-testid="now-playing-widget"]') ||
      $(".main-nowPlayingBar-left");
    if (!widget) return null;

    const holder = $(".main-nowPlayingWidget-plusButton, .main-nowPlayingWidget-plusButtonWrapper, .control-button-heart", widget);
    if (holder) return holder.matches("button") ? holder : $("button", holder) || holder;

    return (
      $$("button", widget).find(
        (b) =>
          !b.closest(".main-coverSlotCollapsed-container") &&
          /liked|library|playlist|save|saved|add|remove|heart|like/i.test(b.getAttribute("aria-label") || "")
      ) || null
    );
  }

  async function savedByUris(uris) {
    const api = libraryApi();
    if (!api || !uris.length) return null;
    try {
      const result = await api.contains(...uris);
      return Array.isArray(result) ? result.map(Boolean) : null;
    } catch (_) {
      return null;
    }
  }

  async function syncNowPlayingLike() {
    const btn = nowPlayingLikeButton();
    if (!btn) return;
    const P = player();
    const item = P && P.data && (P.data.item || P.data.track);
    const res = item && item.uri ? await savedByUris([item.uri]) : null;
    setLike(btn, res ? res[0] : looksSaved(btn));
  }

  function trackUriOfRow(row) {
    const a = row.querySelector('a[href*="/track/"]');
    const m = a && /\/track\/([A-Za-z0-9]+)/.exec(a.getAttribute("href") || "");
    return m ? "spotify:track:" + m[1] : null;
  }

  const pendingLikeRows = new Set();
  let rowSyncBusy = false;

  function queueRowLikeSync(scope) {
    elementsMatching(scope, ".main-trackList-trackListRow").forEach((row) => pendingLikeRows.add(row));
    const parentRow = scope && scope.closest && scope.closest(".main-trackList-trackListRow");
    if (parentRow) pendingLikeRows.add(parentRow);
    if (!rowSyncBusy && pendingLikeRows.size) void syncQueuedRowLikes();
  }

  async function syncQueuedRowLikes() {
    if (rowSyncBusy) return;
    rowSyncBusy = true;
    try {
      while (pendingLikeRows.size) {
        const rows = Array.from(pendingLikeRows);
        pendingLikeRows.clear();
        const items = [];
        const need = new Set();

        rows.forEach((row) => {
          if (!row.isConnected) return;
          const btn = $(ROW_LIKE, row);
          if (!btn) return;
          const uri = trackUriOfRow(row);
          items.push({ btn, uri });
          if (uri && !savedCache.has(uri)) need.add(uri);
        });

        if (need.size) {
          const list = Array.from(need);
          const res = await savedByUris(list);
          if (res) list.forEach((uri, i) => savedCache.set(uri, res[i]));
        }

        items.forEach(({ btn, uri }) =>
          setLike(btn, uri && savedCache.has(uri) ? savedCache.get(uri) : looksSaved(btn))
        );
      }
    } finally {
      rowSyncBusy = false;
      if (pendingLikeRows.size) void syncQueuedRowLikes();
    }
  }

  function syncOtherLikes(scope) {
    const view = scope || $(".main-view-container") || doc.body;
    if (!view) return;
    const np = nowPlayingLikeButton();
    elementsMatching(view, OTHER_LIKE).forEach((btn) => {
      if (btn === np || btn.closest(".main-trackList-trackListRow")) return;
      setLike(btn, looksSaved(btn));
    });
  }

  function refreshAllLikes() {
    savedCache.clear();
    const view = $(".main-view-container") || doc.body;
    syncNowPlayingLike();
    syncOtherLikes(view);
    queueRowLikeSync(view);
  }

  function scheduleLikeRefresh(delay = 500) {
    clearTimeout(likeRefreshTimer);
    likeRefreshTimer = setTimeout(() => {
      likeRefreshTimer = 0;
      refreshAllLikes();
    }, delay);
  }

  function onLibraryOperationComplete() {
    scheduleLikeRefresh(100);
  }

  doc.addEventListener(
    "click",
    (e) => {
      if (e.target.closest && e.target.closest(ANY_LIKE_CLICK)) {
        scheduleLikeRefresh();
      }
    },
    true
  );

  /* ------------------------------------------------------------------
     3. CAROUSEL SURFACES
        user.css already styles Spotify's own [data-shelf] / .main-shelf-shelf.
        This adds data-me3-shelf to any other block that holds a row of
        cards under exactly one <h2>, so every carousel gets its surface.
     ------------------------------------------------------------------ */
  const CARD_LINK = 'a[href^="/playlist/"], a[href^="/album/"], a[href^="/artist/"], a[href^="/show/"]';
  const NOT_A_SHELF_ZONE =
    '.main-trackList-trackList, .main-entityHeader-container, .main-actionBar-ActionBar, .main-topBar-container, [role="grid"]';
  const NOT_A_SHELF_BLOCK = ".main-trackList-trackList, .main-entityHeader-container, .main-actionBar-ActionBar";
  const shelfOfLink = new WeakMap();
  const shelfOfContainer = new WeakMap();

  function resolveShelf(link) {
    let el = link.parentElement;
    const ancestry = [];
    for (let hops = 0; el && hops < 7; hops++, el = el.parentElement) {
      if (el.matches(".main-view-container, .Root__main-view, main")) return null;
      const knownShelf = shelfOfContainer.get(el);
      if (knownShelf && knownShelf.isConnected && knownShelf.contains(link)) return knownShelf;

      ancestry.push(el);
      const headings = el.getElementsByTagName("h2").length;
      if (headings === 1) {
        if (el.querySelector(NOT_A_SHELF_BLOCK)) return null;
        ancestry.forEach((node) => shelfOfContainer.set(node, el));
        return el;
      }
      if (headings > 1) return null;
    }
    return null;
  }

  function tagShelvesIn(scope) {
    const shelves = new Set();

    elementsMatching(scope, CARD_LINK).forEach((link) => {
      if (link.closest(NOT_A_SHELF_ZONE)) return;
      let shelf = shelfOfLink.get(link);
      if (!(shelf && shelf.isConnected && shelf.contains(link))) {
        shelf = resolveShelf(link);
        shelfOfLink.set(link, shelf);
      }
      if (shelf) shelves.add(shelf);
    });

    shelves.forEach((el) => {
      if (!el.hasAttribute("data-me3-shelf")) el.setAttribute("data-me3-shelf", "");
    });
  }

  function tagShelves(view) {
    if (!view) return;
    const shelves = new Set();

    elementsMatching(view, CARD_LINK).forEach((link) => {
      if (link.closest(NOT_A_SHELF_ZONE)) return;
      let shelf = shelfOfLink.get(link);
      if (!(shelf && shelf.isConnected && shelf.contains(link))) {
        shelf = resolveShelf(link);
        shelfOfLink.set(link, shelf);
      }
      if (shelf) shelves.add(shelf);
    });

    $$("[data-me3-shelf]", view).forEach((el) => {
      if (!shelves.has(el)) el.removeAttribute("data-me3-shelf");
    });
    shelves.forEach((el) => {
      if (!el.hasAttribute("data-me3-shelf")) el.setAttribute("data-me3-shelf", "");
    });
  }

  /* ------------------------------------------------------------------
     4. PLAY / PAUSE ON THE ARTWORK
        One floating overlay is placed over the artwork of the row under the
        pointer. A click on that artwork is forwarded to the row's own native
        play / pause button, so playback behaves exactly like Spotify's.
     ------------------------------------------------------------------ */
  const ART_SEL =
    ".main-trackList-rowSectionStart img, .main-trackList-rowSectionStart .main-trackList-rowImageFallback";
  const NATIVE_PLAY_SEL = [
    'button[aria-label^="Pause" i]',
    'button[aria-label^="Play" i]',
    ".main-trackList-rowPlayPauseButton",
    ".main-trackList-rowImagePlayPauseButton",
    ".main-trackList-rowImagePlayButton",
  ].join(",");

  const art = { el: null, glyph: null, row: null, busy: false, raf: 0 };

  function artOverlay() {
    if (!art.el) {
      const el = doc.createElement("div");
      el.className = "me3-art-play";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = '<span class="me3-art-play__glyph">play_arrow</span>';
      doc.body.appendChild(el);
      art.el = el;
      art.glyph = el.firstChild;
    }
    return art.el;
  }

  function hideArt() {
    art.row = null;
    if (art.el) art.el.classList.remove("is-visible");
  }

  function rowShowsPause(row) {
    const btn = $(NATIVE_PLAY_SEL, row);
    if (!btn) return false;
    return /^pause/i.test(btn.getAttribute("aria-label") || "") ||
      btn.classList.contains("main-trackList-rowImagePlayPauseButtonPlaying");
  }

  function updateArt() {
    if (!art.row) return;
    if (!art.row.isConnected) return hideArt();
    const img = $(ART_SEL, art.row);
    if (!img) return hideArt();

    const r = img.getBoundingClientRect();
    const view = $(".main-view-container");
    const v = view ? view.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    // Hidden under the sticky top bar or scrolled out of the view
    if (!r.width || r.top < v.top + 64 || r.bottom > v.bottom) return hideArt();

    const el = artOverlay();
    el.style.left = r.left + "px";
    el.style.top = r.top + "px";
    el.style.width = r.width + "px";
    el.style.height = r.height + "px";

    const glyph = rowShowsPause(art.row) ? "pause" : "play_arrow";
    if (art.glyph.textContent !== glyph) art.glyph.textContent = glyph;
    el.classList.add("is-visible");
  }

  function scheduleArtUpdate() {
    if (art.raf || !art.row) return;
    art.raf = requestAnimationFrame(() => { art.raf = 0; updateArt(); });
  }

  doc.addEventListener(
    "mouseover",
    (e) => {
      const t = e.target;
      const row = t && t.closest ? t.closest(".main-trackList-trackListRow") : null;
      if (row === art.row) return;
      art.row = row;
      if (!row || !$(ART_SEL, row)) return hideArt();
      updateArt();
    },
    true
  );

  root.addEventListener("mouseleave", hideArt);
  doc.addEventListener("scroll", scheduleArtUpdate, true);
  window.addEventListener("resize", scheduleArtUpdate);

  doc.addEventListener(
    "click",
    (e) => {
      if (art.busy || !art.row || !art.row.isConnected || e.button !== 0) return;
      if (!art.row.contains(e.target)) return;
      const img = $(ART_SEL, art.row);
      if (!img) return;

      const r = img.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const btn = $(NATIVE_PLAY_SEL, art.row);
      art.busy = true;
      try {
        if (btn) btn.click();
        else art.row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
      } finally {
        art.busy = false;
      }
      setTimeout(scheduleArtUpdate, 150);
      setTimeout(scheduleArtUpdate, 600);
    },
    true
  );

  function tagTrackLists(scope) {
    if (!scope) return;
    const lists = new Set(elementsMatching(scope, ".main-trackList-trackList"));
    const parentList = scope.closest && scope.closest(".main-trackList-trackList");
    if (parentList) lists.add(parentList);
    lists.forEach((list) => {
      const hasArtwork = !!list.querySelector(ART_SEL);
      if (hasArtwork !== list.hasAttribute("data-me3-art")) list.toggleAttribute("data-me3-art", hasArtwork);
    });
  }

  /* ------------------------------------------------------------------
     5. PLAYER CONTROLS
        The transport buttons are tagged by position (shuffle, previous,
        play / pause, next, repeat) so user.css can draw their glyphs without
        relying on Spotify's labels, which change between versions. If the
        count is not exactly five nothing is tagged and Spotify's icons stay.
        Shuffle and repeat also get data-me3-state, read from the player:
          shuffle: off | on | smart          repeat: off | all | one
     ------------------------------------------------------------------ */
  const CONTROL_ROLES = ["shuffle", "prev", "play", "next", "repeat"];

  function playerModes(shuffleBtn) {
    const P = player();
    if (!P || typeof P.getShuffle !== "function" || typeof P.getRepeat !== "function") return null;
    try {
      const data = P.data || {};
      const smart = data.smartShuffle !== undefined
        ? !!data.smartShuffle
        : /disable smart shuffle/i.test(shuffleBtn.getAttribute("aria-label") || "");
      const repeat = P.getRepeat();
      return {
        shuffle: smart ? "smart" : P.getShuffle() ? "on" : "off",
        repeat: repeat === 2 || repeat === "track" ? "one" : repeat === 1 || repeat === "context" ? "all" : "off",
      };
    } catch (_) {
      return null;
    }
  }

  function syncControls() {
    $$(".player-controls__buttons").forEach((row) => {
      const buttons = $$("button", row);
      if (buttons.length !== CONTROL_ROLES.length) return;
      buttons.forEach((btn, i) => setData(btn, "me3Ctl", CONTROL_ROLES[i]));
      const modes = playerModes(buttons[0]);
      if (!modes) return;
      setData(buttons[0], "me3State", modes.shuffle);
      setData(buttons[4], "me3State", modes.repeat);
    });
  }

  // Spotify applies a shuffle / repeat click a moment later
  doc.addEventListener(
    "click",
    (e) => {
      if (e.target.closest && e.target.closest(".player-controls__buttons button")) {
        setTimeout(syncControls, 150);
        setTimeout(syncControls, 600);
      }
    },
    true
  );

  /* ------------------------------------------------------------------
     Wiring: observe ONLY the main view and the player bar
     ------------------------------------------------------------------ */
  const pendingMainScopes = new Set();
  function queueMainScope(node) {
    const scope = node && node.nodeType === 1 ? node : null;
    if (!scope) return;
    for (const queued of pendingMainScopes) {
      if (!queued.isConnected) pendingMainScopes.delete(queued);
      else if (queued.contains(scope)) return;
      else if (scope.contains(queued)) pendingMainScopes.delete(queued);
    }
    pendingMainScopes.add(scope);
  }

  const mainPass = debounce(() => {
    const scopes = Array.from(pendingMainScopes);
    pendingMainScopes.clear();
    scopes.forEach((scope) => {
      if (!scope.isConnected) return;
      tagShelvesIn(scope);
      tagTrackLists(scope);
      syncOtherLikes(scope);
      queueRowLikeSync(scope);
    });
    scheduleArtUpdate();
  }, 100);

  function onMainMutations(records) {
    records.forEach((record) => record.addedNodes.forEach(queueMainScope));
    if (pendingMainScopes.size) mainPass();
  }

  function initialiseMain(rootEl) {
    const view = $(".main-view-container", rootEl) || rootEl;
    tagShelves(view);
    tagTrackLists(view);
    syncOtherLikes(view);
    queueRowLikeSync(view);
    scheduleArtUpdate();
  }

  const playerPass = debounce(() => {
    mountSeek();
    syncControls();
    const np = nowPlayingLikeButton();
    if (np && !np.hasAttribute("data-me3-like")) syncNowPlayingLike();
  }, 150);

  const watched = new WeakSet();
  function watch(selector, handler, initialise = handler) {
    const el = $(selector);
    if (!el || watched.has(el)) return;
    watched.add(el);
    new MutationObserver(handler).observe(el, { childList: true, subtree: true });
    initialise(el);
  }

  function watchRoots() {
    watch(".Root__main-view", onMainMutations, initialiseMain);
    watch(".Root__now-playing-bar", playerPass);
    syncLibraryCollapsed();
  }

  let apiBound = false;
  function bindSpicetify(tries = 0) {
    const S = window.Spicetify;
    if (!(S && S.Player && S.Platform)) {
      if (tries < 120) setTimeout(() => bindSpicetify(tries + 1), 300);
      return;
    }
    if (apiBound) return;
    apiBound = true;

    const resync = () => {
      seek.playing = detectPlaying();
      paintSeek();
      kickSeek();
      scheduleArtUpdate();
      syncControls();
    };
    S.Player.addEventListener("onplaypause", resync);
    S.Player.addEventListener("onprogress", paintSeek);
    S.Player.addEventListener("songchange", () => {
      resync();
      syncNowPlayingLike();
    });

    try {
      libraryApi().getEvents().addListener("operation_complete", onLibraryOperationComplete);
    } catch (_) { /* older clients: the click handler covers it */ }

    try {
      const api = S.Platform.PlayerAPI;
      (api.getEvents ? api.getEvents() : api._events).addListener("update", syncControls);
    } catch (_) { /* the click handler and the 2 s check below cover it */ }

    seek.playing = detectPlaying();
    refreshAllLikes();
  }

  function start() {
    watchRoots();
    setInterval(watchRoots, 2000); // roots can be re-created when layouts change
    bindSpicetify();
  }

  if (doc.body) start();
  else doc.addEventListener("DOMContentLoaded", start, { once: true });
})();
