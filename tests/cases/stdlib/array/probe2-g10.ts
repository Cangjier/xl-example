// xl:title (function () { try { return Array.prototype.push.call({ length: 0 }, 1); } catch (e) { return e.constructor.name; } })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`：`push` / `pop` / `shift` / `unshift` / `splice` 那一族要**写回**类数组（长度那一格也要按 `Set(O, "length", …)` 办）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { return Array.prototype.push.call({ length: 0 }, 1); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
