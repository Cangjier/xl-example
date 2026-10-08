// xl:title class A extends Array { } new A(3).length
// xl:round 699
// xl:judge stdout
// xl:want blocked
// xl:why `class A extends Array { }` 的 `super(...)` 落到**宿主构造**上时报 `heap object is not an environment`——与 `class M extends Error {}` 那一格同根（内建构造当基类时，构造帧里的那条路还没接上）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A extends Array { } return (new A(3).length); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
