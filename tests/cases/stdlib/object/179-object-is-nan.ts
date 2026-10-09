// xl:title `Object.is(NaN, NaN)` 给真——这是它与 `===` 的第一处分歧
// xl:round 692
// xl:judge stdout
// xl:end
// 合并原先**逐字节相同**的三条原子探针：probe-j16 · probe693-o18 · probe697-f17。
// 判定点只有一个：**`SameValue` 把 `NaN` 认成相等**（`NaN === NaN` 是假，`Object.is` 是真）。
// 另一半（`Object.is(0, -0)` 给假）是**另一个**判定点，留在 `016-object-is`。
// 打印壳与原来那三条一致。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(Object.is(NaN, NaN)));
  // 同一片的对照：`===` 在这里给假，所以这条量的正是那一处分歧
  console.log(show(NaN === NaN));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
