/* Scène 3D de fond : blob shader, anneaux, formes flottantes, particules.
   Réagit à la souris, au toucher et au défilement. */
(function () {
  'use strict';
  const canvas = document.getElementById('bg3d');
  if (!canvas || !window.THREE) { window.Scene3D = { ready: Promise.resolve() }; return; }

  const THREE = window.THREE;
  const isMobile = matchMedia('(max-width: 820px)').matches || matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile, powerPreference: 'high-performance' });
  } catch (e) { document.body.classList.add('no-webgl'); window.Scene3D = { ready: Promise.resolve() }; return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07060d, 0.045);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  /* Palette par section (cyan -> violet -> rose -> vert -> orange -> cyan) */
  const palette = [
    [0x6ee7ff, 0xa855f7], [0xa855f7, 0xec4899], [0xec4899, 0xff7a59],
    [0x34d399, 0x6ee7ff], [0xff7a59, 0xa855f7], [0x6ee7ff, 0xec4899]
  ].map(p => p.map(h => new THREE.Color(h)));

  /* ---------- Blob (sphère déformée par bruit) ---------- */
  const noise = `
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  const blobMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uAmp: { value: 0.32 }, uMouse: { value: new THREE.Vector2() },
      uC1: { value: palette[0][0].clone() }, uC2: { value: palette[0][1].clone() }
    },
    vertexShader: noise + `
      uniform float uTime; uniform float uAmp; uniform vec2 uMouse;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        vec3 p = position;
        float n = snoise(p*0.95 + vec3(uTime*0.35, uTime*0.25 + uMouse.y, uTime*0.3 + uMouse.x));
        float n2 = snoise(p*2.1 - uTime*0.4) * 0.35;
        float d = (n + n2) * uAmp;
        p += normal * d;
        vD = d;
        vec4 mv = modelViewMatrix * vec4(p,1.);
        vView = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uC1; uniform vec3 uC2; uniform float uTime;
      varying vec3 vN; varying vec3 vView; varying float vD;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(vView);
        float fres = pow(1.0 - max(dot(N,V),0.0), 2.4);
        float t = smoothstep(-0.35,0.45,vD) * 0.8 + N.y*0.2 + 0.2;
        vec3 col = mix(uC1,uC2,clamp(t,0.,1.));
        col *= 0.35 + 0.65*max(dot(N, normalize(vec3(.6,.8,.7))),0.) ;
        col += fres * mix(uC1,uC2,.5) * 1.6;
        gl_FragColor = vec4(col, 0.92);
      }`,
    transparent: true
  });
  const blobGeo = new THREE.IcosahedronGeometry(1.5, isMobile ? 24 : 48);
  const blob = new THREE.Mesh(blobGeo, blobMat);

  /* Coque filaire autour du blob */
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.15, 2),
    new THREE.MeshBasicMaterial({ color: 0x6ee7ff, wireframe: true, transparent: true, opacity: 0.12 })
  );

  /* Anneaux */
  const rings = new THREE.Group();
  [[2.7, 0.012, 0x6ee7ff], [3.2, 0.01, 0xa855f7], [3.7, 0.008, 0xec4899]].forEach(([r, t, c], i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, t, 8, 160),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 })
    );
    m.rotation.x = Math.PI / 2 + i * 0.5; m.rotation.y = i * 0.7;
    rings.add(m);
  });

  const hero = new THREE.Group();
  hero.add(blob, shell, rings);
  scene.add(hero);

  /* Formes flottantes */
  const floaters = new THREE.Group();
  const shapes = [
    new THREE.OctahedronGeometry(0.28), new THREE.TetrahedronGeometry(0.32),
    new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.TorusGeometry(0.25, 0.08, 10, 24),
    new THREE.IcosahedronGeometry(0.3, 0), new THREE.TorusKnotGeometry(0.2, 0.06, 64, 8)
  ];
  const nFloat = isMobile ? 12 : 22;
  for (let i = 0; i < nFloat; i++) {
    const m = new THREE.Mesh(
      shapes[i % shapes.length],
      new THREE.MeshBasicMaterial({ color: palette[i % palette.length][0], wireframe: true, transparent: true, opacity: 0.55 })
    );
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 5;
    m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8 - 2);
    m.userData = { s: 0.2 + Math.random() * 0.5, p: Math.random() * 6.28, y: m.position.y,
      rx: (Math.random() - .5) * .02, ry: (Math.random() - .5) * .03 };
    floaters.add(m);
  }
  scene.add(floaters);

  /* Particules */
  const N = isMobile ? 900 : 2600;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c1 = new THREE.Color(0x6ee7ff), c2 = new THREE.Color(0xa855f7), tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = 5 + Math.random() * 22, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
    pos[i * 3 + 2] = r * Math.cos(ph) - 4;
    tmp.copy(c1).lerp(c2, Math.random()); col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: isMobile ? 0.05 : 0.04, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(particles);

  /* ---------- Interaction ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (x, y) => { mouse.tx = (x / innerWidth) * 2 - 1; mouse.ty = -((y / innerHeight) * 2 - 1); };
  addEventListener('pointermove', e => onPointer(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', e => { const t = e.touches[0]; if (t) onPointer(t.clientX, t.clientY); }, { passive: true });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    mouse.tx = Math.max(-1, Math.min(1, e.gamma / 35));
    mouse.ty = Math.max(-1, Math.min(1, (e.beta - 45) / -35));
  }, { passive: true });

  let scrollP = 0, scrollSmooth = 0, scrollVel = 0;
  const updateScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    scrollP = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
  };
  addEventListener('scroll', updateScroll, { passive: true });

  /* Trajectoire du blob selon la progression (x, y, échelle) */
  const pathDesktop = [[2.4, 0, 1], [-3.3, 0, .8], [3.4, -.2, .8], [-3.4, 0, .8], [3.3, 0, .8], [0, 0, 1.15]];
  const pathMobile  = [[0, -3.1, .62], [0, 2.8, .5], [0, 2.8, .5], [0, 2.8, .5], [0, 2.8, .5], [0, 1.2, .8]];
  const lerp = (a, b, t) => a + (b - a) * t;
  const sample = (path, p) => {
    const f = p * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)), t = f - i;
    const e = t * t * (3 - 2 * t);
    return path[i].map((v, k) => lerp(v, path[i + 1][k], e));
  };

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 9 : 7;
    camera.updateProjectionMatrix();
    updateScroll();
  }
  addEventListener('resize', resize);
  resize();

  /* ---------- Boucle ---------- */
  const clock = new THREE.Clock();
  let running = true, last = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const prev = scrollSmooth;
    scrollSmooth += (scrollP - scrollSmooth) * 0.06;
    scrollVel += ((scrollSmooth - prev) * 90 - scrollVel) * 0.1;

    const path = (innerWidth <= 820) ? pathMobile : pathDesktop;
    const [px, py, sc] = sample(path, scrollSmooth);
    hero.position.set(px, py, 0);
    hero.scale.setScalar(sc * (1 + Math.abs(scrollVel) * 0.12));

    blobMat.uniforms.uTime.value = reduce ? 0 : t;
    blobMat.uniforms.uAmp.value = 0.3 + Math.min(0.5, Math.abs(scrollVel) * 0.5) + Math.abs(mouse.x * mouse.y) * 0.2;
    blobMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

    if (!reduce) {
      hero.rotation.y = t * 0.12 + mouse.x * 0.5 + scrollSmooth * 6;
      hero.rotation.x = mouse.y * 0.3;
      shell.rotation.y = -t * 0.08; shell.rotation.x = t * 0.05;
      rings.children.forEach((r, i) => { r.rotation.z = t * (0.15 + i * 0.07) * (i % 2 ? -1 : 1); });
      particles.rotation.y = t * 0.012 + scrollSmooth * 1.5;
      particles.rotation.x = scrollSmooth * 0.6;
      floaters.children.forEach(m => {
        const u = m.userData;
        m.rotation.x += u.rx + 0.003; m.rotation.y += u.ry + 0.003;
        m.position.y = u.y + Math.sin(t * u.s + u.p) * 0.6 - scrollSmooth * 3;
      });
    }

    /* Caméra : parallaxe + dérive au scroll */
    camera.position.x += ((mouse.x * 0.8) - camera.position.x) * 0.05;
    camera.position.y += ((mouse.y * 0.5 - scrollSmooth * 1.2) - camera.position.y) * 0.05;
    camera.lookAt(0, -scrollSmooth * 0.8, 0);

    /* Couleurs interpolées par section */
    const f = scrollSmooth * (palette.length - 1), i = Math.min(palette.length - 2, Math.floor(f)), k = f - i;
    blobMat.uniforms.uC1.value.copy(palette[i][0]).lerp(palette[i + 1][0], k);
    blobMat.uniforms.uC2.value.copy(palette[i][1]).lerp(palette[i + 1][1], k);
    shell.material.color.copy(blobMat.uniforms.uC1.value);
    rings.children[0].material.color.copy(blobMat.uniforms.uC1.value);
    rings.children[1].material.color.copy(blobMat.uniforms.uC2.value);

    renderer.render(scene, camera);
  }

  /* Intro : zoom d'entrée */
  hero.scale.setScalar(0.01);
  loop();
  window.Scene3D = { ready: Promise.resolve() };
})();
