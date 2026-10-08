// xl:title Set 的 Symbol.iterator 那一格（第 712 轮新铺的）
// xl:round 712
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  const s = new Set([1, 2]);
  const it: any = (s as any)[Symbol.iterator]();
  const first = it.next().value;
  const second = new Set([1]).values;
  console.log(show(typeof (s as any)[Symbol.iterator]) + "," + show(first) + ","
    + ((s as any)[Symbol.iterator] === second));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
