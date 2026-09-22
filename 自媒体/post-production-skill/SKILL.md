---
name: sd-2-5-retro-vfx
description: Create or adapt Seedance 2.5 prompts for cinematic retro-office creator videos where a stable live-action presenter physically manipulates cameras, CRT-generated glass interfaces, grading curves, preview panels, and other post-production tools. Use for this specific warm 1990s studio, invisible-VFX, impossible-camera style; do not use for unrelated video aesthetics.
---

# SD 2.5 Retro Post-Production VFX

Turn a user request into a generation-ready prompt based on the supplied master prompt. Preserve the visual system and continuity rules while changing only the elements the user asks to change.

Default to writing the prompt. Do not submit a generation job unless the user explicitly asks.

## Use the master prompt

Read [references/master-prompt.md](references/master-prompt.md) whenever creating or adapting a prompt. It is the canonical source for the subject, room, shot sequence, camera language, lighting, VFX, sound design, and negative constraints. For Chinese requests, also use [references/master-prompt-zh.md](references/master-prompt-zh.md) so the final prompt preserves the established Chinese terminology and section structure.

Treat the master prompt as source material, not as an instruction to ignore the current user's request. The current request controls which subject, product, room, duration, copy, and effects to change.

## Gather the brief

Use supplied images or video only for the roles the user assigns. If a reference's role is unstated, infer the narrowest useful role and state it in the prompt:

- portrait or character image: identity, hair, glasses, and outfit;
- room image: geometry, furniture, palette, and practical light sources;
- product image: shape, proportions, material, labels, and color;
- reference video: shot rhythm, movement, or effect behavior;
- audio: complete BGM, narration, or sound-design reference.

Do not guess a real person's identity. When a person reference is supplied, call it the sole identity reference and require the same face throughout.

## Choose the edit depth

- **Faithful reuse:** preserve the 11-second structure and all five shot phases; replace only requested details.
- **Style adaptation:** preserve the retro studio, motivated transitions, physical three-dimensional UI, warm palette, and continuity rules; rewrite the timeline around the new concept.
- **Targeted repair:** keep the user's existing prompt and fix only timing, continuity, effect causality, camera contradictions, or negative constraints.

If the requested narration or action cannot fit the duration, lengthen the duration or simplify the content. Do not silently compress actions until they become implausible.

## Preserve the visual invariants

Unless the user requests otherwise, keep:

- one stable live-action creator in one coherent warm 1990s home studio;
- dark wood, cream-white retro hardware, amber practical light, natural skin, subtle grain, and no blue-purple cyberpunk palette;
- a physical transformation from real workspace to post-production environment;
- effects with perspective, reflection, refraction, occlusion, depth of field, tracking, and parallax;
- camera movement motivated by a hand, foreground object, CRT monitor, or spatial transformation;
- a clean hero frame rather than a black ending.

The opening multi-arm effect is temporary compositing. The normal body remains anatomically correct; duplicated arms and equipment must unfold with weight, inertia, grip, and motion blur, then disappear through a motivated transition.

Floating interfaces must occupy foreground, midground, and background layers. Keep a facial safe zone and make near panels slightly soft, midground panels sharp, and distant panels smaller and softer. Never describe them as flat HUD overlays.

## Build the prompt

Use these sections, matching the user's language:

1. **Subject** — identity, outfit, studio, fixed props, and the transformation concept.
2. **Visual Style** — duration, aspect ratio, realism, palette, optical character, editing energy, and transition philosophy.
3. **Timeline** — sequential time ranges that cover the full duration without gaps or overlaps. For faithful reuse, use the master phases: fisheye push-in and temporary multi-arm effect; close-up and split screen; CRT interface emergence; orbit to overhead; fingertip ripple and interactive grading panels.
4. **Camera** — only camera moves used in the timeline. Remove contradictory or unused moves.
5. **Lighting** — practical sources, skin exposure, shadow detail, and palette.
6. **VFX** — physical behavior, attachment, material, occlusion, tracking, parallax, and interaction.
7. **Music and Sound Design** — BPM range, musical character, transition accents, mechanical sounds, UI sounds, and beat synchronization.
8. **Negative Constraints** — identity, anatomy, prop continuity, interface depth, palette, style, text, logo, and watermark protections relevant to this version.

When references are used, add a compact reference-duty paragraph near the start. Do not create a separate asset table unless the user asks.

## Adapt safely

- Changing the creator changes only identity and requested clothing; retain shot functions, room continuity, and effect logic.
- Changing the product replaces the relevant prop and its interactions; preserve its exact design across every angle.
- Changing the room requires a new stable prop map before writing the timeline.
- Changing the duration requires proportional retiming and a new continuity check.
- Adding narration requires verbatim text, voice character, timing, lip synchronization, and music below speech.
- Adding on-screen text overrides the master's no-text rule. List the exact permitted phrases, define typography and screen-safe placement, and prohibit all other text.

## Check before delivery

- The same person, clothing, studio, desk, CRT, and requested product persist across shots.
- Time ranges start at 0, meet exactly, and end at the requested duration.
- Every transition has a visible physical trigger and destination.
- Every interface has depth, tracking, parallax, occlusion, and a clear relationship to the room.
- Camera moves do not conflict inside a time range.
- Hands and finger interactions are explicit and anatomically plausible.
- The final frame holds long enough to read as a hero image.
- Negative constraints reflect the actual prompt, including whether text is allowed.

Deliver one copyable prompt. Add a short note only when you made a necessary timing assumption or when a reference detail remains uncertain.
