// xl:note 结构括号与关键字之间夹一条注释——关键字与 `)` / `{` 的相邻判定要跨 trivia
// xl:expect Switch,Try,IfSet,IfBody,While,For,Foreach
export function bodies(a: number): number {
  let total = 0;
  switch (a) /* 判别与体之间 */ {
    case 1:
      break;
    default:
      break;
  }
  try {
    total += 1;
  } catch /* 形参之前 */ (error) {
    total = 0;
  } finally /* 体之前 */ {
    total += 0;
  }
  // **体那一格夹注释（两条口径都守着）** ✓：
  // `if (a) /* c */ { … } else { … }` 里那个 `/` 是 **trivia**、不是体的开头 ✓
  // ⇒ 体是 `IfBody`、`else` 照常认成下一段（第 847 轮收掉的那一族）✓；
  // 下一句量的是**另一处**：注释夹在 `else` 与它的体之间 ✓（同一轮，两根各一处）。
  if (a) {
    total += 1;
  } else /* else 与体之间 */ {
    total += 2;
  }
  while (a) /* 条件与体之间 */ {
    total += 1;
  }
  for (let i = 0; i < 2; i++) /* 头与体之间 */ {
    total += i;
  }
  for (const x of [1, 2]) /* 头与体之间 */ {
    total += x;
  }
  return total;
}
