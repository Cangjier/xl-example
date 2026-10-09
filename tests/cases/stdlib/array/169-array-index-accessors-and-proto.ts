// xl:title 数组上挂访问器 / 往 `Array.prototype` 加格：两条越界登记
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一处判据的十条**：
//   probe702-a-e01（ToNumber 那一半）· probe-a25（`Math.max(…arr)`，无关那一半另计）
//   ＋ `143-getter-array-index` / `144-define-on-array-index` / `142-array-proto-mutation`
//     / `149-concat-spreadable` / `150-array-species-subclass` / `154-foreach-this-arg`
//
// 判定点只有两个（都是**边界**，合起来才看得出「数组的格与真数组的关系」）：
//  ① 数组下标上挂访问器 / 数据属性改写：`defineProperty` 能把它变成访问器，
//     但 `length` 那一格的联动规则照旧；
//  ② 往 `Array.prototype` 上加一格，**所有数组**都看得见（这是 `fill` 之类
//     「先往原型上加、再用完删掉」那一路的根据）。
// 本条的**收尾会把加的那一格删掉**（越界的写法要当场改回去，见 README 第 3 节）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // ① 下标上的访问器
  const a: any = [1, 2, 3];
  let got = 0;
  Object.defineProperty(a, "0", { get() { got++; return 9; }, configurable: true });
  console.log(show(a[0] + ":" + got));
  console.log(show(a.join(",")));
  const b: any = [1, 2, 3];
  Object.defineProperty(b, "0", { value: 7, enumerable: true, writable: true, configurable: true });
  console.log(show(b.join(",") + ":" + b.length));
  // ② 往 Array.prototype 上加一格（**当场改回去**）
  console.log(show(([1, 2] as any).zzProbeGone));
  (Array.prototype as any).zzProbeGone = "yes";
  console.log(show(([1, 2] as any).zzProbeGone));
  console.log(show(Object.hasOwn([1, 2] as any, "zzProbeGone")));
  delete (Array.prototype as any).zzProbeGone;
  console.log(show(([1, 2] as any).zzProbeGone));
  // ③ 实参过 ToNumber 那一档（与本条同源的一处边界）
  console.log(show([1, 2, 3].slice("1" as any).join(",")));
  console.log(show([1, 2, 3].fill(0, { valueOf: () => 1 } as any, { valueOf: () => 2 } as any).join(",")));
  console.log(show([1, 2, 3].indexOf(2, { valueOf: () => 1 } as any)));
  console.log(show([1, 2, 3].at({ valueOf: () => 1 } as any)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
