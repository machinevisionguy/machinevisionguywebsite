/* Machine Vision Guy Concierge
   Chat widget in the bottom right corner. Answers come from the Cloudflare Worker
   (AI) when CONFIG.endpoint is set, and from local article search otherwise.
   The conversation is kept in sessionStorage so it follows the visitor across pages. */
(function () {
  'use strict';

  /* ---------- Settings ---------- */
  var CONFIG = {
    endpoint: 'https://mvg-chatbot.ericparker144.workers.dev', // Cloudflare Worker URL
    turnstileSiteKey: '0x4AAAAAAGJIKzKY7HkEEARd',  // Cloudflare Turnstile site key (public)
    web3formsKey: '67830245-61c8-4696-99eb-d14099b2a7ad', // Same key as contact.html
    teaserDelayMs: 8000,                          // Home, About, and article pages
    title: 'Machine Vision Guy Concierge',
    welcome: 'Welcome. What are you trying to learn more about?',
    teaser: 'Looking for something specific? Tell me what you are trying to solve.'
  };

  var CATS = [
    ['strategy', 'Vision Strategy & Standards'],
    ['ai', 'AI'],
    ['inspection', 'Automated Inspection'],
    ['vgr', 'Vision-Guided Robotics'],
    ['traceability', 'Traceability'],
    ['measurement', 'Measurement']
  ];
  var CAT_LABEL = {};
  CATS.forEach(function (c) { CAT_LABEL[c[0]] = c[1]; });

  var SYNONYMS = {
    defect: ['inspection'], defects: ['inspection'], scratch: ['inspection', 'defect'], dent: ['inspection', 'defect'],
    reject: ['false failure'], rejects: ['false failure'], qa: ['inspection'], quality: ['inspection'],
    gauge: ['measurement'], gauging: ['measurement'], dimension: ['measurement'], dimensional: ['measurement'], metrology: ['measurement'], laser: ['measurement'], '3d': ['measurement'],
    robot: ['vgr'], robots: ['vgr'], robotic: ['vgr'], robotics: ['vgr'], pick: ['vgr'], bin: ['vgr'], guidance: ['vgr'],
    barcode: ['traceability'], dpm: ['traceability'], ocr: ['traceability'], serial: ['traceability'], tracking: ['traceability'], code: ['traceability'],
    ml: ['ai'], learning: ['ai'], neural: ['ai'], deep: ['ai'],
    standard: ['strategy'], standards: ['strategy'], roi: ['strategy'], budget: ['strategy', 'cost']
  };
  var STOP = ' a an the and or of to for in on is are it be at this that with i my me we our you your ';

  /* ---------- Paths ---------- */
  var scriptEl = document.currentScript || document.querySelector('script[src*="concierge.js"]');
  var ROOT = new URL('../', scriptEl ? scriptEl.src : location.href);
  function abs(u) { return new URL(u, ROOT).href; }
  var path = location.pathname.toLowerCase();
  var PAGE = /\/articles\//.test(path) ? 'article'
    : /contact\.html$/.test(path) ? 'contact'
    : /subscribe\.html$/.test(path) ? 'subscribe'
    : /about\.html$/.test(path) ? 'about' : 'home';

  /* ---------- Session state ---------- */
  var KEY = 'mvg-concierge';
  var state = { open: false, msgs: [], teaserShown: false, scroll: 0 };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (saved) state = Object.assign(state, saved); } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  if (!state.msgs.length) state.msgs.push({ role: 'bot', text: CONFIG.welcome, chips: true });

  /* ---------- Helpers ---------- */
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function paras(s) { return String(s).split(/\n{2,}/).map(function (p) { return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2c-5.1 0-9.2 3.5-9.2 7.9 0 2.3 1.1 4.3 2.9 5.8L5 21.2l4.6-2.2c.8.2 1.6.3 2.4.3 5.1 0 9.2-3.5 9.2-7.9S17.1 3.2 12 3.2z"/><circle cx="8" cy="11.2" r="1.35" fill="#4CB74D"/><circle cx="12" cy="11.2" r="1.35" fill="#4CB74D"/><circle cx="16" cy="11.2" r="1.35" fill="#4CB74D"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_MIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ---------- Search index ---------- */
  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(abs('search-index.json'), { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : { items: [] }; })
        .then(function (j) { return j.items || []; })
        .catch(function () { return []; })
        .then(function (items) { return items.length ? items : cardsOnPage(); });
    }
    return indexPromise;
  }
  // Backup when search-index.json can't be loaded (for example, pages opened
  // from local files): use the article cards on the current page.
  function cardsOnPage() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('.card[data-category]'), function (c) {
      var a = c.querySelector('a[href]'), h = c.querySelector('h3');
      if (!a || !h) return;
      out.push({
        type: 'article', url: new URL(a.getAttribute('href'), location.href).href, title: h.textContent.trim(),
        categories: c.getAttribute('data-category').split(',').map(function (x) { return x.trim(); }),
        description: '', summary: '', keywords: []
      });
    });
    return out;
  }
  // Keyword search: an item matches if it contains any word the visitor typed
  // (common filler words like "the" and "how" are skipped). Items that contain
  // more of the words, or contain them in the title, rank higher.
  function tokens(q) {
    var out = [];
    String(q).toLowerCase().replace(/[^a-z0-9%.\- ]/g, ' ').split(/\s+/).forEach(function (t) {
      t = t.replace(/^[.\-]+|[.\-]+$/g, '');
      if (!t || t.length < 2 || STOP.indexOf(' ' + t + ' ') !== -1) return;
      if (out.indexOf(t) === -1) out.push(t);
      (SYNONYMS[t] || []).forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    });
    return out;
  }
  function has(text, t) {
    if (t.length >= 4) return text.indexOf(t) !== -1;   // "inspect" also finds "inspection"
    return new RegExp('(^|[^a-z0-9])' + t.replace(/[.%\-]/g, '\\$&') + '([^a-z0-9]|$)').test(text); // short words match whole words only
  }
  function score(item, toks) {
    var cats = (item.categories || []);
    var title = item.title.toLowerCase(),
        tags = ((item.keywords || []).join(' | ') + ' | ' + cats.join(' ') + ' | ' + cats.map(function (c) { return CAT_LABEL[c] || ''; }).join(' | ')).toLowerCase(),
        body = ((item.description || '') + ' ' + (item.summary || '')).toLowerCase(), s = 0;
    toks.forEach(function (t) {
      if (has(title, t)) s += 3;
      else if (has(tags, t)) s += 2;
      else if (has(body, t)) s += 1;
    });
    return s;
  }
  function search(items, q, n) {
    var toks = tokens(q);
    return items.map(function (it) { return { it: it, s: score(it, toks) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, n || 3).map(function (x) { return x.it; });
  }

  /* ---------- Build the widget ---------- */
  var root = el('div', 'mvgc');
  root.id = 'mvgc';
  root.innerHTML =
    '<div class="mvgc-teaser" hidden role="status">' +
      '<button class="mvgc-teaser-x" type="button" aria-label="Dismiss">' + ICON_X + '</button>' +
      '<strong>' + esc(CONFIG.title) + '</strong><span>' + esc(CONFIG.teaser) + '</span>' +
    '</div>' +
    '<section class="mvgc-panel" hidden aria-label="' + esc(CONFIG.title) + '">' +
      '<header class="mvgc-head"><span class="brand-mark">MVG</span><strong>' + esc(CONFIG.title) + '</strong>' +
        '<button class="mvgc-min" type="button" aria-label="Minimize chat">' + ICON_MIN + '</button></header>' +
      '<div class="mvgc-log" aria-live="polite"></div>' +
      '<form class="mvgc-input"><label class="mvgc-sr" for="mvgc-q">Your question</label>' +
        '<input id="mvgc-q" type="text" autocomplete="off" maxlength="500" placeholder="Type what you are looking for">' +
        '<button type="submit" aria-label="Send">' + ICON_SEND + '</button></form>' +
      '<div class="mvgc-ts" aria-hidden="true"></div>' +
    '</section>' +
    '<button class="mvgc-fab" type="button" aria-label="Open the Machine Vision Guy Concierge" aria-expanded="false">' + ICON_CHAT + '</button>';
  document.body.appendChild(root);

  var fab = root.querySelector('.mvgc-fab'), panel = root.querySelector('.mvgc-panel'),
      log = root.querySelector('.mvgc-log'), form = root.querySelector('.mvgc-input'),
      input = root.querySelector('#mvgc-q'), teaser = root.querySelector('.mvgc-teaser'),
      busy = false;

  /* ---------- Rendering ---------- */
  function cardHTML(it) {
    var pills = (it.categories || []).map(function (c) { return '<span class="pill">' + esc(CAT_LABEL[c] || c) + '</span>'; }).join('');
    if (!pills && it.type === 'page') pills = '<span class="pill">Page</span>';
    return '<a class="mvgc-card" href="' + esc(abs(it.url)) + '">' + pills + '<b>' + esc(it.title) + '</b></a>';
  }
  function renderMsg(m, i) {
    if (m.role === 'user') return el('div', 'mvgc-msg mvgc-user', esc(m.text));
    var b = el('div', 'mvgc-msg mvgc-bot', paras(m.text));
    if (m.chips) {
      var chips = el('div', 'mvgc-chips');
      CATS.forEach(function (c) {
        var btn = el('button', 'chip', esc(c[1])); btn.type = 'button'; btn.setAttribute('data-cat', c[0]);
        chips.appendChild(btn);
      });
      b.appendChild(chips);
    }
    if (m.cards && m.cards.length) {
      var wrap = el('div', 'mvgc-cards');
      wrap.innerHTML = m.cards.map(cardHTML).join('');
      b.appendChild(wrap);
    }
    if (m.contact === 'link') {
      var l = el('button', 'mvgc-talk', 'Talk to Machine Vision Guy about your application &rarr;'); l.type = 'button';
      b.appendChild(l);
    }
    if (m.contact === 'form') b.appendChild(contactForm(i));
    if (m.contact === 'sent') b.appendChild(el('p', 'mvgc-ok', 'Thanks. Machine Vision Guy will reply by email.'));
    return b;
  }
  function render(keepScroll) {
    log.innerHTML = '';
    state.msgs.forEach(function (m, i) { log.appendChild(renderMsg(m, i)); });
    if (busy) log.appendChild(el('div', 'mvgc-msg mvgc-bot mvgc-typing', '<i></i><i></i><i></i>'));
    if (keepScroll) log.scrollTop = state.scroll; else log.scrollTop = log.scrollHeight;
  }
  function push(m) { state.msgs.push(m); if (state.msgs.length > 40) state.msgs = state.msgs.slice(-40); save(); render(); }

  /* ---------- Open / close ---------- */
  function setOpen(open, focus) {
    state.open = open; save();
    panel.hidden = !open;
    root.classList.toggle('is-open', open);
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    fab.innerHTML = open ? ICON_X : ICON_CHAT;
    fab.setAttribute('aria-label', open ? 'Close the concierge' : 'Open the Machine Vision Guy Concierge');
    if (open) { hideTeaser(); render(true); if (focus) input.focus(); }
  }
  fab.addEventListener('click', function () { setOpen(!state.open, true); });
  root.querySelector('.mvgc-min').addEventListener('click', function () { setOpen(false); });
  log.addEventListener('scroll', function () { state.scroll = log.scrollTop; save(); });

  /* ---------- Teaser rules ---------- */
  function showTeaser() {
    if (state.open || state.teaserShown) return;
    state.teaserShown = true; save();
    teaser.hidden = false;
  }
  function hideTeaser() { teaser.hidden = true; }
  teaser.addEventListener('click', function (e) {
    if (e.target.closest('.mvgc-teaser-x')) { hideTeaser(); return; }
    setOpen(true, true);
  });
  if (!state.teaserShown && !state.open) {
    if (PAGE === 'home' || PAGE === 'about' || PAGE === 'article') {
      setTimeout(showTeaser, CONFIG.teaserDelayMs);
    }
  }

  /* ---------- Clicks inside the log ---------- */
  log.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip[data-cat]');
    if (chip) { browseCategory(chip.getAttribute('data-cat')); return; }
    if (e.target.closest('.mvgc-talk')) { push({ role: 'bot', text: 'Send Machine Vision Guy a note and you will get a reply by email.', contact: 'form' }); return; }
    var card = e.target.closest('.mvgc-card');
    if (card && window.matchMedia('(max-width: 600px)').matches) { state.open = false; save(); }
  });

  function browseCategory(cat) {
    var label = CAT_LABEL[cat];
    push({ role: 'user', text: label });
    loadIndex().then(function (items) {
      var hits = items.filter(function (it) { return (it.categories || []).indexOf(cat) !== -1; });
      if (hits.length) push({ role: 'bot', text: 'Here is what I have published on ' + label + '. You can also ask me a specific question.', cards: hits.slice(0, 4) });
      else push({ role: 'bot', text: 'Nothing is published on ' + label + ' yet. Ask me a question and I will answer it, or send it to Machine Vision Guy as a topic for a future post.', contact: 'link' });
    });
  }

  /* ---------- Asking a question ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    input.value = '';
    push({ role: 'user', text: q });
    busy = true; render();
    ask(q).then(function (m) { busy = false; push(m); }, function () { busy = false; render(); });
  });

  function history() {
    return state.msgs.filter(function (m) { return m.text && !m.chips && m.contact !== 'form' && m.contact !== 'sent'; })
      .slice(-8).map(function (m) { return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text }; });
  }

  function ask(q) {
    return loadIndex().then(function (items) {
      if (!CONFIG.endpoint) return localAnswer(items, q);
      return getToken().then(function (token) {
        return fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history(), page: location.pathname, token: token })
        });
      }).then(function (r) {
        if (r.status === 429) return { answer: 'You have reached the question limit for now. Please try again in a few minutes, or send your question to Machine Vision Guy.', articles: [], contact: true };
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (j) {
        var byUrl = {};
        items.forEach(function (it) { byUrl[it.url] = it; });
        var cards = (j.articles || []).map(function (u) { return byUrl[u]; }).filter(Boolean);
        return { role: 'bot', text: j.answer || 'I could not form an answer to that.', cards: cards, contact: j.contact ? 'link' : undefined };
      }).catch(function () { return localAnswer(items, q); });
    });
  }

  function localAnswer(items, q) {
    var hits = search(items, q, 3);
    if (hits.length) return { role: 'bot', text: 'These are the closest articles I found.', cards: hits, contact: 'link' };
    return { role: 'bot', text: 'I could not find an article on that yet. Machine Vision Guy can answer it directly.', contact: 'link' };
  }

  /* ---------- Turnstile (invisible bot check) ---------- */
  var tsWidget = null, tsWaiting = null, tsLoading = null;
  function loadTurnstile() {
    if (tsLoading) return tsLoading;
    tsLoading = new Promise(function (resolve) {
      window.mvgcTsReady = function () {
        tsWidget = window.turnstile.render(root.querySelector('.mvgc-ts'), {
          sitekey: CONFIG.turnstileSiteKey, execution: 'execute', appearance: 'interaction-only',
          callback: function (t) { if (tsWaiting) { tsWaiting(t); tsWaiting = null; } },
          'error-callback': function () { if (tsWaiting) { tsWaiting(''); tsWaiting = null; } }
        });
        resolve();
      };
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=mvgcTsReady';
      s.async = true; s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
    return tsLoading;
  }
  function getToken() {
    if (!CONFIG.turnstileSiteKey) return Promise.resolve('');
    return loadTurnstile().then(function () {
      if (tsWidget == null || !window.turnstile) return '';
      return new Promise(function (resolve) {
        tsWaiting = resolve;
        setTimeout(function () { if (tsWaiting === resolve) { tsWaiting = null; resolve(''); } }, 10000);
        window.turnstile.reset(tsWidget);
        window.turnstile.execute(tsWidget);
      });
    });
  }

  /* ---------- Talk to Machine Vision Guy (Web3Forms) ---------- */
  function contactForm(i) {
    var lastQ = '';
    for (var k = i - 1; k >= 0; k--) { if (state.msgs[k].role === 'user') { lastQ = state.msgs[k].text; break; } }
    var f = el('form', 'mvgc-form');
    f.innerHTML =
      '<input name="name" type="text" placeholder="Name" required autocomplete="name">' +
      '<input name="email" type="email" placeholder="Email" required autocomplete="email">' +
      '<textarea name="message" rows="3" placeholder="What are you working on?">' + esc(lastQ) + '</textarea>' +
      '<input type="checkbox" name="botcheck" class="mvgc-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" type="submit">Send to Machine Vision Guy</button><p class="mvgc-err" hidden></p>';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button'), err = f.querySelector('.mvgc-err');
      err.hidden = true; btn.disabled = true; btn.textContent = 'Sending...';
      var data = {
        access_key: CONFIG.web3formsKey,
        subject: 'Chatbot Question from Machine Vision Guy Website',
        from_name: 'Machine Vision Guy Concierge',
        name: f.name.value, email: f.email.value, message: f.message.value,
        page: location.href, botcheck: f.botcheck.checked ? 'on' : '',
        transcript: state.msgs.filter(function (m) { return m.text && !m.chips; })
          .map(function (m) { return (m.role === 'user' ? 'Visitor: ' : 'Concierge: ') + m.text; }).join('\n\n')
      };
      fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data)
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.success) throw new Error('fail');
        state.msgs[i].contact = 'sent'; save(); render();
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Send to Machine Vision Guy';
        err.innerHTML = 'Your message did not send. Email <a href="mailto:machinevisionguy@gmail.com">machinevisionguy@gmail.com</a>.';
        err.hidden = false;
      });
    });
    return f;
  }

  /* ---------- Start ---------- */
  if (state.open) setOpen(true, false);
})();
