import * as THREE from 'three';

// ── ScaleDummy ────────────────────────────────────────────────────────────
// A simple humanoid figure exactly 1.80 m tall (feet at y=0, crown at y=1.80).
// Placed in the scene during orbit mode so editors can gauge tower heights,
// wall thicknesses, and gate clearances against a human-scale reference.
//
// Uses a distinct orange colour so it reads clearly against the stone palette.
// A red horizontal bar marks the 1.80 m line precisely.
// A white vertical post carries a "1.80m" label sprite.

const ORANGE = 0xff5500;

export function buildScaleDummy() {
  const g   = new THREE.Group();
  g.name    = 'scaleDummy';
  g.userData = { label: 'Maßstab – 1.80 m Mensch', info: 'Referenzfigur: 1 Einheit = 1 Meter. Kopf bei 1.80 m, Schulterbreite 0.38 m.' };

  const mat  = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.88 });
  const mLine = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const mPost = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });

  const add = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };

  // ── Legs (feet at y=0, hips at y=0.88) ───────────────────────────────
  add(new THREE.BoxGeometry(0.14, 0.82, 0.14), -0.10, 0.41, 0); // left
  add(new THREE.BoxGeometry(0.14, 0.82, 0.14),  0.10, 0.41, 0); // right

  // ── Torso (waist 0.88, shoulders 1.44) ───────────────────────────────
  add(new THREE.BoxGeometry(0.38, 0.58, 0.18), 0, 1.07, 0);

  // ── Arms (hang from shoulders) ────────────────────────────────────────
  add(new THREE.BoxGeometry(0.12, 0.52, 0.12), -0.27, 0.94, 0); // left
  add(new THREE.BoxGeometry(0.12, 0.52, 0.12),  0.27, 0.94, 0); // right

  // ── Head (top at 1.80) ────────────────────────────────────────────────
  add(new THREE.BoxGeometry(0.24, 0.26, 0.22), 0, 1.67, 0);

  // ── 1.80 m reference bar ─────────────────────────────────────────────
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.022, 0.022), mLine);
  bar.position.set(0, 1.80, 0);
  g.add(bar);

  // ── Vertical post to the side ────────────────────────────────────────
  // Carries a tick-mark every 0.30 m (≈ 1 foot) for quick comparison.
  const postH = 2.10;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.022, postH, 0.022), mPost);
  post.position.set(0.48, postH / 2, 0);
  g.add(post);

  // Tick marks at 0.30, 0.60, 0.90, 1.20, 1.50, 1.80 m
  for (let y = 0.30; y <= 1.80; y += 0.30) {
    const w  = y === 1.80 ? 0.14 : 0.08; // wider tick at 1.80 m
    const tk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.018), mLine);
    tk.position.set(0.48, y, 0);
    g.add(tk);
  }

  return g;
}
