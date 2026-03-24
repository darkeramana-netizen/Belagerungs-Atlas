import * as THREE from 'three';

// ── RapierFPSController ───────────────────────────────────────────────────────
// First-person camera driven by Rapier3D's KinematicCharacterController.
// Replaces the manual 8-ray wall-collision + gravity-raycast approach with
// proper physics: no clipping, stair-stepping, slope handling, and correct
// capsule-vs-convex collision.
//
// Scale: 1 unit = 1 metre.
//
// Controls (active while pointer is locked):
//   W / A / S / D   — move
//   Shift (held)    — run (1.8× speed)
//   Space           — jump
//   Mouse           — look
//   ESC             — exit first-person mode

const EYE_H    = 1.68;   // camera height above capsule bottom (m)
const WALK_SPD = 5.2;    // walking speed (m/s)
const RUN_MULT = 1.80;   // sprint multiplier
const JUMP_V   = 6.5;    // initial jump velocity (m/s)
const GRAVITY  = 22.0;   // downward acceleration (m/s²)
const CAP_H    = 1.80;   // capsule total height (m)
const CAP_R    = 0.28;   // capsule radius (m)
const MOUSE_S  = 0.0017; // mouse sensitivity (rad/px)
const CAP_DT   = 0.05;   // max delta-time cap (s)

export class RapierFPSController {
  /**
   * @param {THREE.Camera}   camera    — the Three.js scene camera
   * @param {object}         physWorld — object returned by initPhysicsWorld()
   * @param {HTMLElement}    domElement — canvas element for pointer lock
   */
  constructor(camera, physWorld, domElement) {
    this.camera = camera;
    this.phys   = physWorld;   // { world, RAPIER, step, dispose }
    this.dom    = domElement;

    this._active = false;
    this._vy     = 0;           // vertical velocity (m/s)
    this._onGnd  = false;
    this._euler  = new THREE.Euler(0, 0, 0, 'YXZ');
    this._k      = {};

    /** Callback fired when the controller exits (ESC / pointer-lock lost). */
    this.onExit  = null;

    this._charController = null;   // RAPIER KinematicCharacterController
    this._charBody       = null;   // RAPIER RigidBody (kinematic position-based)

    this._onKD = this._onKD.bind(this);
    this._onKU = this._onKU.bind(this);
    this._onMM = this._onMM.bind(this);
    this._onPL = this._onPL.bind(this);
  }

  get active() { return this._active; }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Activate FPS mode.
   * @param {THREE.Vector3} startPos — world-space starting position (feet)
   * @param {number}        yaw      — initial yaw in radians (default π = face -Z)
   */
  enable(startPos, yaw = Math.PI) {
    const { RAPIER, world } = this.phys;

    // ── Create capsule rigid body (kinematic, position-based) ───────────────
    const p  = startPos ? startPos.clone() : new THREE.Vector3(0, 0, 22);
    const cy = p.y + CAP_H / 2; // Rapier places capsule center at its midpoint

    const bdesc = RAPIER.RigidBodyDesc
      .kinematicPositionBased()
      .setTranslation(p.x, cy, p.z);
    this._charBody = world.createRigidBody(bdesc);

    const cdesc = RAPIER.ColliderDesc
      .capsule(CAP_H / 2 - CAP_R, CAP_R)  // half-height of cylinder part, radius
      .setFriction(0.0)
      .setRestitution(0.0);
    world.createCollider(cdesc, this._charBody);

    // ── KinematicCharacterController ────────────────────────────────────────
    // offset = small gap between capsule surface and colliders (prevents sinking)
    this._charController = world.createCharacterController(0.01);
    this._charController.setUp({ x: 0.0, y: 1.0, z: 0.0 });
    this._charController.setMaxSlopeClimbAngle(45 * (Math.PI / 180));
    this._charController.setMinSlopeSlideAngle(30 * (Math.PI / 180));
    this._charController.enableAutostep(0.35, 0.1, true);  // max height, min width, include dynamic bodies
    this._charController.enableSnapToGround(0.3);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera.position.set(p.x, p.y + EYE_H, p.z);
    this._euler.set(0, yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);

    this._vy    = 0;
    this._onGnd = false;
    this._k     = {};
    this._active = true;

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
    this._freePhysics();
  }

  /**
   * Call once per animation frame while active.
   * @param {number} dt — elapsed seconds since last frame
   */
  update(dt) {
    if (!this._active || !this._charController || !this._charBody) return;
    dt = Math.min(dt, CAP_DT);

    const k     = this._k;
    const speed = WALK_SPD * (k['ShiftLeft'] || k['ShiftRight'] ? RUN_MULT : 1);
    const yaw   = this._euler.y;

    // Horizontal basis
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx =  Math.cos(yaw), rz = -Math.sin(yaw);

    let mvx = 0, mvz = 0;
    if (k['KeyW'] || k['ArrowUp'])    { mvx += fx; mvz += fz; }
    if (k['KeyS'] || k['ArrowDown'])  { mvx -= fx; mvz -= fz; }
    if (k['KeyA'] || k['ArrowLeft'])  { mvx -= rx; mvz -= rz; }
    if (k['KeyD'] || k['ArrowRight']) { mvx += rx; mvz += rz; }

    const mvLen = Math.sqrt(mvx * mvx + mvz * mvz);
    if (mvLen > 0.001) { mvx /= mvLen; mvz /= mvLen; }

    // ── Vertical velocity (gravity + jump) ───────────────────────────────────
    this._onGnd = this._charController.computedGrounded();

    if (this._onGnd) {
      if (k['Space'] && this._vy <= 0) {
        this._vy = JUMP_V;
      } else if (this._vy < 0) {
        this._vy = 0;
      }
    } else {
      this._vy -= GRAVITY * dt;
    }

    const desiredMove = {
      x: mvx * speed * dt,
      y: this._vy * dt,
      z: mvz * speed * dt,
    };

    // ── Rapier character controller computes the safe movement ───────────────
    this._charController.computeColliderMovement(
      this._charBody.collider(0),
      desiredMove,
      // Query filter: null = collide with all (static bodies are already fixed)
      undefined,
      undefined,
      undefined,
    );

    const corrected = this._charController.computedMovement();

    // Apply corrected translation to kinematic body
    const pos = this._charBody.translation();
    this._charBody.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });

    // Advance the physics world one step
    this.phys.step(dt);

    // Sync Three.js camera to capsule position
    const newPos = this._charBody.translation();
    this.camera.position.set(
      newPos.x,
      newPos.y - CAP_H / 2 + EYE_H,  // feet y + eye height
      newPos.z,
    );
  }

  dispose() {
    this.disable();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _freePhysics() {
    if (this._charController) {
      this.phys.world.removeCharacterController(this._charController);
      this._charController = null;
    }
    if (this._charBody) {
      this.phys.world.removeRigidBody(this._charBody);
      this._charBody = null;
    }
  }

  _onKD(e) {
    this._k[e.code] = true;
    if (['Space','KeyW','KeyA','KeyS','KeyD',
         'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
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
    if (this._active && document.pointerLockElement !== this.dom) {
      this._active = false;
      if (this.onExit) this.onExit();
    }
  }
}
