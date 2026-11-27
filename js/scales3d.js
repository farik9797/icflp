// 3D-весы в блоке «Как мы ведём дело».
// Весы начинают с перекоса (нарушенное право) и по мере прохождения этапов приходят в равновесие.
// Прогресс приходит из site.js событием "scales:progress" (ScrollTrigger), своих scroll-слушателей нет.
// Three.js грузится только когда блок подходит к экрану; при reduced motion рисуется один статичный кадр.

const stage = document.querySelector("[data-scales]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Слабое устройство или экономия трафика: вместо 3D статичное фото
if (stage && document.documentElement.classList.contains("lite")) {
  stage.classList.add("is-fallback");
} else if (stage) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        boot().catch(fail);
      }
    },
    { rootMargin: "600px 0px" }
  );
  io.observe(stage);
}

function fail(err) {
  console.warn("[scales3d] показываю фото вместо 3D:", err && err.message ? err.message : err);
  stage.classList.add("is-fallback");
}

async function boot() {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  // центр кадра: весы занимают по высоте 0…3,25 (подставка, колонна, стрелка)
  const lookAt = new THREE.Vector3(0, 1.62, 0);

  // Свет: тёплый ключевой, как рассветное солнце в видео, и холодный контровой из ночного неба
  scene.add(new THREE.HemisphereLight(0xc4cee8, 0x0a1020, 0.35));
  const key = new THREE.DirectionalLight(0xffe2b4, 2.6);
  key.position.set(3.5, 5.5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f9ad8, 1.8);
  rim.position.set(-4.5, 3.5, -4.5);
  scene.add(rim);

  // Материалы: латунь трёх оттенков
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: 0.27 });
  const brassDeep = new THREE.MeshStandardMaterial({ color: 0xa8843f, metalness: 1, roughness: 0.36 });
  const brassBright = new THREE.MeshStandardMaterial({ color: 0xdcbb72, metalness: 1, roughness: 0.18 });
  const brassShell = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: 0.24, side: THREE.DoubleSide });

  const V2 = (x, y) => new THREE.Vector2(x, y);
  const lathe = (pts, mat, seg = 96) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg), mat);

  const model = new THREE.Group();
  scene.add(model);

  // Подставка
  model.add(
    lathe(
      [[0, 0], [0.8, 0], [0.82, 0.025], [0.82, 0.065], [0.78, 0.09], [0.76, 0.12], [0.63, 0.15], [0.56, 0.19], [0.54, 0.24],
       [0.42, 0.27], [0.3, 0.32], [0.23, 0.4], [0.2, 0.48], [0.22, 0.51], [0.22, 0.56], [0, 0.56]],
      brassDeep
    )
  );
  // Ваза у основания колонны
  model.add(
    lathe(
      [[0, 0.55], [0.17, 0.55], [0.21, 0.6], [0.25, 0.7], [0.235, 0.8], [0.17, 0.9], [0.11, 0.97], [0.125, 1.0], [0.125, 1.04], [0.08, 1.07], [0, 1.07]],
      brass
    )
  );
  // Колонна
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.07, 1.48, 48), brass);
  column.position.y = 1.07 + 0.74;
  model.add(column);
  for (const y of [1.72, 2.44]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.017, 12, 48), brassBright);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    model.add(ring);
  }
  // Капитель
  model.add(lathe([[0, 2.53], [0.075, 2.53], [0.12, 2.58], [0.13, 2.62], [0.1, 2.64], [0, 2.64]], brassDeep));

  // Коромысло: качается вокруг оси на вершине колонны
  const PIVOT_Y = 2.72;
  const HALF = 1.3;
  const END_LIFT = 0.1;
  const beam = new THREE.Group();
  beam.position.y = PIVOT_Y;
  model.add(beam);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-HALF, END_LIFT, 0),
    new THREE.Vector3(-0.9, 0.025, 0),
    new THREE.Vector3(-0.42, -0.015, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.42, -0.015, 0),
    new THREE.Vector3(0.9, 0.025, 0),
    new THREE.Vector3(HALF, END_LIFT, 0),
  ]);
  beam.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.028, 14), brass));
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 24), brassBright);
  beam.add(hub);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 24), brassDeep);
  axle.rotation.x = Math.PI / 2;
  beam.add(axle);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), brassBright);
    cap.position.set(s * HALF, END_LIFT, 0);
    beam.add(cap);
  }
  // Стрелка равновесия: смотрит строго вверх, когда чаши уравновешены
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.42, 20), brassBright);
  needle.position.y = 0.27;
  beam.add(needle);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 20, 14), brassBright);
  tip.position.y = 0.5;
  beam.add(tip);

  // Чаши на цепях
  const RIM_Y = -1.3;
  const RIM_R = 0.43;
  const linkGeo = new THREE.TorusGeometry(0.02, 0.0055, 6, 14);
  linkGeo.scale(1, 1.55, 1);
  const up = new THREE.Vector3(0, 1, 0);

  function makePan() {
    const g = new THREE.Group();
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 10, 32), brassBright);
    hook.position.y = -0.045;
    g.add(hook);

    const top = new THREE.Vector3(0, -0.085, 0);
    const rims = [0, 1, 2].map((i) => {
      const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
      return new THREE.Vector3(Math.cos(a) * RIM_R, RIM_Y, Math.sin(a) * RIM_R);
    });
    const counts = rims.map((r) => Math.floor(r.distanceTo(top) / 0.047));
    const chains = new THREE.InstancedMesh(linkGeo, brass, counts.reduce((a, b) => a + b, 0));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qTwist = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    let k = 0;
    rims.forEach((r, ci) => {
      const dir = r.clone().sub(top);
      const len = dir.length();
      dir.normalize();
      const qa = new THREE.Quaternion().setFromUnitVectors(up, dir);
      for (let i = 0; i < counts[ci]; i++) {
        p.copy(top).addScaledVector(dir, (i + 0.5) * (len / counts[ci]));
        qTwist.setFromAxisAngle(up, (i % 2) * (Math.PI / 2));
        q.copy(qa).multiply(qTwist);
        m.compose(p, q, one);
        chains.setMatrixAt(k++, m);
      }
    });
    g.add(chains);

    const bowl = lathe([[0, 0], [0.12, 0.004], [0.25, 0.022], [0.35, 0.055], [0.42, 0.1], [0.455, 0.135], [0.465, 0.145]], brassShell, 80);
    bowl.position.y = RIM_Y - 0.145;
    g.add(bowl);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.465, 0.011, 10, 80), brassBright);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = RIM_Y;
    g.add(lip);
    model.add(g);
    return g;
  }
  const panL = makePan();
  const panR = makePan();

  // Мягкая контактная тень под подставкой
  const sh = document.createElement("canvas");
  sh.width = sh.height = 128;
  const ctx = sh.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.6)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.25)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  model.add(shadow);

  // Состояние
  const TILT0 = 0.24; // ~14°: левая чаша перевешивает
  const smooth = (t) => t * t * (3 - 2 * t);
  let progress = reduce ? 1 : parseFloat(stage.dataset.progress || "0") || 0;
  const tiltFor = (p) => TILT0 * (1 - smooth(Math.min(Math.max(p, 0), 1)));
  const yawFor = (p) => -0.5 + 0.75 * smooth(Math.min(Math.max(p, 0), 1));

  let theta = tiltFor(progress);
  let thetaV = 0;
  let swing = 0;
  let swingV = 0;
  let yaw = yawFor(progress);
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let dist = 9;
  let dirty = true;

  function place() {
    beam.rotation.z = theta;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // концы коромысла в координатах модели
    panL.position.set(-HALF * c - END_LIFT * s, PIVOT_Y + -HALF * s + END_LIFT * c, 0);
    panR.position.set(HALF * c - END_LIFT * s, PIVOT_Y + HALF * s + END_LIFT * c, 0);
    panL.rotation.z = swing;
    panR.rotation.z = swing;
    model.rotation.y = yaw + pointer.x * 0.14;
    model.rotation.x = pointer.y * 0.04;
    camera.position.set(0, lookAt.y + dist * 0.07, dist);
    camera.lookAt(lookAt);
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    // с запасом: подставка и тень не должны упираться в нижний край на невысоких экранах
    dist = Math.max(4.3 / 2 / Math.tan(vf / 2), 4.4 / 2 / Math.tan(hf / 2));
    camera.updateProjectionMatrix();
    dirty = true;
    if (!running) draw();
  }

  function draw() {
    place();
    renderer.render(scene, camera);
    dirty = false;
    if (!stage.classList.contains("is-ready")) stage.classList.add("is-ready");
  }

  // Физика: коромысло тянется к целевому углу пружиной с затуханием, чаши слегка раскачиваются
  function step(dt) {
    const target = tiltFor(progress);
    const acc = 26 * (target - theta) - 7.2 * thetaV;
    thetaV += acc * dt;
    theta += thetaV * dt;
    const sAcc = -18 * swing - 2.6 * swingV - acc * 0.55;
    swingV += sAcc * dt;
    swing += swingV * dt;
    const k = 1 - Math.exp(-dt * 4);
    yaw += (yawFor(progress) - yaw) * k;
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    const moving =
      Math.abs(thetaV) > 1e-4 || Math.abs(target - theta) > 1e-4 || Math.abs(swing) > 1e-4 || Math.abs(swingV) > 1e-4 ||
      Math.abs(yawFor(progress) - yaw) > 1e-4 || Math.abs(pointer.tx - pointer.x) > 1e-4 || Math.abs(pointer.ty - pointer.y) > 1e-4;
    if (moving) dirty = true;
  }

  let running = false;
  let raf = 0;
  let last = 0;
  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    step(dt);
    if (dirty) draw();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running || reduce) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  new ResizeObserver(resize).observe(stage);
  resize();
  draw();

  if (!reduce) {
    stage.addEventListener("scales:progress", (e) => {
      progress = e.detail;
      dirty = true;
    });
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(stage);

    const section = stage.closest("section");
    if (section && window.matchMedia("(pointer: fine)").matches) {
      section.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        pointer.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      });
      section.addEventListener("pointerleave", () => {
        pointer.tx = 0;
        pointer.ty = 0;
      });
    }
  }
}
