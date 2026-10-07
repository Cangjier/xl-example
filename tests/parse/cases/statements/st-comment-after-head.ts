// xl:note 结构括号与关键字之间夹一条注释——关键字与 `)` / `{` 的相邻判定要跨 trivia
// xl:expect Switch,Try,IfSet,IfStatement,While,For,Foreach
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
  // **这一条只在体那一格没有注释时才成立** ✓（第 595 轮量的 ✓）：
  // `if (a) /* c */ { … } else { … }` 里那个 `/` 会被当成**单语句体的开头** ✓
  // ⇒ 整个 `else` 被吞进同一条 `IfStatement` ✓（那是 `IfSet.Navigate` 第 ② 步的老口径 ✓，
  // 与本轮的 trivia 跨格是两件事 ✓——`/` 既是注释开头也是正则开头 ✓，
  // 在只有当前字符、不许向下看的前提下分不开 ✓）。
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
