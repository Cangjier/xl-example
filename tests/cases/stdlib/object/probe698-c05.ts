// xl:title (function () { const o = {}; Object.defineProperty(o, "a", { value: 1, configurable: false }); try { Object.defineProperty(o, "a", { value: 2 }); return "ok"; } catch (e) { return e.constructor.name; } })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; Object.defineProperty(o, "a", { value: 1, configurable: false }); try { Object.defineProperty(o, "a", { value: 2 }); return "ok"; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
