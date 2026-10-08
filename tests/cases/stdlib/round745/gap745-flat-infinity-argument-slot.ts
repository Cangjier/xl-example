// xl:title `flat(Infinity)` 的深度被同一句里的 `1.9` 顶成 2
// xl:round 745
// xl:judge stdout
// xl:why 与 `gap745-float-literal-eats-nan` **同一条根**：语句里那格实参被别处的常量顶掉。
// xl:why 这一条是**反方向**的那个朝向——被顶掉的是 `Infinity` 那一格，
// xl:why 而顶上来的是**同一句里那个 `1.9`**（`[1,2,[3]]` 于是只摊一层，Node 摊到底）。
// xl:why
// xl:why 为什么值得单列一条：`flat(Infinity)` 是本仓**唯一**会走
// xl:why `IntOfNumber` 里 `Infinity ⇒ 2147483647` 那一支的调用点
// xl:why （第 274 轮为它单独绕过一次 `ArgOr`）——而 `1.9` 走的是另一支（向零截断）。
// xl:why 两行并排就把「哪一格被顶掉了」钉死：**`Infinity` 那格拿到了 `1.9` 的折值**。
// xl:end
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat(Infinity)), JSON.stringify(a.flat(1.9)));
console.log(JSON.stringify(a.flat(1.9)), JSON.stringify(a.flat(Infinity)));
