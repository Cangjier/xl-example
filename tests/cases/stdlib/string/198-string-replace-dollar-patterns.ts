// xl:title `replace` 的替换文本：`$&` / `` $` `` / `$'` / `$$` 与不合法的记号
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的八条**：
//   probe699-s-t03 · probe699-s-t04 · probe699-s-t05 · probe700-g-t01 · probe700-g-t02
//   ＋ 原有的 `041-string-replace-dollar-forms`（同一件事的第一份，已经算在这一族里）
//
// 判定点只有一个：**替换文本里 `$` 那一族的展开表**——
//  ① 认得的四格：`$&`（整个匹配）、`` $` ``（匹配之前的）、`$'`（匹配之后的）、`$$`（一个字面 `$`）；
//  ② **没有捕获组**时 `$1` / `$<x>` 不被认出来，**原样留下**（不是空串、也不抛）；
//  ③ `$x` / 结尾孤立的 `$` 同样原样留下。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show("abc".replace("b", "$1")));
  console.log(show("abc".replace("b", "$<x>")));
  console.log(show("abc".replace("b", "$x")));
  console.log(show("abc".replace("b", "$")));
  console.log(show("abc".replace("b", "[$&]")));
  console.log(show("abc".replace("b", "[$`]")));
  console.log(show("abc".replace("b", "[$']")));
  console.log(show("abc".replace("b", "[$$]")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
