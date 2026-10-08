// xl:title (function () { const o = { a: 1 }; Object.defineProperty(o, "a", { get() { return 2; } }); return [o.a, typeof Object.getOwnPropertyDescriptor(o, "a").get].join(","); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.defineProperty(o, "a", { get() { return 2; } }); return [o.a, typeof Object.getOwnPropertyDescriptor(o, "a").get].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
