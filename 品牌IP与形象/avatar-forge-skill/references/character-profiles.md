# Character profiles

Use a character profile to carry identity anchors across scenes and packs without freezing incidental details. A profile is a user-controlled creative artifact, not proof of real-world identity. Character profiles and style profiles are separate records: link them by name or fingerprint, never copy style prose into identity anchors. Keep original identity sources separate from pack-generated references so generated interpretations never leak from one pack into another.

## Storage behavior

1. Save only after an explicit request to remember, name, update, rename, export, or delete a character.
2. Prefer the environment's supported persistent memory or workspace storage. If none exists, return the complete portable profile block in the conversation.
3. Store reference-image paths, attachment IDs, or asset names only when they will remain accessible. Never claim a temporary reference is persistent.
4. Confirm the profile name, stable anchors, and storage location or limitation.
5. Before overwriting conflicting anchors, show the conflict and ask which version is canonical. Add temporary wardrobe, mood, scene, and seasonal details as variants rather than identity anchors.
6. On delete requests, remove only the exact named profile and report whether the deletion is recoverable.

## Portable profile format

Use concise Markdown so people can inspect, edit, version, and share profiles easily.

```markdown
---
profile_name: xiaoyun
display_name: Xiaoyun
profile_version: 1
created_from: approved-candidate-b
original_identity_sources:
  - xiaoyun-source-photo.png
pack_references:
  professional-graphic:
    - xiaoyun-professional-approved.png
default_style_profile: cloud-studio
default_style_fingerprint: professional-graphic|background=cloud-blue;palette-accent=silver
---

## Identity anchors
- Subject type: human character
- Apparent age range: young adult (user-provided)
- Face: softly angular oval; defined cheekbones; rounded chin
- Eyes: dark brown; slightly upturned; calm direct gaze
- Hair: black chin-length bob; light fringe; left-side part
- Skin / material: warm medium complexion
- Signature features: small silver star earring on left ear
- Proportions: natural realistic head and shoulders

## Flexible defaults
- Usual emotional tone: thoughtful, quietly optimistic
- Preferred palette: cloud blue, charcoal, silver
- Default scene: personal brand / creator

## Canonical exclusions
- Do not add glasses unless requested
- Do not change the star earring's shape or side

## Approved variants
- Professional: charcoal jacket, soft gray studio background

## Notes
- Preserve face geometry and hair silhouette before wardrobe or scene details.
```

Omit fields that are unknown. Mark user-provided facts as such when they are not visible. Do not infer ethnicity, nationality, health, disability, religion, sexuality, personality, or other sensitive attributes from an image.

## Recall protocol

When the user invokes a profile by name:

1. Load the profile's original identity source and the approved references recorded for the active `pack_id`.
2. Restate only the relevant lock: for example, “Using Xiaoyun's face, bob haircut, and star earring.”
3. If the user explicitly invokes a style, use it. Otherwise load the linked default style profile when available, then fall back to the scene default.
4. Merge the current request over flexible identity defaults while protecting identity anchors and canonical exclusions.
5. Use the same original identity source, eligible same-pack reference set, and Style Contract fingerprint for every candidate in that batch.
6. Never attach a generated reference recorded under a different `pack_id`. On a pack change, use the original identity source and text anchors, then promote the first approved result to the new pack's reference set.
7. If no original identity source or eligible same-pack reference is accessible, warn briefly that continuity will rely on text anchors and may be looser.

## Updating after approval

An approved image does not automatically replace the original identity source. Update the profile only when the user says to remember the change. Increase `profile_version`, record the image under its generating `pack_id`, retain a short note about what changed, and keep the previous same-pack reference when storage permits rollback.

Distinguish changes this way:

- **Identity update:** scars, permanent hairstyle, species, face geometry, signature accessory. Requires explicit confirmation because it affects future generations.
- **Variant:** clothing, expression, pose, occupation, scene, season, temporary hair styling. Save under approved variants when useful.
- **Style link:** a saved style-profile name and fingerprint. Keep the full Style Contract in the style profile so identity remains portable and style can be updated independently.

## Multiple people

Give every subject a separate profile. A matching-avatar set references those profiles plus one shared locked Style Contract, but it must never combine identity anchors into a single profile. The shared contract must use the same fingerprint in every generated file.
