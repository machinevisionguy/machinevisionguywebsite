/* Machine Vision Guy — mobile nav toggle + home filters (text search + always-visible category chips) */
(function () {
  // Mobile dropdown nav (every page)
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Contact form (posts to Web3Forms, emails the owner, shows a success notice)
  var form = document.getElementById('contact-form');
  if (form) {
    var ok = document.getElementById('form-ok');
    var err = document.getElementById('form-err');
    var btn = document.getElementById('contact-submit');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ok) ok.classList.remove('show');
      if (err) err.classList.remove('show');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.success) { if (ok) ok.classList.add('show'); form.reset(); form.style.display = 'none'; }
          else { if (err) err.classList.add('show'); }
        })
        .catch(function () { if (err) err.classList.add('show'); })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  }

  // Home filters
  var cards = document.querySelectorAll('.grid .card');
  if (!cards.length) return;
  var search = document.getElementById('search');
  var chips = document.querySelectorAll('.filter .chip[data-filter]');
  var emptyNote = document.getElementById('empty-note');

  function selected() {
    var out = [];
    chips.forEach(function (c) { if (c.classList.contains('on')) out.push(c.getAttribute('data-filter')); });
    return out;
  }

  function apply() {
    var q = ((search && search.value) || '').trim().toLowerCase();
    var sel = selected();
    var shown = 0;
    cards.forEach(function (card) {
      var cats = (card.getAttribute('data-category') || '').split(',');
      var text = (card.textContent || '').toLowerCase();
      var matchText = !q || text.indexOf(q) !== -1;
      var matchCat = !sel.length || sel.some(function (s) { return cats.indexOf(s) !== -1; });
      var vis = matchText && matchCat;
      card.classList.toggle('is-hidden', !vis);
      if (vis) shown++;
    });
    if (emptyNote) emptyNote.style.display = shown ? 'none' : 'block';
  }

  if (search) search.addEventListener('input', apply);
  chips.forEach(function (c) {
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', function () {
      c.classList.toggle('on');
      c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
      apply();
    });
  });
})();
