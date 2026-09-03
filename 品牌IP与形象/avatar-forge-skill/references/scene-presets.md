# Scene routing presets

Scene presets reduce user decisions. Each scene selects one complete quantified Style Pack from `style-packs.md`; it never replaces the pack with loose aesthetic prose.

For galleries, casts, team walls, or multi-person case libraries, also read `series-batches.md`. Scene selection determines content; the series protocol locks geometry and background treatment while resolving subject-compatible background colors.

Selection precedence is: explicit current user style, invoked saved style, explicit medium, character default style, then the scene default below.

## 1. Professional / workplace

- **Default pack:** `professional-graphic`
- **Use for:** LinkedIn, resumes, team pages, company sites, speaker bios, press portraits, formal community profiles.
- **Default content:** shoulders-up, direct gaze, restrained smile, polished simple wardrobe, no props.
- **Permitted scene override:** background may switch among seamless neutral, muted brand color, or softly blurred workplace while retaining pack complexity `1/5` and the same lighting.
- **Do not ask:** suit color, lens, crop, backdrop, or lighting unless the user cares; the pack already resolves them.
- **Alternative workplace treatments:** use `soft-3d-cartoon` for a friendly dimensional look or `anime-clean` for a formal illustrated persona; carry the competent expression, restrained wardrobe, and uncluttered professional content into that pack.

## 2. Everyday social

- **Default pack:** `social-lifestyle`
- **Use for:** WeChat, Xiaohongshu, Instagram, X, forums, dating-neutral social profiles, community accounts.
- **Default content:** relaxed warmth, everyday wardrobe, one soft environmental cue, no foreground prop.
- **Permitted scene override:** choose one simplified café, plant, street, home, sky, or bicycle cue once per batch; keep background complexity `2/5`, broad color shapes, and the pack's delicate line system.
- **Do not ask:** exact location or time of day unless the user names one; choose the least distracting context.
- **If another illustration medium is explicit:** use `anime-clean` or `soft-3d-cartoon`, retaining social warmth as content; for an unsupported medium, materialize a complete temporary fork from the closest compatible built-in Pack.

## 3. Personal brand / creator

- **Default pack:** `creator-editorial`
- **Use for:** creator channels, founder brands, newsletters, podcasts, courses, author profiles, thought leadership.
- **Default branch:** choose `editorial-photography` only when an original real-person identity source is present; otherwise choose `editorial-illustration`. An explicit user medium overrides this inference. Materialize only the selected branch and remove every superseded branch value before locking.
- **Default content:** one chosen emotional tone, one signature accessory at most, intentional negative space, and no generated typography. A creator-domain prop is used only when explicitly requested and replaces—not supplements—the accessory group.
- **Permitted scene override:** select the negative-space side and brand accent before locking. Keep the background object-free in both branches. For a diverse series, resolve a unique low-saturation background hue per person under the Pack rule; never repeat a hue family or add literal creator, travel, architecture, equipment, UI, or text cues.
- **Do not ask:** for a complete brand workshop. Infer from provided brand colors or content context; otherwise use one restrained accent.
- **Series rule:** preserve one branch, quiet-space side, camera, key side, material treatment, clean fully opaque background treatment, saturation/lightness band, and palette roles. For illustration also preserve cobalt ink, textured subject paper, pigment set, subject wash coverage, and cross-hatching density. Resolve expression and one unique background hue as the only adaptive style slots; background-object count remains `0`, background alpha remains `100%`, and gradients/vignettes remain absent.

## 4. Gaming / roleplay / virtual persona

- **Default pack:** `anime-clean`; use `soft-3d-cartoon` when `3D` is explicit.
- **Use for:** game accounts, tabletop characters, roleplay, fantasy or sci-fi personas, VTuber concept portraits.
- **Default content:** one role silhouette, one signature focus, and no unrequested weapon or franchise emblem.
- **Permitted scene override:** express the role through Pack-permitted costume, palette accents, and background content without weakening its crop, material, detail, or negative constraints.
- **Do not ask:** for complete lore unless identity depends on it. Ask one compact question only when subject type, role, or must-keep feature is missing.
- **Unsupported cinematic medium:** create a complete temporary fork from the closest compatible built-in Pack; do not revive a removed dedicated contract or merge partial fields.

## 5. Matching couples / friends / teams

- **Default pack:** `professional-graphic`, unless the user names another built-in Pack or explicit medium.
- **Use for:** couples, friends, siblings, teams, communities, paired or grouped profile sets.
- **Default content:** separate files, matched crop and light, one subject-specific accent each. Keep gaze direction identical when the user wants a strict wall; use complementary gaze only when the pair itself is the primary composition.
- **Permitted scene override:** apply the chosen full Pack identically to all members, then use `series-batches.md` matching-set tolerances: face-height difference `<=3 percentage points`, eye-line difference `<=3%`, same dimensions, same light direction, and the same background system.
- **Do not ask:** whether to make a combined image; deliver separate files by default. A combined image is an additional output only when requested.
- **Identity rule:** use a separate character profile or reference for every member; never infer one identity from another.

## 6. Holiday / themed event

- **Default pack:** `social-lifestyle`, unless the user names another built-in Pack or explicit medium.
- **Use for:** Lunar New Year, birthdays, winter holidays, festivals, seasons, launches, anniversaries, themed community events.
- **Default content:** subject first; one Pack-permitted wardrobe or accessory cue and one restrained everyday background cue; no generated greeting text.
- **Permitted scene override:** select culturally appropriate content and palette accents once, then keep them inside the active Pack's background and detail budgets.
- **Do not ask:** users to configure décor density; default to restrained. Ask only when cultural meaning or religious symbolism could be materially ambiguous.
- **Style rule:** if a saved style is invoked, retain it and apply the holiday content only within its background and detail budgets.

## 7. Medium change and cross-pack restyling

- **Default pack:** choose from the explicit target medium among the five built-in Packs. If the requested medium is unsupported, fork the closest compatible Pack and materialize all `14` fields under a temporary ID.
- **Use for:** realistic to anime, anime to 3D, photograph to painting, and other medium changes while carrying identity anchors into a fresh pack-native result.
- **Default content:** use the target pack's native crop, camera, lighting, and material system; preserve only identity anchors, requested scene content, and emotional intent.
- **Permitted override:** the target pack replaces all medium-dependent fields. Identity anchors and requested scene content remain separate.
- **Reference boundary:** reuse the original user-supplied identity source when available, but never attach an avatar generated by the previous pack. The first approved result becomes the target pack's own pilot.
- **Do not combine:** multiple target media in one batch. Create one labeled batch per target pack.
- **Continuity rule:** preserve facial geometry, hair silhouette, eye and signature colors, key accessories, and apparent age unless explicitly changed.

## Quick style-only routing

- “professional portrait,” “work avatar,” “LinkedIn portrait” → `professional-graphic`
- “professional photo,” “photorealistic headshot” → create an explicit custom photographic fork; do not weaken a built-in illustrative pack
- “casual social,” “natural social avatar” → `social-lifestyle`
- “anime,” “二次元” → `anime-clean`
- “3D cartoon,” “3D 卡通” → `soft-3d-cartoon`
- “creator,” “personal brand,” “editorial” → `creator-editorial`
- “game character” with no medium → `anime-clean`; explicit `3D` → `soft-3d-cartoon`; unsupported cinematic realism → complete temporary fork
- “matching avatars” with no medium → `professional-graphic` plus matching-set mode from `series-batches.md`
- “holiday portrait” with no saved style → `social-lifestyle` with restrained holiday content
- “oil painting,” “painterly” → complete temporary fork from the closest compatible built-in Pack; no built-in painterly Pack
