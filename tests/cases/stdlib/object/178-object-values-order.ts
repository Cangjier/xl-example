// xl:title `Object.values` 的取值次序与可枚举性
// xl:round 692
// xl:judge stdout
// xl:end
// 合并原先**逐字节相同**的三条原子探针：probe-j12 · probe693-o08 · probe703-o-a37。
// 判定点只有一个：**`Object.values` 按 `Object.keys` 的次序取值**（整数键在前）。
// 打印壳与原来那三条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Object.values({ a: 1, b: 2 }).join(",")));
  // 同一片：次序跟着整数键那一条规矩走，且不可枚举的格不进
  console.log(show(Object.values({ b: 1, 2: 2, a: 3 }).join(",")));
  console.log(show(String(Object.values({ a: 1, b: 2 }).length)));
  const o: any = {};
  Object.defineProperty(o, "hidden", { value: 9, enumerable: false });
  o.shown = 1;
  console.log(show(Object.values(o).join(",")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
