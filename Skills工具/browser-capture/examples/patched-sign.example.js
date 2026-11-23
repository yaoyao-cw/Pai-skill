// Example local replacement script referenced by examples/override-rules.example.json.
// Edit this file and refresh the target page to hot-swap without restarting the collector.
window.__patchedSign = function patchedSign(payload) {
  console.log('[override-probe] sign input:', payload);
  return payload;
};
