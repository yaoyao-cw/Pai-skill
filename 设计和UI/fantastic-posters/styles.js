// Fantastic Posters — style catalog (33 styles).
// Each style has a `build(input)` that returns the final prompt string.
// `input` is `{ title, subtitle, body, footer, subject, palette }` — all optional.
// `palette` (if supplied) is injected as a "Strict palette: ..." override clause
// that takes precedence over style defaults (handled in generate.js).
//
// Each style may declare:
//   needsPhoto:    true  → requires --ref=<image>, switches to gpt-image-2/edit
//   experimental:  true  → excluded from auto-picker unless --include-experimental
//   required:      array of input fields the style expects

function f(v, fallback) {
  return (v && String(v).trim()) || fallback;
}

// Helper: append a strict-palette override clause to any prompt.
export function applyPaletteOverride(prompt, palette) {
  if (!palette) return prompt;
  return `${prompt}\n\nStrict palette override (takes precedence over style defaults): ${palette}. Use only these colours.`;
}

export const styles = {
  'cinematic-neonoir': {
    label: 'Cinematic Neo-Noir',
    build: (i) => `A cinematic movie poster, portrait orientation, neo-noir style. ${f(i.subject, 'A lone detective in a long trench coat stands under a flickering streetlamp on a rain-soaked Tokyo alley at night, neon signs glowing pink and cyan reflecting in puddles')}. Dramatic low-angle shot, volumetric fog, shallow depth of field. Big bold title at top in distressed serif typeface reads "${f(i.title, 'LAST EXIT')}" in white. Below the figure, a tagline in smaller italic reads "${f(i.subtitle, 'Every shadow has a name.')}". At the bottom, fake billing block with credits and release date "${f(i.footer, 'DECEMBER 12')}". Small festival laurels in the corners. Letterboxed cinematic feel.`,
  },

  'vintage-travel': {
    label: 'Vintage Travel',
    build: (i) => `A vintage 1950s travel poster, portrait orientation, illustrated in mid-century WPA / Roger Broders style. ${f(i.subject, 'Bold flat color illustration of the Swiss Alps — geometric snow-capped peaks in cobalt blue and warm cream, a tiny red cable car ascending a wire diagonally across the composition, a deep emerald pine forest below')}. Limited palette: cream, cobalt, deep red, mustard yellow, forest green. Top of poster in large condensed sans-serif: "${f(i.title, 'VISIT ZERMATT')}". Below in smaller hand-lettered script: "${f(i.subtitle, 'Where the mountains touch the sky')}". Bottom edge: "${f(i.footer, 'NATIONAL RAILWAYS · 1954')}". Slight paper grain texture.`,
  },

  'swiss-minimal-typo': {
    label: 'Swiss Minimal Typography',
    build: (i) => `A Swiss International Style typographic poster, portrait orientation, bold minimalism. Pure off-white background. ${f(i.subject, 'A single massive geometric red circle dominates the upper two-thirds, slightly off-center')}. Below it, ultra-tight Helvetica-style sans-serif typography stacked left-aligned: huge bold title "${f(i.title, 'FORM FOLLOWS FUNCTION')}" wrapping across three lines in black. Underneath in small set-width caps: "${f(i.subtitle, 'A LECTURE BY THE DESIGN INSTITUTE · 14 MAY 2026 · 19:00')}". Very small footer line: "${f(i.footer, 'Admission free. Limited seating.')}". Crisp grid alignment, generous white space, no decoration. Print quality, faint paper texture.`,
  },

  'tech-conf-darkmode': {
    label: 'Tech Conference Dark Mode',
    build: (i) => `A modern tech conference poster, portrait orientation, dark mode aesthetic. Deep charcoal background with ${f(i.subject, 'a single luminous abstract sculpture floating center — flowing chrome ribbons morphing into geometric circuit pathways, lit from below in cool blue and warm amber')}. Top of poster in massive geometric sans-serif: "${f(i.title, 'ASSEMBLE / 2026')}". Below in elegant smaller caps: "${f(i.subtitle, 'THE AGENTIC WEB CONFERENCE')}". Mid-poster, a single quote in italic light weight. Bottom band with location and date in monospace: "${f(i.footer, 'LISBON · 14–16 OCTOBER')}". Subtle film grain. Refined editorial feel.`,
  },

  'corporate-report': {
    label: 'Corporate Annual Report',
    build: (i) => `A corporate annual report cover, portrait orientation, premium executive design. Clean off-white background with ${f(i.subject, 'a single elegant editorial photograph filling the upper two-thirds: a sweeping aerial view of a sustainable vertical farm tower at golden hour, glass facets reflecting warm orange light, distant city skyline blurred')}. Below the image, generous whitespace and refined serif typography. Title in deep navy: "${f(i.title, 'Cultivating Tomorrow')}". Subtitle in lighter weight: "${f(i.subtitle, '[CLIENT NAME] · ANNUAL REPORT [YEAR]')}". Small footer with stock ticker and ISIN: "${f(i.footer, '[TICKER · EXCHANGE]')}". Embossed corporate logo (abstract letter) top-left. Premium executive publication feel.`,
  },

  'indie-gig-riso': {
    label: 'Indie Gig Risograph',
    build: (i) => `An indie music gig poster, portrait orientation, screen-printed risograph aesthetic. Bold limited two-color palette: hot pink and electric teal on cream paper. Hand-cut collage style — ${f(i.subject, 'a halftoned vintage photograph of a stoic young woman with sunglasses overlaid with squiggly hand-drawn lines and asterisk shapes')}. Distressed grunge texture, off-register print misalignment giving it that DIY zine feel. Massive condensed typeface across top reading "${f(i.title, 'GLASSEATER')}". Below in scratchy hand-drawn type: "${f(i.subtitle, '+ The Soft Animals · DJ Cricket')}". Center a torn-paper banner with the date. Bottom: "${f(i.footer, 'THE DEAF INSTITUTE · MANCHESTER · £14 ADV')}". Looks like it was photocopied at a print shop.`,
  },

  'luxury-real-estate': {
    label: 'Luxury Real Estate',
    needsPhoto: true,
    build: (i) => `Reuse the provided photograph EXACTLY as the upper two-thirds of a luxury real-estate listing flyer — do not redraw or restyle it, keep it as a real photograph filling the top of the poster, edge to edge.

Below the photograph: clean off-white paper background, generous whitespace, refined editorial typography matching a premium listing flyer.

Layout below the image, in order top to bottom:

1. Slim sans-serif headline in deep forest green: "${f(i.title, '1414 OAK RIDGE LANE')}"
2. Subhead in muted slate: "${f(i.subtitle, 'Mill Valley · 4 BD · 3.5 BA · 3,840 sq ft')}"
3. A clean three-column data block with these key features in small caps, separated by thin vertical hairlines: ${f(i.body, '• heated floors • EV-ready garage • vineyard view')}
4. Large minimalist call-to-action centered, all caps, generous letter spacing: "${f(i.footer, 'OPEN SUNDAY · 1–4 PM')}"
5. Bottom strip in small print, centered: listing price and brokerage credit.

Top-right corner: a tiny minimal brokerage wordmark in deep navy. Portrait orientation. Tasteful and aspirational. Magazine-quality print feel. Do not crop, distort, or restyle the input photograph.`,
  },

  'luxury-estate-cover': {
    label: 'Luxury Estate Cover',
    build: (i) => `A luxury real-estate brochure cover, portrait orientation, cinematic estate-magazine aesthetic. Full-bleed dusk photograph of ${f(i.subject, 'a single architecturally striking modern home cantilevered over a forested hillside, oversized floor-to-ceiling windows glowing warm amber from within, an infinity pool reflecting a deep purple twilight sky with a single faint star, a shadowy silhouette of a sequoia forest beyond')}. Soft mist rising. Drone-shot composition, slow shutter, clean deep blacks. The lower third dimmed by a very subtle dark gradient for legibility. Top-right corner small refined serif wordmark: "${f(i.subtitle, 'WILDWOOD ESTATES')}". Mid-poster centred in elegant tall thin Didone serif, all caps: "${f(i.title, 'QUIET MAJESTY')}". Below in fine italic light: "${f(i.body, 'an architectural retreat above the redwoods')}". Bottom-left small tracked sans-serif: "${f(i.footer, '1414 RIDGE LANE · BY APPOINTMENT')}". A single tiny embossed brokerage crest in the very bottom centre. No data tables, no feature bullets — pure magazine cover restraint.`,
  },

  'art-deco': {
    label: 'Art Deco',
    build: (i) => `An Art Deco theatre poster, portrait orientation, 1920s Gatsby-era opulence. Deep midnight-black background with elaborate gold geometric sunburst rays radiating from the upper center, intricate stepped fan motifs in burnished gold and ivory. ${f(i.subject, 'A sleek silhouette of a flapper in profile holding a long cigarette holder, rendered in flat gold leaf with crisp angular lines')}. Symmetrical composition, mirrored ornament. Top in tall condensed Art Deco serif: "${f(i.title, 'THE GOLDEN HOUR')}". Below in finer engraved caps: "${f(i.subtitle, 'A REVUE IN THREE ACTS')}". Bottom plate: "${f(i.footer, 'OPENING NIGHT · 14 FEBRUARY 1928 · DRESS BLACK TIE')}". Faint paper grain, slight gold foil sheen. Looks pressed on heavy card stock.`,
  },

  'bauhaus-geometric': {
    label: 'Bauhaus Geometric',
    build: (i) => `A Bauhaus-era exhibition poster, portrait orientation, primary-color geometric abstraction in the style of Herbert Bayer and László Moholy-Nagy. Off-white linen background. ${f(i.subject, 'A pure red square overlapping a cobalt-blue circle overlapping a sun-yellow triangle, arranged in a tight asymmetric composition slightly above center')}. Black hairline rules dividing the layout. Sans-serif lowercase typography, no caps. Headline left-aligned in heavy black: "${f(i.title, 'form · raum · farbe')}". Below in small set-width red type: "${f(i.subtitle, 'design school exhibition · 1926')}". Bottom edge in tiny monospace: "${f(i.footer, 'eintritt frei · 9-17 uhr')}". Crisp printed feel, slight registration offset on the colors.`,
  },

  'ukiyo-e': {
    label: 'Ukiyo-e Woodblock',
    build: (i) => `A modern poster in the style of a classical Japanese ukiyo-e woodblock print, portrait orientation. ${f(i.subject, 'A single great wave curling left to right in deep Prussian-blue gradients with feathery white foam, a small wooden fishing boat tilted in the trough, distant Mt. Fuji snow-capped in soft cream beneath an apricot dawn sky')}. Visible woodblock keylines, flat color planes, traditional kumadori shading. Vertical band of Japanese kanji running down the right edge in elegant brushed black ink. Top of poster a small red hanko seal next to refined sans-serif english title: "${f(i.title, 'FLOATING WORLD')}". Below: "${f(i.subtitle, 'A RETROSPECTIVE OF EDO PRINTMAKERS')}". Bottom: "${f(i.footer, '12 SEP — 8 DEC 2026')}". Aged washi-paper texture.`,
  },

  'psychedelic-60s': {
    label: 'Psychedelic 60s',
    build: (i) => `A 1960s psychedelic rock concert poster, portrait orientation, in the visual tradition of Fillmore-era San Francisco hand-lettering. Vibrating complementary palette: hot magenta, acid lime green, and tangerine orange, deliberately eye-straining. Hand-drawn melting bubble lettering filling almost the entire poster, undulating around ${f(i.subject, 'a central illustration of a peacock with feathers morphing into mandala swirls')}. Type is barely legible by design — large flowing custom lettering reads "${f(i.title, 'ELECTRIC GARDEN')}". Smaller hand-drawn line below: "${f(i.subtitle, 'with The Velvet Hour and Sunday Choir')}". Bottom hand-lettered: "${f(i.footer, 'BRIDGE HALL · 4 JULY 1968 · TIX $3.50')}". Aged off-white poster paper, slight ink bleed where the inks overlap.`,
  },

  'vaporwave-synth': {
    label: 'Vaporwave Synthwave',
    build: (i) => `A vaporwave-aesthetic poster, portrait orientation, late-night synthwave feel. Sunset gradient sky from deep magenta down to electric cyan, a perfect chrome grid floor receding to a vanishing point, a wireframe palm tree silhouetted in violet, and ${f(i.subject, 'a giant chrome bust of a roman statue tilted at the center, reflecting the gradient')}. Japanese katakana floating subtly in the background as decorative texture. Bold retro-futuristic typeface across the top in glowing pink with cyan drop-shadow: "${f(i.title, 'AFTER HOURS')}". Subtitle in stretched outline serif: "${f(i.subtitle, 'A E S T H E T I C')}". Bottom strip in monospace VHS-tracking type: "${f(i.footer, 'VOL.II · NOCTURNE FM · 88.6')}". Faint VHS scanlines and chromatic offset.`,
  },

  'saul-bass-minimal': {
    label: 'Saul Bass Minimal',
    build: (i) => `A minimalist film poster in the style of Saul Bass, portrait orientation. Single warm cream paper background. ${f(i.subject, 'A single torn-paper-edged graphic shape in burnt orange — an abstract scissor pair cutting a thin vertical black line down the center of the poster, the line splitting halfway down')}. Hand-cut feel, slight imperfections, intentional rough edges. Sparse typography. Top in small black caps: "${f(i.subtitle, 'A FEATURE PRESENTATION')}". Center beneath the graphic in tall hand-set sans-serif title: "${f(i.title, 'THE THIN PLACE')}". Bottom block of credits in tiny typewriter caps reading the fake billing. Single-line release: "${f(i.footer, 'IN CINEMAS · 9 OCTOBER')}". Looks screen-printed in two passes.`,
  },

  'memphis-80s': {
    label: 'Memphis 80s',
    build: (i) => `A Memphis Group 1980s design poster, portrait orientation, Ettore Sottsass aesthetic. Mint-green background scattered with bold geometric squiggles, black-and-white checkerboard fragments, hot-pink terrazzo dots, lemon-yellow zigzags, and a floating turquoise blob shape. Playful clashing patterns, no negative space anxiety. ${f(i.subject, 'Center features a chunky postmodern lamp object rendered in flat color planes')}. Title in fat rounded sans-serif with each letter a different bright color: "${f(i.title, 'OBJECTS!')}". Subhead in sloped italic: "${f(i.subtitle, 'An exhibition of postmodern Italian design')}". Bottom in chunky black caps on a yellow band: "${f(i.footer, 'TRIENNALE · 4–28 APRIL 1985')}". Slight risograph print noise.`,
  },

  'editorial-fashion': {
    label: 'Editorial Fashion',
    build: (i) => `An editorial high-fashion magazine cover, portrait orientation, in the visual tradition of European fashion editorials. ${f(i.subject, 'Full-bleed studio photograph of a striking model with sharp cheekbones and slicked-back hair, wearing an oversized architectural crimson coat, photographed against a stark pewter-grey backdrop, dramatic side lighting')}. Top of cover in classic tall serif Didone wordmark: "${f(i.title, 'MODE')}". Beneath the masthead in small spaced caps: "${f(i.subtitle, 'APRIL 2026 · €9')}". Cover lines on the left margin running vertically in elegant condensed serif: "${f(i.body, 'THE NEW SILHOUETTE · COUTURE WEEK · INTERVIEW: STILLNESS')}". One bold cover line bottom right in red: "${f(i.footer, 'THE QUIET POWER ISSUE')}". Subtle gloss paper sheen, perfect kerning, magazine-quality print feel.`,
  },

  'symmetric-storybook': {
    label: 'Symmetric Storybook',
    build: (i) => `A whimsical film poster, portrait orientation, perfectly symmetrical composition with pastel palette and storybook-diorama feel. ${f(i.subject, 'A miniature mountainside funicular tram rendered in cherry-red and cream stopped at a tiny snow-dusted alpine station, framed dead-center under a soft blush-pink sky. Two identical bellhops in mustard uniforms stand mirrored on either side of the tram doors')}. Flat dollhouse perspective, every element labeled. Top of poster in mustard-yellow Futura caps: "${f(i.title, 'THE GRAND BELVEDERE')}". Below in deep maroon italic Futura: "${f(i.subtitle, 'a feature presentation')}". Center-bottom in tiny condensed type: "${f(i.body, 'An alpine fable in three acts')}". Bottom strip of fake billing in tiny condensed type. Decorative art-deco border framing the poster. Looks printed on slightly textured cardstock.`,
  },

  'pop-art-comic': {
    label: 'Pop Art Comic',
    build: (i) => `A pop-art comic-style poster in the visual tradition of Roy Lichtenstein, portrait orientation. Bold Ben-Day halftone dots, thick black ink outlines, and a primary palette of fire-engine red, cobalt blue, and sun yellow on bone white. ${f(i.subject, "A close-up of a stylized woman's eye with a single comic teardrop, cropped tight in the upper half of the poster")}. A jagged speech-bubble burst overlapping the image with a hand-lettered comic exclamation: "${f(i.subtitle, 'OH NO!')}". Below in chunky tall sans-serif title: "${f(i.title, 'ROMANCE STUDIES')}". Bottom strip in flat black with white caps: "${f(i.footer, 'MAY 14 — AUG 30, 2026')}". Slight printing-press registration offset on the colored dots.`,
  },

  'pastel-mindful': {
    label: 'Pastel Mindful',
    build: (i) => `A serene pastel wellness poster, portrait orientation, hand-painted gouache feel. Soft washed background fading from dusty rose at the top to pale sage green at the bottom. ${f(i.subject, 'A single delicate illustration centered: a small ceramic teacup sitting on a smooth river stone with three thin curls of steam rising and dissolving into a tiny crescent moon')}. All shapes painted in muted clay, oat, blush, and eucalyptus. Generous whitespace. Hand-set elegant light serif typography in warm charcoal. Top in small spaced caps: "${f(i.subtitle, 'STILL')}". Centered title in tall thin serif: "${f(i.title, 'a quiet weekend')}". Below in italic light: "${f(i.body, 'mornings of stillness · slow afternoons · early bedtime')}". Bottom in tiny tracked caps: "${f(i.footer, 'QUARTERLY RETREAT · 7—9 NOVEMBER')}". Soft watercolor paper grain.`,
  },

  'sumi-e-zen': {
    label: 'Sumi-e Zen',
    build: (i) => `A Japanese sumi-e ink-wash poster, portrait orientation, monastic minimalism. Pure unbleached rice-paper background with subtle natural fiber texture. ${f(i.subject, 'A single black sumi brushstroke painting in the upper third — one elegant bamboo stalk with three leaves angling gracefully to the right, painted in confident wet-on-dry brushwork with visible ink granulation and one small drip')}. A small vermilion hanko seal beside the stalk. Vast empty negative space dominating the lower two-thirds. A vertical column of brushed kanji running down the right margin. Small refined english typography bottom-left in deep ink: "${f(i.title, 'MU · the empty mind')}". Below in fine italic: "${f(i.subtitle, 'an evening of zen calligraphy and tea · 3 October')}". Tiny date stamp in bottom-right corner. Looks like an authentic studio scroll.`,
  },

  'loteria-folk': {
    label: 'Loteria Folk',
    build: (i) => `A Mexican folk-art Lotería-style poster, portrait orientation, in the spirit of traditional Día de los Muertos illustrated playing-card art. Vibrant saturated palette: marigold orange, deep sapphire blue, hot pink, cactus green, bone white. ${f(i.subject, 'A central illustrated tableau framed by an ornate decorative border of papel-picado cut-paper patterns: a sugar-skull calavera with rose blossoms in the eye sockets, holding a tiny mariachi guitar, surrounded by floating cempasúchil marigold petals and a luna moth')}. Hand-drawn folk-art linework with flat color fills and dotted shading. Top of poster in chunky hand-lettered serif: "${f(i.title, 'EL CORAZÓN')}". Below in smaller hand-painted script: "${f(i.subtitle, 'Festival of Souls')}". Bottom plate: "${f(i.footer, '31 OCTUBRE — 2 NOVIEMBRE · ZÓCALO CENTRAL')}". Aged, slight ink bleed, looks like a hand-printed lithograph.`,
  },

  'surreal-dreamscape': {
    label: 'Surreal Dreamscape',
    build: (i) => `A surrealist dreamscape poster, portrait orientation, in the tradition of mid-century surrealism. ${f(i.subject, 'A perfectly clear cerulean sky with a few pillowy clouds, but one cloud is gently raining tiny green apples onto a calm reflective sea below. Floating in the center: a single ornate doorway with no walls around it, slightly ajar, the inside glowing warm amber as if it leads somewhere else entirely. A bowler-hat silhouette in the bottom-left, rendered as a perfect black cutout')}. Painterly oil-on-canvas brushwork, slight crackle. Top of poster in elegant deep-blue serif caps: "${f(i.title, 'THE OPEN ROOM')}". Below in fine italic: "${f(i.subtitle, 'an exhibition of contemporary surrealism')}". Bottom plate in tracked small caps: "${f(i.footer, 'PIER GALLERY · 2 — 30 MAY')}". Slight gallery-poster paper texture.`,
  },

  'documentary-portrait': {
    label: 'Documentary Portrait',
    build: (i) => `A documentary-photography poster, portrait orientation, in the visual tradition of Magnum reportage. Full-bleed black-and-white photograph of ${f(i.subject, 'an elderly fisherman with deeply weathered skin and a thick salt-grey beard, captured in a single decisive moment as he mends a coiled rope on the deck of a small wooden boat at dawn')}. Natural side light from low sun, harsh contrast, fine grain. The subject looks slightly off-camera, eyes calm and far. Composition leaves the upper third as moody overcast sky for type. Top-left in elegant compressed serif caps: "${f(i.title, 'THE LAST HARBOUR')}". Below in italic light: "${f(i.subtitle, 'stories from the edge of the north sea')}". Bottom-left small tracked caps: "${f(i.footer, 'A PHOTO ESSAY · PIER GALLERY · 4 — 28 JUNE')}". Looks like an authentic gelatin-silver print exhibition poster.`,
  },

  'sports-action-hero': {
    label: 'Sports Action Hero',
    build: (i) => `A sports campaign poster, portrait orientation, dramatic stadium-night photography. ${f(i.subject, 'A muscular middle-distance runner in mid-stride, frozen in motion at peak extension, sweat catching the light, wearing a sleek tangerine running singlet and short black shorts with neon piping')}. Photographed from a low side angle against a sea of out-of-focus stadium floodlights bursting like stars in the dark night, lens flares, light streaks trailing behind suggesting speed. Deep cyan and amber colour grade. Massive stencil-style condensed sans-serif title across the top in white with a tangerine drop-shadow: "${f(i.title, 'OUTRUN THE NIGHT')}". Subtitle in spaced caps below: "${f(i.subtitle, 'THE 10K SERIES · ROUND THREE')}". Bottom strip in flat black band with bright tangerine type: "${f(i.footer, 'NORTH STADIUM · SAT 22 NOVEMBER · 21:00')}". A small swoosh-style mark in the lower-right corner. High-impact athletic feel.`,
  },

  'album-cover-portrait': {
    label: 'Album Cover Portrait',
    build: (i) => `A vinyl-record album cover poster, portrait square-ish orientation, late-1970s soul-funk reissue aesthetic. ${f(i.subject, 'A medium-shot studio portrait of a young woman with a natural afro, wearing a turtleneck mustard-yellow sweater and oversized rose-tinted aviator glasses, leaning casually against a deep teal painted backdrop')}. Soft warm tungsten light, slight 35mm film grain, subtle chromatic vignette, the colour palette pulled toward burnt orange and cyan. The subject looks directly into the camera with a quiet confident half-smile. Bottom third overlaid with a thick mustard-yellow band. On the band in tall condensed serif caps: "${f(i.title, 'RUTH OKOYE')}". Below in smaller spaced italic: "${f(i.subtitle, 'SLOW FIRE — A DEBUT IN TEN MOVEMENTS')}". Bottom-right corner inside the band, a small spinning vinyl glyph and label info: "${f(i.footer, 'GOLDLEAF SOUNDS · LP 047 · 2026')}". Slight paper-sleeve wear at the corners.`,
  },

  'post-apoc-sword': {
    label: 'Post-Apocalyptic Sword',
    build: (i) => `A cinematic post-apocalyptic action game key-art poster, portrait orientation, in the visual register of a Korean AAA action-adventure title. Center: ${f(i.subject, 'a single agile female warrior in a tight matte-black tactical bodysuit with iridescent silver seams, holding a long thin curved energy blade that glows pale cyan, hair tied in a long ponytail whipping in the wind, photographed from a low hero angle as she stands on the broken edge of an overgrown ruined skyscraper at golden-hour')}. Behind her: a vast crumbling overgrown megacity, vines and ash, distant alien biomechanical monstrosities silhouetted against a blood-orange smog sky. Dramatic volumetric god-rays through the haze. Photoreal cinematic 3D render, ultra-detailed, depth of field, slight chromatic aberration. Bottom band of the poster in a sleek geometric sans-serif title: "${f(i.title, 'OBSIDIAN BLOOM')}". Tagline in fine spaced caps below: "${f(i.subtitle, 'RECLAIM WHAT REMAINS')}". Bottom strip with platform glyphs and release window: "${f(i.footer, 'WINTER 2026 — PS5 · PC')}". AAA game-poster polish.`,
  },

  'lone-traveler-cargo': {
    label: 'Lone Traveler Cargo',
    build: (i) => `A melancholic sci-fi key-art poster, portrait orientation, dreamlike Icelandic apocalypse aesthetic. ${f(i.subject, 'Single lone traveler, photographed from behind in long-shot, walking away from camera across a vast empty volcanic-ash basalt plain that stretches to a low horizon. He carries an absurdly tall stack of metal cargo crates strapped to his back with thick rubber harnesses')}. Pale golden particulate ash drifting through the air like glowing pollen. Distant snow-capped jagged mountain range under a vast pewter overcast sky. A small encapsulated infant pod glows soft amber at his hip. Shallow puddles of black tar reflect the sky in surreal patterns. Cool desaturated colour grade, slight film grain. A single phantom handprint floats faintly in the upper-right empty sky. Top of poster in a thin elegant condensed serif title in cream: "${f(i.title, 'THE LONG CARRY')}". Beneath in fine italic sans: "${f(i.subtitle, 'a meditation on connection')}". Bottom strip in small monospace caps: "${f(i.footer, 'AN INTERACTIVE EXPERIENCE · 2026')}". Looks like prestige game key-art. Quietly devastating.`,
  },

  'neon-noir-cyberpunk': {
    label: 'Neon Noir Cyberpunk',
    build: (i) => `A neon-noir cyberpunk film poster, portrait orientation, in the visual register of dystopian future cinema. Setting: ${f(i.subject, 'a rain-soaked megacity street at night, towering brutalist concrete megastructures looming overhead with massive flickering hologram billboards in pink and electric cyan projecting a stylized geisha sipping a soda. Heavy diagonal rain catching the neon, steam rising from the wet asphalt, deep noir shadows. Mid-foreground: a lone trench-coated figure with their back turned to camera, walking slowly down the alley toward a distant amber glow, surrounded by faceless umbrella-carrying crowds. Dense Japanese kanji and Chinese signage on every surface')}. Painterly photoreal, deep blacks, electric purple-magenta haze, slight film grain, anamorphic lens flare streaks across the frame. Top of poster in tall condensed serif caps in dirty cream: "${f(i.title, 'RAIN CITY')}". Subtitle in italic light: "${f(i.subtitle, 'the future remembers everything')}". Bottom plate of fake billing in tiny condensed type, single line: "${f(i.footer, 'IN THEATRES · WINTER')}". Letterboxed aspect ratio with thin black bars top and bottom. Cinematic 70mm prestige feel.`,
  },

  'streetwear-lookbook': {
    label: 'Streetwear Lookbook',
    build: (i) => `A streetwear brand lookbook poster, portrait orientation, Tokyo-meets-NYC editorial fashion energy. Cool clean concrete-grey studio backdrop with one harsh slash of natural daylight cutting diagonally across the floor. ${f(i.subject, 'A single young model standing confidently in a wide stance, wearing oversized cargo pants in washed olive, a heavyweight cream boxy hoodie with a small embroidered logo on the chest, chunky black skate sneakers, and a small black crossbody bag slung tight')}. Cool desaturated colour grade, slight 35mm grain. Top-left corner stacked sans-serif title in heavy black: "${f(i.title, 'RESERVE / 04')}". Subtitle directly under in tight tracked caps: "${f(i.subtitle, 'SS26 LOOKBOOK · DROP FOUR')}". Bottom-right small block: brand wordmark in thin futura caps: "${f(i.body, 'GREYWORKS')}". Bottom-left tracked monospace footer: "${f(i.footer, 'FRI 12 SEPT · IN-STORE & ONLINE')}". Clean editorial restraint, no clutter. Magazine-quality photography.`,
  },

  'minimal-tech-keynote': {
    label: 'Minimal Tech Keynote',
    build: (i) => `A minimalist tech product reveal poster, portrait orientation, keynote-stage aesthetic. Pure black background with a single soft luminous cool-blue radial halo glowing from the centre. Centred and floating: ${f(i.subject, 'a single sleek product hero shot of a thin matte-grey ceramic wearable device — a perfectly circular puck about the size of a watch face, polished aluminium edge, single tiny illuminated white dot indicator')}. Hyper-detailed photoreal product photography, dramatic single-source key light from the upper-left, soft falloff, every surface flawless, shallow depth of field, faint specular highlights. Top of poster in ultra-thin sans-serif geometric type, lowercase: "${f(i.title, 'lume')}". Beneath in even thinner spaced caps: "${f(i.subtitle, 'ATTENTION, REIMAGINED')}". Far below the product, single short line in tiny tracked grey caps: "${f(i.footer, 'OCTOBER 14')}". Generous negative space. No bullet points, no specs.`,
  },

  'brutalist-broadcast': {
    label: 'Brutalist Broadcast',
    build: (i) => `A high-contrast brutalist sports campaign poster, portrait orientation, modular 3-row grid composition with broadcast lower-third energy. Heavy stencil/condensed sans-serif typography, jersey-number digit dominating one row. ${f(i.subject, 'A duotone photograph band of an athlete mid-effort, treated in single-channel ink — high contrast black-and-cream, slightly halftoned, like a broadcast graphic still')}. Layout reads top-to-bottom: row one is a giant tabloid number/title combo, row two is the duotone photo band edge-to-edge, row three is a black panel with stacked details in monospace caps. Strict palette: matte black #111, cream #F2E9DC, single accent (terracotta or hazard-yellow). Top of poster, broadcast-style title in heavy condensed sans: "${f(i.title, '[TITLE]')}". Sub-line in tracked caps: "${f(i.subtitle, '[SUBTITLE]')}". Bottom black panel with details in mono caps: "${f(i.footer, '[DATE · VENUE · PRICE]')}". Print-press registration grit, no decoration, jersey-number scale.`,
  },

  'emerald-nocturne': {
    label: 'Emerald Nocturne',
    build: (i) => `An evening hospitality poster, portrait orientation, deep velvet jewel-tone aesthetic. Background: rich emerald-green (#0E3B2E) with a subtle moiré or velvet texture. Brass and champagne metallic accents — thin hairline rules in burnished brass framing the layout. ${f(i.subject, 'A single inset photograph centred upper-third — a moody close-up of a wine glass on a marble bar, candlelight catching the rim, dressed in soft amber haze')}. Classical engraved small-caps display serif for the headline, set in champagne-gold: "${f(i.title, '[VENUE]')}". Below in fine italic ivory: "${f(i.subtitle, '[OCCASION]')}". Body block in centred Caslon-style serif, ivory: "${f(i.body, '[DETAILS]')}". Bottom plate, tracked small caps in brass: "${f(i.footer, '[DATE · ADDRESS]')}". Refined late-night menu-card energy, no clutter. Print quality, faint paper-press grain.`,
  },

  'absurd-transit-map': {
    label: 'Absurd Transit Map',
    experimental: true,
    build: (i) => `A Massimo Vignelli-style transit map poster, portrait orientation, designed in the precise visual language of the 1972 New York City subway diagram. Pure white background. Clean 60-degree-and-45-degree angled coloured route lines crossing the poster: a hot-pink line, a deep-navy line, a marigold line, a forest-green line, a slate-grey line, all with perfect rounded corners and consistent stroke width. Stations rendered as small black dots with thin tick marks, labelled in tight Helvetica caps. The lines and stations are real-looking but the names are emotional states — stations include: ${f(i.subject, '"MILD ANXIETY JUNCTION", "THE DREAD EXPRESS", "QUIET SUNDAY", "OPTIMISM HEIGHTS", "MIDNIGHT REGRET", "SLOW REVELATION", "CRYING ON THE BUS", "AN OLD SONG ON SHUFFLE", "HOPE / LOSS INTERCHANGE"')}. Top-right corner master title in heavy Helvetica caps: "${f(i.title, 'INNER LINES')}". Below in small light caps: "${f(i.subtitle, 'A DIAGRAM OF MOODS · UPDATED APRIL 2026')}". Bottom-right small block: a transit-style legend showing each colour line by category. Bottom-left tiny tracked caps: "${f(i.footer, 'TRANSIT-INSPIRED · NOT FOR ACTUAL TRAVEL')}". Crisp printed feel.`,
  },
};

const PICK_RULES = [
  ['cinematic-neonoir', /\b(noir|thriller|crime|detective|dark cinematic|moody)\b/i],
  ['vintage-travel', /\b(travel|destination|tourism|alpine|railway|vintage poster)\b/i],
  ['swiss-minimal-typo', /\b(swiss|minimal|typography|helvetica|design lecture)\b/i],
  ['tech-conf-darkmode', /\b(tech conf|developer|agentic|ai conference|hackathon|startup summit)\b/i],
  ['corporate-report', /\b(annual report|earnings|executive|finance|holdings|enterprise cover)\b/i],
  ['indie-gig-riso', /\b(gig|underground|diy|riso|risograph|punk|small venue)\b/i],
  ['luxury-real-estate', /\b(listing|open house|home for sale|broker)\b/i],
  ['luxury-estate-cover', /\b(estate cover|architectural retreat|luxury home magazine|estate brochure)\b/i],
  ['art-deco', /\b(art deco|gatsby|1920s|deco|jazz age|flapper)\b/i],
  ['bauhaus-geometric', /\b(bauhaus|geometric|primary color|design school|dessau)\b/i],
  ['ukiyo-e', /\b(ukiyo|woodblock|edo|japanese print|hokusai|fuji)\b/i],
  ['psychedelic-60s', /\b(psychedelic|sixties|60s|hippie|fillmore|trippy)\b/i],
  ['vaporwave-synth', /\b(vaporwave|synthwave|retro futur|80s neon|aesthetic)\b/i],
  ['saul-bass-minimal', /\b(saul bass|cut paper|hitchcock|minimal film)\b/i],
  ['memphis-80s', /\b(memphis|sottsass|postmodern 80s|terrazzo|clashing pattern)\b/i],
  ['editorial-fashion', /\b(fashion|editorial|magazine cover|haute|couture)\b/i],
  ['symmetric-storybook', /\b(symmetric|storybook|dollhouse|pastel film)\b/i],
  ['pop-art-comic', /\b(pop art|comic|lichtenstein|ben.day|halftone)\b/i],
  ['pastel-mindful', /\b(wellness|mindful|meditat|retreat|calm|quiet|self.care)\b/i],
  ['sumi-e-zen', /\b(zen|sumi|ink wash|monastic|tea ceremony|japanese minimal)\b/i],
  ['loteria-folk', /\b(día de|day of the dead|loteria|mexican|folk art|festival of souls)\b/i],
  ['surreal-dreamscape', /\b(surreal|magritte|dreamscape|dreamlike|absurd|floating)\b/i],
  ['documentary-portrait', /\b(documentary|reportage|magnum|photo essay|photojournal)\b/i],
  ['sports-action-hero', /\b(stadium|race|marathon|athletic action|sports event)\b/i],
  ['album-cover-portrait', /\b(album cover|vinyl|soul|funk|debut album|lp release)\b/i],
  ['post-apoc-sword', /\b(post.apocalyptic|action game|sci.fi game|ruined city|warrior)\b/i],
  ['lone-traveler-cargo', /\b(lone traveler|melancholic sci.?fi|iceland|cargo|wanderer)\b/i],
  ['neon-noir-cyberpunk', /\b(cyberpunk|neon noir|dystopian|megacity|hologram)\b/i],
  ['streetwear-lookbook', /\b(streetwear|lookbook|drop|collection|hypebeast)\b/i],
  ['minimal-tech-keynote', /\b(tech product|keynote|gadget reveal|product launch|apple.style)\b/i],
  ['brutalist-broadcast', /\b(brutalist|broadcast|tabloid|jersey number|hyrox|crossfit|race day|combat sport)\b/i],
  ['emerald-nocturne', /\b(restaurant|wine bar|cocktail|nightclub|jazz lounge|brasserie|menu card|hospitality)\b/i],
  // Experimental styles (excluded from auto-picker by default; reachable via --style= or --include-experimental)
  ['absurd-transit-map', /\b(transit map|subway|vignelli|mood map|diagram)\b/i, { experimental: true }],
];

export function pickStyle(brief, { includeExperimental = false } = {}) {
  for (const rule of PICK_RULES) {
    const [id, rx, opts] = rule;
    if (opts?.experimental && !includeExperimental) continue;
    if (rx.test(brief)) return id;
  }
  return null;
}
