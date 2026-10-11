// xl:note 第 1211 轮（口径 1.1）收掉：NCO 里不止一格时，`?.` 后面那一截从第一格起逐格接——
// `a?.b`x`.b` 的 NCO 内容是 `[Identifier(b), PropertyAccess([String(反引号), ., b])]`，
// 模板与它后面那一截被收成了第一格的兄弟；通用支只按 first 折一格属性访问、end 还取整个 NCO
// ⇒ 模板整段丢。这一串交给 membersOnto（与 first.IsPropertyAccess 那一支同一份实现）。
// xl:round 1211
// xl:end
a?.b`x`.b;
