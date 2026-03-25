import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { getRenderer, getMaterials, getScenePreset, resolveStyle, mkTerrainMat } from './renderer.js';
import { buildComponent } from './builders.js';
import { generateComponents } from './generator.js';
import { getDioramaModel } from './normalize.js';
import { initPhysicsWorld } from './PhysicsWorld.js';
import { RapierFPSController } from './RapierFPSController.js';
import { buildScaleDummy } from './ScaleDummy.js';
import { buildSky } from './SkySystem.js';
import { buildNature }     from './NatureSystem.js';
import { ChunkManager }   from './ChunkManager.js';
import { validateDiorama, printValidationReport } from './DioramaValidator.js';

export default function CastleDiorama({ castle }) {
  const mountRef  = useRef(null);
  const [ready,    setReady]    = useState(false);
  const [info,     setInfo]     = useState(null);
  const [hover,    setHover]    = useState(null);
  const [fpsMode,  setFpsMode]  = useState(false);
  const [showDummy, setShowDummy] = useState(false);

  const infoRef   = useRef(null); infoRef.current   = setInfo;
  const hoverRef  = useRef(null); hoverRef.current  = setHover;
  // Refs used inside the animation-loop closure (no re-render needed)
  const fpsModeRef   = useRef(false);
  const showDummyRef = useRef(false);
  const fpsCtrlRef   = useRef(null);
  const dummyRef     = useRef(null);
  // Expose toggle functions to buttons outside useEffect
  const toggleFpsRef   = useRef(null);
  const toggleDummyRef = useRef(null);

  const ac = castle.theme?.accent || '#c9a84c';
  const model = useMemo(() => getDioramaModel(castle), [castle]);

  useEffect(() => {
    let animId;
    let cleanupFns = [];        // collected in async setup, called in cleanup
    let cancelled  = false;

    const mount = mountRef.current;
    if (!mount) return;
    setReady(false);
    infoRef.current(null);
    hoverRef.current(null);

    (async () => { try {
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

      // ── Camera ───────────────────────────────────────────────────────────
      const camera = new T.PerspectiveCamera(52, W / H, 0.1, 6000);

      // ── Materials (style-aware palette) ─────────────────────────────────
      const style = model.style || resolveStyle(castle);
      const mats  = getMaterials(style);
      const scenePreset = getScenePreset(style);

      // ── Sky (Preetham model) + environment map ────────────────────────────
      const skySystem = buildSky(renderer, scene, style);
      scene.environment = skySystem.envMap;   // IBL reflections on all PBR mats
      scene.fog = new T.FogExp2(skySystem.fogColor, skySystem.fogDensity);

      // ── Lighting ─────────────────────────────────────────────────────────
      scene.add(new T.AmbientLight(scenePreset.ambient.color, scenePreset.ambient.intensity));

      const sun  = new T.DirectionalLight(scenePreset.sun.color, scenePreset.sun.intensity);
      sun.position.set(...scenePreset.sun.position);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far  = 120;
      sun.shadow.camera.left  = -40; sun.shadow.camera.right  = 40;
      sun.shadow.camera.top   =  40; sun.shadow.camera.bottom = -40;
      sun.shadow.bias       = -0.0008;   // prevents shadow acne on flat walls
      sun.shadow.normalBias =  0.02;     // prevents self-shadowing artefacts
      scene.add(sun);

      const fill = new T.DirectionalLight(scenePreset.fill.color, scenePreset.fill.intensity);
      fill.position.set(...scenePreset.fill.position);
      scene.add(fill);

      const rim = new T.DirectionalLight(scenePreset.rim.color, scenePreset.rim.intensity);
      rim.position.set(...scenePreset.rim.position);
      scene.add(rim);

      // ── Anti-gravity: ensure no object sinks below the ground plane ──────
      function snapToGround(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        if (box.min.y < 0) obj.position.y -= box.min.y;
      }

      // ── Build castle ─────────────────────────────────────────────────────
      const components  = model.components || generateComponents(castle);
      const globalScale = model.scale || 1.0;
      const clickables  = [];

      components.forEach(comp => {
        const obj = buildComponent(comp, mats.stone, mats.dark, mats.roof, style, mats.rock, mats.water, globalScale);
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

      // ── Chunk-based world terrain (Minecraft-style, infinite, castleBaseY-aware) ──
      // castleBaseY = y of the lowest RING component = natural ground level for the
      // castle (outer ring base).  Terrain smoothly rises to this height at the flat
      // zone so the outer ring walls sit flush with the landscape — no visible box.
      const castleBaseY = rings.length > 0
        ? Math.min(...rings.map(r => r.y ?? 0))
        : 0;

      // ── Principle 3 – Validation: reachability + snap connectivity ────────
      const validationReport = validateDiorama(components, { castleBaseY });
      printValidationReport(validationReport, castle.id || 'unknown');

      const terrainSeed = Math.abs(castle.id?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42) % 9999;
      const terrain = new ChunkManager({
        style,
        seed:        terrainSeed,
        castleR:     maxRingR || 20,
        castleBaseY,
        mat:         mkTerrainMat(style),
      });
      terrain.init(scene);

      // ── Nature scatter (instanced rocks / boulders / stones on terrain) ───
      const nature = buildNature(terrain, maxRingR || 20, style, terrainSeed ^ 0xf00d);
      nature.add(scene);

      // ── Physics world (Rapier — async WASM init) ──────────────────────────
      if (cancelled) return;
      const physWorld = await initPhysicsWorld(components, terrain.getPhysicsData());
      if (cancelled) { physWorld.dispose(); return; }

      // ── Scale dummy (1.80 m reference figure, hidden by default) ──────────
      const dummy = buildScaleDummy();
      dummy.visible = false;
      // Place just outside the outermost ring, on terrain surface
      const dummySpawnZ = (maxRingR > 0 ? maxRingR : 18) * 1.12;
      dummy.position.set(0, terrain.getHeightAt(0, dummySpawnZ), dummySpawnZ);
      scene.add(dummy);
      dummyRef.current = dummy;

      // ── FPS controller (Rapier capsule controller) ────────────────────────
      const fpsCtrl = new RapierFPSController(camera, physWorld, renderer.domElement);
      fpsCtrl.onExit = () => {
        fpsModeRef.current = false;
        setFpsMode(false);
        renderer.domElement.style.cursor = 'grab';
        syncCam(); // restore orbit camera
      };
      fpsCtrlRef.current = fpsCtrl;

      // FPS spawn: outside the castle footprint (polygon TERRAIN_STACK layers
      // can extend to ~2× the outer ring radius at their widest scale).
      // Using ×2.2 + 6 m places the player on the natural FBM terrain apron,
      // clearly outside any polygon geometry, at the actual terrain surface.
      const spawnZ      = (maxRingR > 0 ? maxRingR : 18) * 2.2 + 6;
      const spawnY      = terrain.getHeightAt(0, spawnZ) + 1.2;
      const fpsSpawnPos = new T.Vector3(0, spawnY, spawnZ);

      // ── Toggle helpers exposed to React buttons ───────────────────────────
      toggleFpsRef.current = () => {
        if (fpsModeRef.current) {
          fpsCtrl.disable();
          fpsModeRef.current = false;
          setFpsMode(false);
          renderer.domElement.style.cursor = 'grab';
          syncCam();
        } else {
          fpsModeRef.current = true;
          setFpsMode(true);
          renderer.domElement.style.cursor = 'none';
          fpsCtrl.enable(fpsSpawnPos, Math.PI);
        }
      };

      toggleDummyRef.current = () => {
        showDummyRef.current = !showDummyRef.current;
        dummy.visible = showDummyRef.current;
        setShowDummy(showDummyRef.current);
      };

      let theta = Math.PI * 0.85, phi = 0.78;
      let camR  = model.cameraRadius || (maxRingR > 0 ? Math.max(26, maxRingR * 2.4) : (castle.components ? 32 : 26));
      const tgt = new T.Vector3(
        model.focus?.x || 0,
        model.focus?.y || (maxRingR > 12 ? 8 : 4),
        model.focus?.z || 0,
      );

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
        if (fpsModeRef.current) return; // orbit disabled in FPS mode
        pDown = true; moved = false;
        lastPX = e.clientX; lastPY = e.clientY;
        try { mount.setPointerCapture(e.pointerId); } catch (_) {}
        renderer.domElement.style.cursor = 'grabbing';
      };

      const onPM = e => {
        if (fpsModeRef.current) return;
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
        if (fpsModeRef.current) return;
        camR = Math.max(7, Math.min(55, camR + e.deltaY * 0.04));
        syncCam();
      };

      const onClick = e => {
        if (fpsModeRef.current || moved) return;
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

      // ── Orbit-input guards (disabled in FPS mode) ─────────────────────────
      // (applied inline in onPD / onPM via fpsModeRef check)

      // ── Render loop ──────────────────────────────────────────────────────
      let lastT = performance.now();
      const tick = () => {
        animId = requestAnimationFrame(tick);
        const now = performance.now();
        const dt  = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        if (fpsModeRef.current) fpsCtrl.update(dt);
        // Stream new terrain chunks around camera
        terrain.update(camera.position.x, camera.position.z, scene);
        renderer.render(scene, camera);
      };
      tick();

      // ── Register async-phase cleanup ─────────────────────────────────────
      cleanupFns.push(() => {
        fpsCtrl.dispose();
        physWorld.dispose();
        skySystem.dispose();
        nature.dispose();
        terrain.dispose();
        scene.environment = null;
        fpsModeRef.current = false;
        mount.removeEventListener('pointerdown',  onPD);
        mount.removeEventListener('pointermove',  onPM);
        mount.removeEventListener('pointerup',    onPU);
        mount.removeEventListener('pointerleave', onLeave);
        mount.removeEventListener('wheel',        onWhl);
        mount.removeEventListener('click',        onClick);
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
      });

    } catch (e) {
      console.error('CastleDiorama error:', castle.id, e);
      setReady(true);
    } })(); // end async IIFE

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      cleanupFns.forEach(fn => fn());
    };
  }, [
    castle.id,
    castle.type,
    castle.ratings?.position,
    model.cameraRadius,
    model.components,
    model.focus?.x,
    model.focus?.y,
    model.focus?.z,
    model.scale,
    model.style,
    model.terrainModel,
  ]);

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
        {ready && !hover && !info && !fpsMode && (
          <div style={{
            position: 'absolute', bottom: '8px', right: '10px',
            fontSize: '9px', color: 'rgba(255,255,255,0.18)',
            pointerEvents: 'none', letterSpacing: '0.8px',
          }}>
            ZIEHEN · ZOOM · KLICK = INFO
          </div>
        )}

        {/* FPS mode overlay — crosshair + controls hint */}
        {fpsMode && (
          <>
            {/* Crosshair */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ position: 'relative', width: 18, height: 18 }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1.5, background: 'rgba(255,255,255,0.82)', transform: 'translateY(-50%)' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, background: 'rgba(255,255,255,0.82)', transform: 'translateX(-50%)' }} />
              </div>
            </div>
            {/* Controls hint */}
            <div style={{
              position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px',
              pointerEvents: 'none',
            }}>
              WASD BEWEGEN · SHIFT RENNEN · LEERTASTE SPRINGEN · ESC VERLASSEN
            </div>
          </>
        )}

        {/* Sprint-1 controls: FPS button + Scale Dummy toggle */}
        {ready && (
          <div style={{
            position: 'absolute', bottom: '32px', left: '10px',
            display: 'flex', gap: '5px', alignItems: 'center',
          }}>
            <button
              onClick={e => { e.currentTarget.blur(); toggleFpsRef.current?.(); }}
              style={{
                padding: '4px 9px', fontSize: '9px', letterSpacing: '0.9px',
                background: fpsMode ? 'rgba(180,100,30,0.85)' : 'rgba(15,11,7,0.78)',
                border: `1px solid ${fpsMode ? '#e8a44a' : 'rgba(201,168,76,0.28)'}`,
                color: fpsMode ? '#fff' : '#c9a84c', borderRadius: '999px',
                cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {fpsMode ? '⬛ Orbit' : '👁 Erste Person'}
            </button>
            <button
              onClick={e => { e.currentTarget.blur(); toggleDummyRef.current?.(); }}
              style={{
                padding: '4px 9px', fontSize: '9px', letterSpacing: '0.9px',
                background: showDummy ? 'rgba(180,60,0,0.75)' : 'rgba(15,11,7,0.78)',
                border: `1px solid ${showDummy ? '#ff6622' : 'rgba(201,168,76,0.22)'}`,
                color: showDummy ? '#fff' : 'rgba(255,255,255,0.38)', borderRadius: '999px',
                cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              {showDummy ? '▣ Dummy' : '□ Maßstab 1:1'}
            </button>
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

        <div style={{
          position: 'absolute', top: '8px', right: '10px',
          display: 'flex', gap: '6px', alignItems: 'center',
          fontSize: '9px', color: '#f0ddbc',
          pointerEvents: 'none',
        }}>
          <span style={{
            padding: '4px 6px',
            borderRadius: '999px',
            background: 'rgba(15,11,7,0.76)',
            border: `1px solid ${ac}33`,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}>
            {model.fidelityLabel}
          </span>
          <span style={{
            padding: '4px 6px',
            borderRadius: '999px',
            background: 'rgba(15,11,7,0.76)',
            color: '#c6b28a',
            letterSpacing: '0.6px',
          }}>
            Quelle: {model.sourceConfidence}
          </span>
          <span style={{
            padding: '4px 6px',
            borderRadius: '999px',
            background: 'rgba(15,11,7,0.76)',
            color: '#d8c39a',
            letterSpacing: '0.6px',
          }}>
            Audit: {model.historicalAudit?.grade || '-'} ({model.historicalAudit?.score ?? '--'})
          </span>
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

      {ready && model.historicalAudit?.findings?.length > 0 && !info && (
        <div style={{
          marginTop: '8px',
          background: 'rgba(14,11,8,0.65)',
          border: `1px solid ${ac}22`,
          borderRadius: '4px',
          padding: '10px 12px',
        }}>
          <div style={{
            fontSize: '10px',
            color: ac,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            Historische Plausibilitaet: naechster Feinschliff
          </div>
          <div style={{ fontSize: '11px', color: '#c9b692', lineHeight: '1.55' }}>
            {model.historicalAudit.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
