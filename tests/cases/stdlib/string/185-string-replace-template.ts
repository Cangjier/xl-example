// xl:title `String.prototype.replace` 的替换模板：`$&` / `$\`` / `$'` / `$$` 与空匹配
// xl:round 693
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的九条原子探针**（同一个 `$` 解释被第 693 / 695 两轮各抄了一遍）：
//   probe693-y02 · probe693-y03 · probe693-y04 · probe693-y05
//   probe695-y01 · probe695-y02 · probe695-y03 · probe695-y04 · probe695-y05
// 判定点只有一个：**替换模板里 `$` 开头的那几串各自的含义**——
//   `$&` 匹配到的子串 · `` $` `` 匹配**之前**那一段 · `$'` 匹配**之后**那一段 ·
//   `$$` 一个字面量 `$`；且**空匹配**（`replace("", x)`）在前缀位置插入一次。
// 与 `replace` 的**函数形式**（回调拿到的实参表）不是同一个判定点——
// 那一件另有归属（`164-string-replace-function` 与 `probe694-y01`）。
//
// `probe693-y02` 的靶子是 `"aXbXc"`、`probe695-y01` 是 `"abc"`：两边的**期望值不同**但
// **问的是同一件事**（`$&$&` 把匹配到的字符重复一次），所以合到这里、两条都写。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  // `$&`：整段匹配重复一次（两个靶子都写，好把"只看第一个匹配"这一层也钉住）
  console.log(show("aXbXc".replace("X", "$&$&")));
  console.log(show("abc".replace("b", "$&$&")));
  // `` $` ``：匹配**之前**那一段
  console.log(show("aXb".replace("X", "$`")));
  console.log(show("abc".replace("b", "$`")));
  // `$'`：匹配**之后**那一段
  console.log(show("aXb".replace("X", "$'")));
  console.log(show("abc".replace("b", "$'")));
  // `$$`：一个字面量 `$`
  console.log(show("abc".replace("b", "$$")));
  // 空匹配：在**开头**插一次（不是每个位置都插）
  console.log(show("abc".replace("", "-")));
  console.log(show("abc".replace("", "x")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
