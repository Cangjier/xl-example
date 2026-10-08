// xl:title `void` 后面跟括号字面量（第 726 轮登记的缺口）
// xl:round 726
// xl:judge stdout
// xl:want blocked
// xl:why **`void` 没能与 `delete` / `await` / `yield` 一起收**（第 726 轮）：它在 TypeScript 里
// xl:why 还是**类型位的一个词**——`function f(): void {` 与 `on(…): () => void {` 那两处
// xl:why 的 `{` 是**函数体**（块）。第一版把 `void` 也加进豁免名单，**当场坏掉 64 条**
// xl:why （函数体变成对象字面量 ⇒ `unimplemented: statement Identifier`）；改成「看 `void`
// xl:why 前面那一格是不是 `:`」之后还剩 `() => void {` 那一档（前面是 `=>`）。
// xl:why 要收它得先分清那个 `=>` 是不是类型位的（`Context` 那一层的信息），
// xl:why 所以这一轮**只收 `delete` / `await` / `yield`**，`void` 照旧按块 / 下标收——
// xl:why `void { … }` 报 `unimplemented: expression Block`、`void [ … ]` 报
// xl:why `unimplemented: expression Bracket`（两条都是**整份文件跑不起来**）。
// xl:end
console.log(void { v: 1 });
console.log(void [1, 2]);
console.log(typeof void 0);
