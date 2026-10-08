// xl:title (function () { class A { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }) }; } } return [...new A()].join(","); })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }) }; } } return [...new A()].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
