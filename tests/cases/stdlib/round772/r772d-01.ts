// xl:title `Promise` 静态方法自己那两格：`length` 与 `name`
// xl:round 772
// xl:judge stdout
// xl:want differ
// xl:why 第 733 / 734 轮给 `Array` / `String` / `Number` / `Boolean` / `Error` 那几族的静态与原型方法补了 `name` / `length`，`Promise` 那一族**漏了**：`Promise.all.length` 该是 `1`、本仓给 `0`；`Promise.all.name` 该是 `"all"`、本仓给 `""`（第 772 轮普查的 `p772d`）。**六个静态（01 / 03 / 04 / 05 / 06 / 07 的长度，02 / 08 / 09 的名字）都要补**；`Promise.prototype.then.length`（`2`）、`Promise.length`（`1`）与 `Promise.name`（`"Promise"`）三行两边本来就是对的，钉住它们不受连累
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 Promise.all.length', show(() => Promise.all.length));
console.log('02 Promise.all.name', show(() => Promise.all.name));
console.log('03 Promise.allSettled.length', show(() => (Promise as any).allSettled.length));
console.log('04 Promise.race.length', show(() => Promise.race.length));
console.log('05 Promise.any.length', show(() => (Promise as any).any.length));
console.log('06 Promise.resolve.length', show(() => Promise.resolve.length));
console.log('07 Promise.reject.length', show(() => Promise.reject.length));
console.log('08 Promise.resolve.name', show(() => Promise.resolve.name));
console.log('09 Promise.race.name', show(() => Promise.race.name));
console.log('10 Promise.prototype.then.length', show(() => (Promise.prototype.then as any).length));
console.log('11 Promise.length', show(() => Promise.length));
console.log('12 Promise.name', show(() => Promise.name));
