import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getRenderer, getMaterials, resolveStyle } from './renderer.js';
import { buildComponent } from './builders.js';
import { generateComponents } from './generator.js';

export default function CastleDiorama({ castle }) {
  const mountRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const [info,  setInfo]  = useState(null);   // clicked component
  const [hover, setHover] = useState(null);   // hovered component label
  const infoRef  = useRef(null); infoRef.current  = setInfo;
  const hoverRef = useRef(null); hoverRef.current = setHover;

  const ac = castle.theme?.accent || '#c9a84c';

  useEffect(() => {
    let animId;
    const mount = mountRef.current;
    if (!mount) return;
    setReady(false);
    infoRef.current(null);
    hoverRef.current(null);

    try {
      const T = THREE;
      const W = mount.clientWidth || 700;
      const H = Math.min(Math.round(W * 0.60), 460);

      // ── Renderer (singleton — one WebGL context for the whole app) ───────
      const renderer = getRenderer();
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.max(1, Math.min(window.devicePixelRatio, 2)));
      if (!mount.contains(renderer.domElement)) mount.appendChild(renderer.domElement);
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
      gnd.position.y = -0.05;
      gnd.receiveShadow = true;
      scene.add(gnd);

      // ── Lighting ─────────────────────────────────────────────────────────
      scene.add(new T.AmbientLight(0xc8b89a, 2.8));

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

      // ── Anti-gravity: ensure no object sinks below the ground plane ──────
      function snapToGround(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        if (box.min.y < 0) obj.position.y -= box.min.y;
      }

      // ── Build castle ─────────────────────────────────────────────────────
      const components = castle.components || generateComponents(castle);
      const clickables  = [];

      components.forEach(comp => {
        const obj = buildComponent(comp, mats.stone, mats.dark, mats.roof, style, mats.rock);
        if (!obj) return;
        snapToGround(obj);
        scene.add(obj);
        clickables.push(obj);
      });

      // ── Auto-scale camera from outermost ring radius ─────────────────────
      const rings    = components.filter(c => c.type === 'RING');
      const maxRingR = rings.length > 0
        ? Math.max(...rings.flatMap(r => (r.points || []).map(pt => Math.sqrt((pt.x || 0) ** 2 + (pt.z || 0) ** 2))))
        : 0;

      // ── Rocky plateau for extreme-position castles ────────────────────────
      const posR = castle.ratings?.position || 50;
      if (posR >= 90 && castle.type !== 'fantasy') {
        const plateauR = maxRingR > 0 ? maxRingR + 3 : 18;
        const mesaH = 3.5;
        const mesa = new T.Mesh(
          new T.CylinderGeometry(plateauR * 0.95, plateauR + 3, mesaH, 36),
          mats.rock,
        );
        mesa.position.y = -(mesaH / 2);
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

      // ── Orbit controls ───────────────────────────────────────────────────
      let pDown = false, lastPX = 0, lastPY = 0, moved = false;

      // ── Hover highlight state ─────────────────────────────────────────────
      // On hover: clone each mesh's material and apply emissive accent glow.
      // On leave: restore originals. Uses a Map so clones are cleaned up precisely.
      let hoveredGroup  = null;
      const savedMats   = new Map(); // mesh → original material (shared)
      const accentColor = new THREE.Color(ac);

      function clearHighlight() {
        if (!hoveredGroup) return;
        // Restore original shared materials and dispose the clones
        savedMats.forEach((origMat, mesh) => {
          mesh.material.dispose();
          mesh.material = origMat;
        });
        savedMats.clear();
        hoveredGroup = null;
        hoverRef.current(null);
        renderer.domElement.style.cursor = pDown ? 'grabbing' : 'grab';
      }

      function applyHighlight(group) {
        if (group === hoveredGroup) return;
        clearHighlight();
        if (!group) return;
        hoveredGroup = group;
        hoverRef.current(group.userData.label);
        renderer.domElement.style.cursor = 'pointer';
        group.traverse(obj => {
          if (obj.isMesh) {
            savedMats.set(obj, obj.material);
            const m = obj.material.clone();
            m.emissive = accentColor.clone().multiplyScalar(0.20);
            m.emissiveIntensity = 1.0;
            obj.material = m;
          }
        });
      }

      // ── Raycaster helpers ────────────────────────────────────────────────
      const rc    = new T.Raycaster();
      const mouse = new T.Vector2();

      // Traverse up from hit mesh to nearest ancestor with a non-empty label
      function findLabelGroup(hits) {
        for (const hit of hits) {
          let o = hit.object;
          while (o) {
            if (o.userData?.label) return o;
            o = o.parent;
          }
        }
        return null;
      }

      function castRay(e) {
        const rect = mount.getBoundingClientRect();
        mouse.set(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        );
        rc.setFromCamera(mouse, camera);
        return rc.intersectObjects(clickables, true);
      }

      const onPD = e => {
        pDown = true; moved = false;
        lastPX = e.clientX; lastPY = e.clientY;
        try { mount.setPointerCapture(e.pointerId); } catch (_) {}
        renderer.domElement.style.cursor = 'grabbing';
      };

      const onPM = e => {
        if (pDown) {
          moved  = true;
          theta -= (e.clientX - lastPX) * 0.007;
          phi    = Math.max(0.12, Math.min(1.46, phi - (e.clientY - lastPY) * 0.007));
          lastPX = e.clientX; lastPY = e.clientY;
          syncCam();
          return;
        }
        // Hover raycasting (only when not dragging)
        const g = findLabelGroup(castRay(e));
        if (g) applyHighlight(g);
        else clearHighlight();
      };

      const onPU = e => {
        pDown = false;
        try { mount.releasePointerCapture(e.pointerId); } catch (_) {}
        renderer.domElement.style.cursor = hoveredGroup ? 'pointer' : 'grab';
      };

      const onLeave = () => clearHighlight();

      const onWhl = e => {
        e.preventDefault();
        camR = Math.max(7, Math.min(55, camR + e.deltaY * 0.04));
        syncCam();
      };

      const onClick = e => {
        if (moved) return;
        const g = findLabelGroup(castRay(e));
        if (g) {
          infoRef.current({ label: g.userData.label, info: g.userData.info || '' });
        } else {
          infoRef.current(null);
        }
      };

      mount.addEventListener('pointerdown',  onPD);
      mount.addEventListener('pointermove',  onPM);
      mount.addEventListener('pointerup',    onPU);
      mount.addEventListener('pointerleave', onLeave);
      mount.addEventListener('wheel',        onWhl, { passive: false });
      mount.addEventListener('click',        onClick);

      setReady(true);

      // ── Render loop ──────────────────────────────────────────────────────
      const tick = () => { animId = requestAnimationFrame(tick); renderer.render(scene, camera); };
      tick();

      // ── Cleanup ──────────────────────────────────────────────────────────
      return () => {
        cancelAnimationFrame(animId);
        mount.removeEventListener('pointerdown',  onPD);
        mount.removeEventListener('pointermove',  onPM);
        mount.removeEventListener('pointerup',    onPU);
        mount.removeEventListener('pointerleave', onLeave);
        mount.removeEventListener('wheel',        onWhl);
        mount.removeEventListener('click',        onClick);
        // Dispose any active cloned highlight materials
        savedMats.forEach((_, mesh) => { mesh.material?.dispose(); });
        savedMats.clear();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        Object.values(mats).forEach(m => { m.map?.dispose(); m.dispose(); });
      };
    } catch (e) {
      console.error('CastleDiorama error:', castle.id, e);
      setReady(true);
    }
  }, [castle.id]);

  return (
    <div style={{ width: '100%' }}>

      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', width: '100%', background: '#0c0a07',
        borderRadius: info ? '4px 4px 0 0' : '4px',
        overflow: 'hidden', minHeight: '300px',
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

        {/* Hover label — bottom-left, unobtrusive */}
        {ready && hover && (
          <div style={{
            position: 'absolute', bottom: '8px', left: '10px',
            fontSize: '10px', color: ac, letterSpacing: '1px',
            pointerEvents: 'none', textTransform: 'uppercase',
            textShadow: '0 1px 6px rgba(0,0,0,0.95)',
            opacity: 0.9,
          }}>
            {hover}
            <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: '6px' }}>↙ klick</span>
          </div>
        )}

        {/* Interaction hint — only when nothing is hovered/selected */}
        {ready && !hover && !info && (
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

      {/* ── Info panel — BELOW the canvas, never blocks the view ────────────── */}
      {ready && info && (
        <div
          onClick={() => setInfo(null)}
          style={{
            background: 'linear-gradient(180deg,rgba(14,11,8,0.98) 0%,rgba(10,8,5,0.98) 100%)',
            border: `1px solid ${ac}28`,
            borderTop: `2px solid ${ac}55`,
            borderRadius: '0 0 4px 4px',
            padding: '13px 16px 11px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: ac, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                {info.label}
              </div>
              <div style={{ fontSize: '11px', color: '#c0a880', lineHeight: '1.65' }}>
                {info.info}
              </div>
            </div>
            <div style={{ fontSize: '15px', color: `${ac}66`, flexShrink: 0, marginTop: '1px', fontWeight: 'bold' }}>✕</div>
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', marginTop: '8px', letterSpacing: '1px' }}>
            KLICK ZUM SCHLIESSEN
          </div>
        </div>
      )}
    </div>
  );
}
