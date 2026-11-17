# Duble-S LIVE Games — Professional 3D v1 production plan

Status: design and acceptance criteria; implementation and production launch not yet complete.
Branch: `feature/live-games-preview`. Protect `main` until preview checks pass.

## Goals
- Deliver attractive 3D livestream scenes with **real skinned humanoid mesh** characters (glTF/GLB), not capsule/sphere placeholders.
- Keep the current two demo modes (Halay Party / Mountain Race) while replacing character rendering behind a common scene interface.
- Make a studio control screen and 9:16 OBS browser source, with a distinct read-only screen from authenticated publisher controls.
- Keep unverified TikTok connectivity in **DEMO** mode. Never claim gift events are production live until verified.

## Asset licensing/provenance
- Adobe Mixamo FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html says characters and animations may be used royalty-free in commercial games, subject to applicable terms.
- Three.js examples contain **Soldier.glb** (Idle, Walk, Run) and **Michelle.glb** (SambaDance). These are useful as development placeholders, but Soldier is not a traditional halay dancer and SambaDance is **not halay**.
- Track source URL, author, redistribution rights, applicable attribution, asset revisions and model size in `docs/live-games/ASSETS.md` before committing downloaded assets.
- Do not bundle third-party character assets without license verification. Use owned/commissioned characters for the shipping branded experience.

## Art direction
### Halay Party
- 5–10 visually distinct adult humanoid characters with traditional regional outfits and a consistent silhouette.
- Animator: footstep cycle, elbow/hand links, shoulder/torso motion, left-right sync, leader gesture, entrance, cheer, idle.
- Realistic fabrics and normal maps; dance-floor reflective lighting; stage fixtures, crowd silhouettes, 3-tier LOD.
- Halo, spotlight and confetti triggered by **demo** events only until a verified live provider is connected.

### Mountain Race
- Rigged climbing athletes; alternating arm reach + foot placement; torso balance, grip hold, rest, finish, victory.
- Anatomically reasonable pose blending, IK or procedural reach targets on climbing hold geometry, not vertical bobbing.
- Rock geometry with physically based materials, snow layer, fog and time-of-day lighting.

## Technical architecture
- Next.js 16 + React 19; React Three Fiber + drei + three (requires lockfile update).
- `CharacterController`: <Avatar assetUrl clipMap variant /> loads GLB and clones skinned meshes with SkeletonUtils.clone.
- Per-instance AnimationMixer; animation states `idle`, `enter`, `dance`, `climb`, `win`, `celebrate`; crossfade ~0.2–0.45 s, harmonize root motion.
- Animation sources: bespoke halay clips and climbing clips prepared with motion capture/retargeting (Mixamo alone is inadequate for authentic halay).
- Camera: responsive portrait framing, gentle orbit and optional director cuts. Maintain names, score visibility, safe 9:16 screen bounds.
- Accessible fallback if WebGL or GLB loading fails; offer low/high render profiles and keep text/hud legible.

## Security / multi-tenant
- Auth-gated creator panel (Better Auth), per-user game session ownership, read-only OBS overlay scoped to signed viewing token.
- Persist room state and events in Neon, add authorization on every write, validate event payloads, dedupe provider event IDs and apply per-room rate limits.
- Browser-to-local TikFinity connects only on streamer's machine; external website access and mixed-content restrictions need testing.
- Do not let anonymous players forge payment/gift events. No monetary prizes, no pay-to-win requirement, no casino logic.

## Milestones & release gates
1. **Asset pipeline** — licensed GLB characters load in scene, source/manifests recorded, usable animations validated.
2. **Character performance** — dancers have authored regional dance clips with hand sync; climbers use limb-based reach and grip transitions, not primitive oscillation.
3. **Visual polish** — costumes, PBR lighting, stadium/rocks, particles, postprocessing and portrait framing.
4. **Platform reliability** — Neon persistent state, creator auth, scoped OBS token, demo-vs-live event isolation.
5. **QA** — CI build, mobile performance, portrait OBS, 60-minute stability test, Chrome/Edge on streaming PC, TikFinity and LIVE tests with an eligible account.
6. **Private preview** — Vercel READY, tested page and protected environment.
7. **Production** — explicit approval after QA; merge/promote, smoke test, monitor and keep rollback.

## Definition of done
- Users see rigged humanoid models with actual skeletal animation, at least 4 transition states.
- Traditional halay movement reviewed by a knowledgeable performer.
- Mountain climbers show grip and limb reach animation with natural vertical progress.
- No broken resources, unresolved GLB animations, or private API credentials in client bundles.
- OBS overlay stays in sync with publisher panel across different browsers/devices.
- Accounts only access their own sessions; live gift events verified and deduplicated.
- Build green and production monitored with rollback available.

## Currently NOT done
No custom full-detail humanoid mesh assets or owned halay motion capture yet. No private production multiplayer system or verified live events. The current /live-games remains a visual prototype, not the completed v1.