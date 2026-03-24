import * as THREE from 'three';

// ── FirstPersonController ─────────────────────────────────────────────────
// WASD + mouse-look first-person camera with gravity and wall-collision.
// Uses a separate collision world (CollisionSystem) for all raycasts so
// only structural meshes (walls, towers, terrain) participate — NOT
// decorative details like battlements or corbels.
//
// Scale: 1 unit = 1 metre.
//
// Controls (active while pointer is locked):
//   W / A / S / D   — move
//   Shift (held)    — run (1.8× speed)
//   Space           — jump
//   Mouse           — look
//   ESC             — exit first-person mode

const EYE_H    = 1.68;   // camera height above feet (m)
const WALK_SPD = 5.2;    // walking speed (m/s)
const RUN_MULT = 1.80;   // sprint multiplier
const GRAVITY  = 22.0;   // downward acceleration (m/s²)
const JUMP_V   = 6.8;    // initial jump velocity (m/s)
const PLR_R    = 0.30;   // horizontal collision capsule radius (m)
const MOUSE_S  = 0.0017; // mouse sensitivity (rad/px)
const CAP_DT   = 0.05;   // max delta-time to prevent tunnelling on stutter

export class FirstPersonController {
  /**
   * @param {THREE.Camera}   camera         — the scene camera
   * @param {THREE.Group}    collisionGroup — invisible collision meshes
   * @param {HTMLElement}    domElement     — canvas element for pointer lock
   */
  constructor(camera, collisionGroup, domElement) {
    this.camera   = camera;
    this.colGroup = collisionGroup;
    this.dom      = domElement;

    this._active   = false;
    this._vy       = 0;          // vertical velocity (m/s)
    this._euler    = new THREE.Euler(0, 0, 0, 'YXZ'); // pitch=x, yaw=y
    this._k        = {};         // pressed-key map  { code: bool }
    this._rc       = new THREE.Raycaster();
    this._colMesh  = [];         // flat array of collision Mesh objects

    /** Callback fired when the controller exits (ESC / pointer-lock lost). */
    this.onExit = null;

    this._onKD = this._onKD.bind(this);
    this._onKU = this._onKU.bind(this);
    this._onMM = this._onMM.bind(this);
    this._onPL = this._onPL.bind(this);
  }

  get active() { return this._active; }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Activate FPS mode.
   * @param {THREE.Vector3} startPos — world-space starting position (feet)
   * @param {number}        yaw      — initial yaw in radians (default π = face -Z)
   */
  enable(startPos, yaw = Math.PI) {
    this._active = true;
    this._vy     = 0;

    // Flatten collision group into a mesh array for fast raycasting
    this._colMesh = [];
    this.colGroup.traverse(o => { if (o.isMesh) this._colMesh.push(o); });

    // Position camera at eye height above the spawn point
    const p = startPos ? startPos.clone() : new THREE.Vector3(0, 0, 22);
    this.camera.position.set(p.x, p.y + EYE_H, p.z);

    // Initialise look direction (yaw only — no pitch tilt on spawn)
    this._euler.set(0, yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
    this._k = {};

    document.addEventListener('keydown',           this._onKD);
    document.addEventListener('keyup',             this._onKU);
    document.addEventListener('mousemove',         this._onMM);
    document.addEventListener('pointerlockchange', this._onPL);
    this.dom.requestPointerLock();
  }

  /** Deactivate FPS mode and release pointer lock. */
  disable() {
    this._active = false;
    this._k      = {};
    document.removeEventListener('keydown',           this._onKD);
    document.removeEventListener('keyup',             this._onKU);
    document.removeEventListener('mousemove',         this._onMM);
    document.removeEventListener('pointerlockchange', this._onPL);
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  /**
   * Call once per animation frame while active.
   * @param {number} dt — elapsed seconds since last frame
   */
  update(dt) {
    if (!this._active) return;
    dt = Math.min(dt, CAP_DT);

    const k     = this._k;
    const speed = WALK_SPD * (k['ShiftLeft'] || k['ShiftRight'] ? RUN_MULT : 1);
    const yaw   = this._euler.y;

    // Forward / right basis vectors (horizontal plane only)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // forward
    const rx =  Math.cos(yaw), rz = -Math.sin(yaw); // right

    let mvx = 0, mvz = 0;
    if (k['KeyW'] || k['ArrowUp'])    { mvx += fx; mvz += fz; }
    if (k['KeyS'] || k['ArrowDown'])  { mvx -= fx; mvz -= fz; }
    if (k['KeyA'] || k['ArrowLeft'])  { mvx -= rx; mvz -= rz; }
    if (k['KeyD'] || k['ArrowRight']) { mvx += rx; mvz += rz; }

    const mvLen = Math.sqrt(mvx * mvx + mvz * mvz);
    if (mvLen > 0.001) { mvx /= mvLen; mvz /= mvLen; }

    const pos = this.camera.position;
    pos.x += mvx * speed * dt;
    pos.z += mvz * speed * dt;

    // ── Gravity + ground snap ────────────────────────────────────────────
    const gY    = this._groundAt(pos);
    const onGnd = pos.y <= gY + 0.06;

    if (onGnd) {
      pos.y = gY;
      if (k['Space'] && this._vy <= 0) {
        this._vy = JUMP_V;
      } else if (this._vy < 0) {
        this._vy = 0;
      }
    } else {
      this._vy -= GRAVITY * dt;
    }
    pos.y += this._vy * dt;
    if (pos.y < gY) { pos.y = gY; this._vy = 0; } // hard floor clamp

    // ── Wall slide (8 horizontal rays from waist) ────────────────────────
    const waist = new THREE.Vector3(pos.x, pos.y - EYE_H * 0.48, pos.z);
    this._rc.near = 0;
    this._rc.far  = PLR_R + 0.04;

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
      this._rc.set(waist, dir);
      const hits = this._rc.intersectObjects(this._colMesh, false);
      if (hits.length > 0 && hits[0].distance < PLR_R) {
        const push = PLR_R - hits[0].distance;
        pos.x -= dir.x * push;
        pos.z -= dir.z * push;
      }
    }
  }

  dispose() {
    this.disable();
    this._colMesh = [];
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  _groundAt(pos) {
    // Ray downward from eye level; returns the eye-height y above nearest floor
    this._rc.set(pos, new THREE.Vector3(0, -1, 0));
    this._rc.near = 0;
    this._rc.far  = EYE_H + 3.0;
    const hits = this._rc.intersectObjects(this._colMesh, false);
    return hits.length > 0 ? hits[0].point.y + EYE_H : EYE_H;
  }

  _onKD(e) {
    this._k[e.code] = true;
    if (e.code === 'Escape') {
      this.disable();
      if (this.onExit) this.onExit();
    }
  }

  _onKU(e) { this._k[e.code] = false; }

  _onMM(e) {
    if (!this._active || document.pointerLockElement !== this.dom) return;
    this._euler.y -= e.movementX * MOUSE_S;
    this._euler.x  = Math.max(-1.40, Math.min(1.40,
      this._euler.x - e.movementY * MOUSE_S,
    ));
    this.camera.quaternion.setFromEuler(this._euler);
  }

  _onPL() {
    // Pointer lock lost externally (e.g. user alt-tabs)
    if (this._active && document.pointerLockElement !== this.dom) {
      this._active = false;
      if (this.onExit) this.onExit();
    }
  }
}
