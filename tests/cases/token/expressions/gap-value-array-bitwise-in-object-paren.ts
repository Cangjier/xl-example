// xl:note 上一条**还没收干净的那几格**（第 686 轮，记在明处）：对象值位里**被括号包住**的
// 数组 / 值表达式仍然折成 `UnionType`——
//   `f({ z: [3 & 4] })`（实参里的对象）、`const b = ({ w: [5 | 6] });`（括号化对象）、
//   `const c = { v: (7 | 8) };`（值是括号）
// 根因与已修的那一格同一个：判据仍然落到「前一个实义单元是 `:`」那条老路上。
// 那三格上，招待 `IsTypeBracketPosition` 时 `unit.Context` 是 `"type"`（空 / 错都实测到），
// **宿主槽位当时还不是 `ObjectLiteral`**（是 `Bracket`）——所以按宿主挡也挡不住。
// 要收它得让 `DecideBracketContext`（开括号那一刻）认得出「我在对象字面量的值位」，
// 而那一刻前文只是词法平列表、`{` 还没收成 `ObjectLiteral`。
// xl:known-gap 对象值位里被括号包住的数组 / 值表达式：`unit.Context` 是 `"type"` 或 `""`，
// 且宿主槽位那时还是 `Bracket` 而不是 `ObjectLiteral`，两条判据都接不住。
// xl:expect UnionType:2,IntersectionType
const b = ({ w: [5 | 6] });
const c = { v: (7 | 8) };
f({ z: [3 & 4] });
