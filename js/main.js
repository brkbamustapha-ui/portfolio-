(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Défilement fluide (Lenis) */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#' || id === '#accueil' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -60, duration: 1.6 });
    });
  }

  /* Texte découpé mot par mot */
  function splitWords(root) {
    let i = 0;
    (function walk(node) {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(root);
    root.classList.add('split');
    root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());
  }
  $$('.hero__title, .section__head h2').forEach(splitWords);

  /* Délais en cascade pour les éléments frères */
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = (sibs.indexOf(el) * 90) + 'ms';
  });

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
        document.dispatchEvent(new Event('app:ready'));
        $$('.hero__title').forEach(el => el.classList.add('in'));
        startTyping();
        countUp();
      }, 250);
    }
  }, 60);

  /* Nav */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navLinks');
  const setMenu = open => {
    if (lenis) open ? lenis.stop() : lenis.start();
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

  /* Parallaxe scroll : héros, fenêtres des projets, marquee */
  const heroIn = $('.hero__inner'), marquee = $('.marquee__track');
  const wins = $$('.project .win');
  const mq = marquee && marquee.getAnimations ? marquee.getAnimations()[0] : null;
  if (!reduce) {
    (function par() {
      const p = Math.min(1, scrollY / innerHeight);
      if (heroIn) { heroIn.style.transform = `translate3d(0,${p * 90}px,0)`; heroIn.style.opacity = String(1 - p * 1.1); }
      wins.forEach(w => {
        const r = w.getBoundingClientRect(), c = (r.top + r.height / 2) / innerHeight - 0.5;
        w.parentElement.style.setProperty('--ry', (-18 + c * 10).toFixed(2) + 'deg');
        w.parentElement.style.setProperty('--rx', (8 - c * 10).toFixed(2) + 'deg');
      });
      if (mq && lenis) mq.playbackRate = 1 + Math.min(6, Math.abs(lenis.velocity) * 0.35);
      requestAnimationFrame(par);
    })();
  }

  /* Apparition au scroll */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      const t = e.target; t.classList.add('in'); io.unobserve(t);
      if (t.classList.contains('reveal')) setTimeout(() => { t.classList.add('done'); t.style.transitionDelay = ''; }, 1800);
    }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .skillbar, .section__head h2.split').forEach(el => io.observe(el));

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
  const TO = 'brkbamustapha@gmail.com';
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
