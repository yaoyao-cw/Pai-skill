#!/usr/bin/env python3
"""Build one self-contained Colorfigures page.

    python3 build.py figure.html OUT.html

figure.html loads <script src="core.js"></script>; the engine (assets/core.js) is inlined in its place, and the page
features are added: zoom (pinch, ctrl/cmd + scroll, a - 100% + chip), notices on the figure, the See-through / Labels
switches placed for desktop and phone, labels as numbered badges with a list on a phone, a taller frame on a phone,
the slim game keypad on a phone, solid cast shadows in see-through, and a lighter filter while the figure moves on
touch screens.
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = '<style>.mcap{display:none!important}@media (max-width:560px){.stat .v{font-size:20px!important}.stats{align-items:flex-end}}@media (min-width:561px){.vset{top:4px!important}#stats{top:var(--vset-h,44px)!important}}</style><style>@media (max-width:560px){body > header{display:none}}</style><script>window.FIG_A = () => innerWidth <= 560 ? 1.1 : .75;</script><script>window.LBL_U = () => { if (innerWidth > 560) return 0; const s = document.getElementById("fig"); return s && s.clientWidth && s.viewBox.baseVal.width ? s.viewBox.baseVal.width / s.clientWidth : 0; };</script>'
TAIL = open('/tmp/colorfigures/scripts/build.py').read().split("TAIL = ",1)[1].split("src, out",1)[0]  # placeholder, will replace
