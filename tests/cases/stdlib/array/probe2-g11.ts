// xl:title Array.prototype.reverse.call({ length: 2, 0: 1, 1: 2 }).join(",")
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`（`reverse.call(类数组)`）。Node 这一条抛 `TypeError` 是**探针自己的形状**——`.join` 其实不在那个普通对象上，真正要量的还是「泛用接收者」那一格。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.reverse.call({ length: 2, 0: 1, 1: 2 }).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
