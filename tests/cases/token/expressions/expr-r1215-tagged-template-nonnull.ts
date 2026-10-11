// xl:note 标签模板那一格外面套着一层 `!`（第 1215 轮，用户口径 1.1）：`a`x`.b!` 的产物是
// `[Identifier(a), NotNull([PropertyAccess([String, ., b]), !])]` —— 装着模板的 `PropertyAccess`
// 在 `NotNull` 的核里，0c 那条「这一格是不是 `PropertyAccess`」的判据答否 ⇒ 连标签模板一起丢。
// 判据往里看一层（`NotNull.CoreHead`），接完内核再用 `bangWrapped` 把 `!` 套回整条链外面。
// xl:expect NotNull,PropertyAccess,String,Method,Bracket
const a1 = a`x`.b!;
const a2 = a`x`[c]!;
const a3 = f()`x`.b!;
const a4 = a[0]`x`[c]!;
const a5 = a.b`x`.b!;
const a6 = this`x`[c]!;
const a7 = (a)`x`.b!;
const a8 = a`x`.b;
