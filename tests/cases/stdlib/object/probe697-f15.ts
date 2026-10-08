// xl:title (function () { const o = { a: 1 }; Object.defineProperty(o, "b", { value: 2, enumerable: false }); const out = []; for (const k in o) out.push(k); return out.join(","); })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.defineProperty(o, "b", { value: 2, enumerable: false }); const out = []; for (const k in o) out.push(k); return out.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
