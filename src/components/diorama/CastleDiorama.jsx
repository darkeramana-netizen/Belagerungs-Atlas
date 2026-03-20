import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getRenderer, getMaterials, resolveStyle } from './renderer.js';
import { buildComponent } from './builders.js';
import { generateComponents } from './generator.js';

export default function CastleDiorama({ castle }) {
  const mountRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const [info,  setInfo]  = useState(null);
  // Keep setInfo stable across re-renders so the animation loop can call it
  const infoRef = useRef(null);
  infoRef.current = setInfo;

  const ac = castle.theme?.accent || '#c9a84c';

  useEffect(() => {
    let animId;
    const mount = mountRef.current;
    if (!mount) return;
    setReady(false);
    infoRef.current(null);

    try {
      const T = THREE;
      const W = mount.clientWidth || 700;
      const H = Math.min(Math.round(W * 0.60), 460);

      // ── Renderer (singleton — one WebGL context for the whole app) ───────
      const renderer = getRenderer();
      renderer.setSize(W, H);
      // DPR clamped to [1, 2] — below 1 causes blurriness, above 2 wastes GPU
      renderer.setPixelRatio(Math.max(1, Math.min(window.devicePixelRatio, 2)));
      if (!mount.contains(renderer.domElement)) mount.appendChild(renderer.domElement);
      // Pin pixel size explicitly so CSS 100%/100% doesn't rescale the canvas
      renderer.domElement.style.cssText = `display:block;width:${W}px;height:${H}px;cursor:grab;max-width:100%;`;

      // ── Scene ────────────────────────────────────────────────────────────
      const scene = new T.Scene();
      scene.background = new T.Color(0x0c0a07);
      scene.fog = new T.FogExp2(0x0c0a07, 0.016);

      // ── Camera ───────────────────────────────────────────────────────────
      const camera = new T.PerspectiveCamera(52, W / H, 0.1, 200);

      // ── Materials (style-aware palette) ─────────────────────────────────
      const style = resolveStyle(castle);
      const mats  = getMaterials(style);

      // ── Ground disc ──────────────────────────────────────────────────────
      const gnd = new T.Mesh(new T.CircleGeometry(55, 48), mats.ground);
      gnd.rotation.x = -Math.PI / 2;
      gnd.receiveShadow = true;
      scene.add(gnd);

      // ── Lighting ─────────────────────────────────────────────────────────
      const amb  = new T.AmbientLight(0xc8b89a, 2.8);
      scene.add(amb);

      const sun  = new T.DirectionalLight(0xfff8e8, 5.5);
      sun.position.set(22, 32, 14);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far  = 120;
      sun.shadow.camera.left  = -40; sun.shadow.camera.right  = 40;
      sun.shadow.camera.top   =  40; sun.shadow.camera.bottom = -40;
      scene.add(sun);

      const fill = new T.DirectionalLight(0x9ab0cc, 1.8);
      fill.position.set(-18, 12, -22);
      scene.add(fill);

      // ── Build castle ─────────────────────────────────────────────────────
      const components = castle.components || generateComponents(castle);
      const clickables  = [];

      components.forEach(comp => {
        const obj = buildComponent(comp, mats.stone, mats.dark, mats.roof, style);
        if (!obj) return;
        scene.add(obj);
        clickables.push(obj);
      });

      // ── Auto-scale camera from outermost ring radius ─────────────────────
      const rings    = components.filter(c => c.type === 'RING');
      const maxRingR = rings.length > 0
        ? Math.max(...rings.flatMap(r => (r.points || []).map(pt => Math.sqrt((pt.x || 0) ** 2 + (pt.z || 0) ** 2))))
        : 0;

      // ── Rocky plateau for extreme-position castles (Masada-type) ─────────
      // Mesa top = y=0 so buildings sit on top. Extends downward as a cliff.
      const posR = castle.ratings?.position || 50;
      if (posR >= 90 && castle.type !== 'fantasy') {
        const plateauR = maxRingR > 0 ? maxRingR + 3 : 18;
        const mesaH = 3.5;
        const mesa = new T.Mesh(
          new T.CylinderGeometry(plateauR * 0.95, plateauR + 3, mesaH, 36),
          new T.MeshStandardMaterial({ color: 0x2a2015, roughness: 0.97, metalness: 0.0 }),
        );
        mesa.position.y = -(mesaH / 2); // top surface at y=0
        mesa.receiveShadow = true;
        mesa.castShadow   = true;
        scene.add(mesa);
      }

      let theta = Math.PI * 0.85, phi = 0.78;
      let camR  = maxRingR > 0 ? Math.max(26, maxRingR * 2.4) : (castle.components ? 32 : 26);
      const tgt = new T.Vector3(0, maxRingR > 12 ? 8 : 4, 0);

      function syncCam() {
        camera.position.set(
          tgt.x + camR * Math.sin(phi) * Math.sin(theta),
          tgt.y + camR * Math.cos(phi),
          tgt.z + camR * Math.sin(phi) * Math.cos(theta),
        );
        camera.lookAt(tgt);
      }
      syncCam();

      // ── Orbit controls (pointer-based) ───────────────────────────────────
      let pDown = false, lastPX = 0, lastPY = 0, moved = false;

      const onPD = e => {
        pDown = true; moved = false;
        lastPX = e.clientX; lastPY = e.clientY;
        try { mount.setPointerCapture(e.pointerId); } catch (_) {}
        renderer.domElement.style.cursor = 'grabbing';
      };
      const onPM = e => {
        if (!pDown) return;
        moved  = true;
        theta -= (e.clientX - lastPX) * 0.007;
        phi    = Math.max(0.12, Math.min(1.46, phi - (e.clientY - lastPY) * 0.007));
        lastPX = e.clientX; lastPY = e.clientY;
        syncCam();
      };
      const onPU = e => {
        pDown = false;
        try { mount.releasePointerCapture(e.pointerId); } catch (_) {}
        renderer.domElement.style.cursor = 'grab';
      };
      const onWhl = e => {
        e.preventDefault();
        camR = Math.max(7, Math.min(55, camR + e.deltaY * 0.04));
        syncCam();
      };

      // ── Raycaster (click → info overlay) ────────────────────────────────
      const rc = new T.Raycaster();
      const mouse = new T.Vector2();

      const onClick = e => {
        if (moved) return;
        const rect = mount.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        );
        rc.setFromCamera(mouse, camera);
        const hits = rc.intersectObjects(clickables, true);
        if (hits.length) {
          let o = hits[0].object;
          while (o && !o.userData?.label) o = o.parent;
          infoRef.current(o?.userData?.label ? { label: o.userData.label, info: o.userData.info || '' } : null);
        } else {
          infoRef.current(null);
        }
      };

      mount.addEventListener('pointerdown', onPD);
      mount.addEventListener('pointermove', onPM);
      mount.addEventListener('pointerup',   onPU);
      mount.addEventListener('wheel', onWhl, { passive: false });
      mount.addEventListener('click', onClick);

      setReady(true);

      // ── Render loop ──────────────────────────────────────────────────────
      const tick = () => { animId = requestAnimationFrame(tick); renderer.render(scene, camera); };
      tick();

      // ── Cleanup ──────────────────────────────────────────────────────────
      return () => {
        cancelAnimationFrame(animId);
        mount.removeEventListener('pointerdown', onPD);
        mount.removeEventListener('pointermove', onPM);
        mount.removeEventListener('pointerup',   onPU);
        mount.removeEventListener('wheel', onWhl);
        mount.removeEventListener('click', onClick);
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        // Dispose all geometries + materials to free GPU memory
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        Object.values(mats).forEach(m => m.dispose());
      };
    } catch (e) {
      console.error('CastleDiorama error:', castle.id, e);
      setReady(true);
    }
  }, [castle.id]);

  return (
    <div style={{
      position: 'relative', width: '100%', background: '#0c0a07',
      borderRadius: '4px', overflow: 'hidden', minHeight: '300px',
    }}>
      <div ref={mountRef} style={{ width: '100%', minHeight: '300px' }} />

      {/* Loading spinner */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          background: 'rgba(12,10,7,0.9)',
        }}>
          <div style={{
            width: '32px', height: '32px', border: '2px solid ' + ac,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: '11px', color: ac, letterSpacing: '2px', opacity: 0.7 }}>
            3D DIORAMA LÄDT
          </div>
        </div>
      )}

      {/* Click info overlay */}
      {ready && info && (
        <div onClick={() => setInfo(null)} style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(0deg,rgba(8,6,4,0.97) 0%,rgba(8,6,4,0.85) 70%,transparent 100%)',
          padding: '18px 16px 16px', cursor: 'pointer', userSelect: 'none',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: ac, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
            {info.label}
          </div>
          <div style={{ fontSize: '11px', color: '#c0a880', lineHeight: '1.6', maxWidth: '520px' }}>
            {info.info}
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '8px', letterSpacing: '1px' }}>
            KLICK ZUM SCHLIESSEN
          </div>
        </div>
      )}

      {/* Interaction hint */}
      {ready && !info && (
        <div style={{
          position: 'absolute', bottom: '8px', right: '10px',
          fontSize: '9px', color: 'rgba(255,255,255,0.18)',
          pointerEvents: 'none', letterSpacing: '0.8px',
        }}>
          ZIEHEN · ZOOM · KLICK = INFO
        </div>
      )}

      {/* Castle name badge */}
      <div style={{
        position: 'absolute', top: '8px', left: '10px',
        fontSize: '10px', color: ac, opacity: 0.55,
        letterSpacing: '1.5px', pointerEvents: 'none', textTransform: 'uppercase',
      }}>
        🏰 {castle.name.slice(0, 26)}
      </div>
    </div>
  );
}
