// xl:title `Object.getOwnPropertyNames(数组)`：下标 + `length`，符号键不在里面
// xl:round 692
// xl:judge stdout
// xl:end
// 本文件合并了原先**逐字节相同**的四条原子探针（第 692 / 693 / 703 / 704 轮各抄了一遍）：
//   probe2-d20 · probe693-o04 · probe703-o-a22 · probe704-o-d37
// 判定点只有一个：**数组的自有名表 = 下标（字符串键）+ `length`**，且**符号键不在里面**。
// 同一件事写了四遍 ⇒ 任何一处实现改动让四条一起红，判定力与一条完全相同。
// 原来那四条的打印口径是 `typeof:值` 的壳（`show`）——这里保留同一个壳，
// 好让这一条的**判据与从前逐字节一致**（合并不许改变判定）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

const xs: any = [1, 2];
const s = Symbol("s");
xs[s] = 9;

try {
  // 主判定：下标 + length
  console.log(show(Object.getOwnPropertyNames(xs).join(",")));
  // 同一片：符号键不进这一族（它是 getOwnPropertySymbols 那一格的事）
  console.log(show(Object.getOwnPropertyNames(xs).length));
  console.log(show(Object.getOwnPropertyNames(xs).includes("length")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
