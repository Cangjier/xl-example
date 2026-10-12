// xl:note for-of / for-in 的绑定名可以是 `get` / `set` / `override` 这类**上下文关键字**：
// 产物把那一格升成 `<Keyword>`，而 TS 那边它是 `Identifier`。
// 投影只认 `Identifier` 时整段找不到名字 ⇒ `initializer` 整格消失
// ⇒ 降级层报 `ast node ForOfStatement has no child initializer`（整份文件进不来）。
// xl:expect Keyword,Foreach,Identifier
for (const set of [1, 2]) {
  console.log(set);
}
for (const get of [3]) {
  console.log(get);
}
for (const override of [4]) {
  console.log(override);
}
for (const k in { set: 1 }) {
  console.log(k);
}
