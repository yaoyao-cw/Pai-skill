# Diverse series and gallery batches

Use this protocol for case galleries, team walls, community casts, sample libraries, or any request that should show different people under one coherent visual system.

## 1. Declare the series contract

Split the contract into three categories before generation.

### Immutable visual structure

Copy these values verbatim into every prompt:

- medium and rendering method;
- face-height target and tolerance;
- eye-line, headroom, shoulder-width, and centering targets;
- camera height, yaw/pitch/roll policy, gaze, and shoulder orientation;
- light direction, tonal-tier count, edge treatment, and texture system;
- background treatment, atmosphere, geometry, and adaptive color formula;
- palette saturation/lightness strategy and detail budget;
- hard negatives.

### Content slots

These may differ because the purpose of a series is to express distinct people or roles:

- fictional identity and age band;
- skin-color family and facial geometry;
- gender presentation;
- hair silhouette, facial hair, glasses, and one signature accessory;
- wardrobe category and color;
- role or scenario expressed through clothing and expression.

Content differences are not style drift. Do not force diverse people to share facial proportions, hair, or clothing merely to make the series coherent.

### Adaptive style slots

Allow only slots declared by the contract. The recommended series default is:

- expression intensity within a range no wider than `1/5`;
- one resolved background state produced by the locked rule. It normally contains only color; when the active pack explicitly defines semantic cue variation, the same slot may also resolve cue family, geometry, and placement.

The treatment and formula remain immutable even though the resulting color differs.

## 2. Plan diversity before calls

For an unspecified public example gallery, create a small planning matrix before writing prompts. Cover meaningful visual range without turning identity into costume:

- at least `3` skin-color families in a series of `6+`;
- at least `3` gender presentations when the requested subject domain permits it;
- at least `2` adult age bands, such as 20s–30s and 40s–60s;
- varied face shapes and hair silhouettes;
- varied wardrobe categories and dominant hues;
- no ethnicity-role, gender-role, age-role, or clothing stereotype.

Do not infer sensitive traits from a real reference. These defaults apply to newly invented fictional people when the user requests variety.

If the user asked for one named character, use identity-candidate mode instead; diversity defaults must not replace that identity.

## 3. Lock series geometry

Define a single target and tolerance for the whole series. Recommended square-avatar defaults:

- hair top: target `7–11%` from top;
- eye line: target `36–41%` from top, cross-image difference `<=2 points`;
- chin line: target `60–64%` from top, cross-image difference `<=3 points`;
- hair-top-to-chin height: target `50–57%`, cross-image difference `<=3 points`;
- headroom: target `7–11%`, cross-image difference `<=2 points`;
- shoulder line begins near `68–74%` from top;
- shoulders: both visible and level, fill target `70–80%` width;
- horizontal center offset: `<=3%`;
- yaw: choose one series target; frontal default `0° ±3°`;
- pitch: `0° ±2°`; roll: `0° ±1°`;
- gaze: direct by default.

Hair volume changes the visible silhouette. Preserve the face and eye-line targets even when curls, locs, head coverings, or tall hair require slightly more headroom. Do not crop distinctive hair merely to force identical outer bounds.

## 4. Use one adaptive background-color rule

Lock the **background treatment** and **atmosphere**, then resolve one color per person.

Recommended no-scenery gallery treatment:

- one soft monochrome field, slightly lighter behind the head and darker toward the edges;
- no shapes, circles, halos, props, architecture, particles, texture, or typography;
- background complexity `1/5` for every image;
- perceived saturation in a muted band roughly equivalent to HSL `18–35%`;
- perceived lightness roughly `58–76%`;
- keep background contrast subordinate to the face.

Resolve colors with this deterministic visual rule:

1. Identify the dominant clothing hue and the subject's hair/outer-silhouette lightness.
2. If clothing is chromatic, choose a muted background hue roughly `70–150°` away on the hue wheel. Prefer the option that separates from both hair and clothing.
3. If clothing is neutral, choose a muted hue from this reusable ring: blue-gray, sage, dusty rose, muted plum, soft ochre, desaturated teal. Select the one with the strongest silhouette separation.
4. Keep perceived lightness difference between the background and the dominant hair/shoulder edge at roughly `25 percentage points` or more. If that is impossible, adjust background lightness within the allowed band rather than changing the treatment.
5. In a photo wall, adjacent cards should differ by about `30°` or more in hue when possible. Do not repeat an effectively identical background color in adjacent cards.
6. Keep every background within the locked saturation/lightness bands so the atmosphere remains one series rather than a rainbow of unrelated scenes.

Record the per-image result only in `[THIS CANDIDATE'S ALLOWED VARIATION]`:

```text
Resolved background slot: muted sage; hue family approximately 145°; saturation 24%; lightness 68%; selected as a cool complement to burgundy clothing and for dark-hair separation.
```

Do not put that resolved color in the locked block. The locked block contains the treatment and formula shared by all prompts.

## 5. Pilot before a large series

For `6+` planned outputs, generate two pilots with deliberately different people and clothing hues. Use separate calls and the same complete locked block.

Audit the pair:

- face-height difference `<=3 percentage points`;
- eye-line difference `<=2 points`;
- chin-line difference `<=3 points`;
- headroom difference `<=2 points`;
- yaw difference from the target `<=3°`;
- same medium, edge treatment, shadow direction, background treatment, and complexity;
- different resolved background states, both following the same rule;
- no accidental identity, hair, or wardrobe copying between subjects.

If both pass, continue the series without asking another style question. If they visibly fail, deliver the pilots, explain the failing measurements, and ask whether to revise the contract or continue. Do not hide, discard, or silently retry them.

Once one pilot has the approved geometry, use it as a **composition-and-style reference** for subsequent people only inside the same active pack when the image tool supports references. Record the pilot's `pack_id` and verify it matches before every call. Label roles explicitly:

- Image 1: composition and style reference only—copy crop, landmark placement, camera, edge treatment, light direction, and background treatment; do not copy identity or clothing.
- Image 2, when present: identity reference only—copy face, hair, and signature features; do not copy crop, background, or style.

This is more reliable than asking the model to numerically rescale an already generated portrait. Keep the complete text contract in every call even when an approved pilot is supplied.

Never carry a pilot or generated avatar into a different pack. A gallery covering multiple packs must start each pack independently; after that pack's first output is approved, only that output may seed further examples within the same pack.

For a fully fictional gallery with text-defined identities, prefer using the approved pilot as a style-and-geometry reference: replace identity, hair, wardrobe, accessory, expression within range, and the resolved background state. When the active pack permits different background cue forms, explicitly prohibit copying the pilot's cue object, geometry, and placement while retaining its complexity, texture, and quiet-area ratio.

For real people or established characters inside one pack, do not replace identity from text alone. Use the same-pack approved pilot as Image 1 for layout/style and the original user-supplied identity source as Image 2, with explicit role separation. On a pack change, omit the old pilot and start the new pack from the original identity source.

## 6. Prompt and audit reporting

For each candidate, list content slots separately from adaptive style slots:

```text
Content slots: identity=...; hair=...; wardrobe=...; accessory=...
Adaptive style slots: expression=2.5/5; background=muted sage H145/S24/L68
```

For the finished series, report:

- one shared fingerprint;
- number of immutable-field divergences, target `0`;
- geometry range observed across outputs;
- background treatment match, target `100%`;
- count of repeated adjacent background hue families, target `0`;
- number of delivered files.
