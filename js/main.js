(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Loader (progression simulée + attente du chargement) */
  const loader = $('#loader'), pct = $('#loaderPct');
  let n = 0, loaded = document.readyState === 'complete';
  addEventListener('load', () => (loaded = true));
  const tick = setInterval(() => {
    n = Math.min(loaded ? 100 : 90, n + (loaded ? 8 : Math.random() * 6));
    pct.textContent = Math.floor(n);
    if (n >= 100) {
      clearInterval(tick);
      setTimeout(() => {
        loader.classList.add('done');
        document.body.classList.add('ready');
        startTyping();
        countUp();
      }, 250);
    }
  }, 60);

  /* Nav */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    links.classList.toggle('open', open);
    document.body.classList.toggle('lock', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', links).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

  /* Scroll : barre de progression + nav */
  const bar = $('#progress');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    nav.classList.toggle('scrolled', scrollY > 30);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Apparition au scroll */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .skillbar').forEach(el => io.observe(el));

  /* Texte tapé */
  function startTyping() {
    const el = $('#typed');
    const words = ['les restaurants', 'les boutiques en ligne', 'les startups', 'les artisans', "l'immobilier", 'tous les business'];
    if (reduce) { el.textContent = words[words.length - 1]; return; }
    let w = 0, c = 0, del = false;
    (function step() {
      const word = words[w];
      el.textContent = word.slice(0, c);
      if (!del && c === word.length) { del = true; return setTimeout(step, 1600); }
      if (del && c === 0) { del = false; w = (w + 1) % words.length; return setTimeout(step, 300); }
      c += del ? -1 : 1;
      setTimeout(step, del ? 35 : 75);
    })();
  }

  /* Compteurs */
  function countUp() {
    $$('[data-count]').forEach(el => {
      const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), d = 1800;
      (function f(t) {
        const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e) + suf;
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    });
  }

  /* Tilt 3D des cartes + halo qui suit la souris (desktop) */
  if (fine && !reduce) {
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 14}deg) translateZ(8px)`;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* Boutons magnétiques */
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    /* Curseur personnalisé */
    const cur = $('#cursor'); let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); }, { passive: true });
    (function loop() { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
    $$('a,button,.tilt,.chips li').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('big'));
    });
  }

  /* Formulaire -> ouvre le client mail (à remplacer par Formspree/Supabase si besoin) */
  const form = $('#form'), status = $('#formStatus');
  const TO = 'contact@votre-site.com';
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email) || !d.msg.trim()) {
      status.className = 'form__status err';
      status.textContent = 'Merci de remplir correctement tous les champs.';
      return;
    }
    const body = `Nom: ${d.name}\nEmail: ${d.email}\nProjet: ${d.type}\n\n${d.msg}`;
    location.href = `mailto:${TO}?subject=${encodeURIComponent('Projet web — ' + d.type)}&body=${encodeURIComponent(body)}`;
    status.className = 'form__status';
    status.textContent = 'Merci ! Votre application mail va s\'ouvrir.';
    form.reset();
  });

  $('#year').textContent = new Date().getFullYear();
})();
