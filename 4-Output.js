// POWERS — Output Hook
// Treats narrated outcomes as stronger evidence than attempts, updates power continuity, and maintains evidence-anchored NPC Inner Current state.
var modifier = function (text) {
  try {
    return { text: POWERS.onOutput(text) };
  } catch (err) {
    try { console.log("POWERS Output error:", err && err.message ? err.message : err); } catch (e) {}
    return { text: text };
  }
};
modifier(text)
