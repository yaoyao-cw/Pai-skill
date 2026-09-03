# Style locks and profiles

A style lock preserves a fully materialized Style Contract. It never stores only a loose label such as “warm anime” because that would reintroduce drift.

## Lock levels

- **Batch lock:** created automatically before every batch and expires after the batch. All style fields are immutable.
- **Conversation lock:** created when the user says “lock this style” or equivalent. It remains active for later turns in the current conversation.
- **Saved style profile:** created only when the user explicitly asks to save or make a style the default. It is portable and may be linked to one or more character profiles.

## Exact behavior

### Lock current style

1. Identify the selected candidate and the Style Contract that actually produced it.
2. Save the complete contract, exact expanded style block, hard negatives, Skill version, explicit overrides, candidate reference with its `pack_id` provenance, and actual model/provider when known.
3. Set `lock_mode: strict` and `allowed_changes` to the pack's variation budget.
4. Confirm in one line: pack ID, fingerprint, and what may still vary.

Do not reverse-engineer a new style from the pixels when the original contract is available. If only an image remains, create a clearly labeled `reconstructed` profile and warn that repeatability will be lower.

For a diverse series, save the background treatment and adaptive resolution rule in the locked block. Store each resolved background state as candidate metadata, not as a replacement for the rule. Most packs vary only color; packs that explicitly permit semantic cue variation may also resolve cue family, geometry, and placement. “Use the same style” therefore recreates the same visual system without forcing every person onto the same background.

### Continue with previous style

Restore the most recent locked contract and exact serialized style block. Apply new identity or content in their own prompt sections. Do not select the current scene default and do not regenerate style prose from the pack name.

### Save as default

Save only after explicit user authorization. If persistent writable storage exists, use its supported location. Otherwise return the complete portable block. State whether the source image and provider metadata will remain accessible.

### Change a locked field

An explicit request such as “same style but make the light neon” conflicts with a strict light lock. Create a fork:

1. Copy the existing complete contract.
2. Replace only the requested field and resolve dependent fields if necessary.
3. List those dependent changes before generation; for example, palette may need a new accent role when the light hue changes.
4. Assign a new fingerprint and keep the old profile unchanged.

Do not ask for confirmation when the user's wording clearly authorizes the fork. Ask only when one request has two materially different interpretations.

## Portable style profile

Store the exact resolved prose used by the prompt, not just numerical metadata.

```markdown
---
style_name: cloud-studio
style_profile_version: 1
skill_version: 1.0.0
base_pack: professional-graphic
fingerprint: professional-graphic|background=cloud-blue;palette-accent=silver
lock_mode: strict
source_candidate: batch-2026-08-24-b
model_provider: recorded-if-known
constraint_delivery_mode: main-prompt
---

## Overrides
- background: solid cloud-blue field, complexity 1/5
- palette accent: silver, occupying no more than 10% of the image

## Exact locked Style Contract
Medium: ...
Canvas: ...
Composition: ...
Camera: ...
Expression: ...
Lighting: ...
Texture and material: ...
Background: ...
Palette: ...
Detail budget: ...
Continuity: ...
Allowed variation: ...

## Expanded hard negatives
- text
- watermark
- ...

## Accessible references
- candidate-b.png (`pack_id: professional-graphic`; eligible only while that pack remains active)

## Allowed changes without forking
- expression intensity 1.5–2.5/5
- yaw within ±8°
- one wardrobe detail within the locked palette
- in diverse-series mode only: one resolved background state produced by the saved adaptive rule
```

## Quantified reuse checks

Before reuse, require:

- stored required fields: `14/14`;
- exact style block available: `true`;
- stored Skill version recorded: `true`; if it differs from the active Skill version, keep the exact saved contract or migrate it explicitly into a new style-profile version;
- fingerprint in every new batch prompt: one identical value;
- generated reference `pack_id` matches active `pack_id`: `true`;
- cross-pack generated references attached: `0`;
- changed locked fields without fork: `0`.

If an old profile lacks fields, create a migrated copy with a new profile version and show the filled defaults. Preserve the original for rollback when storage permits.
