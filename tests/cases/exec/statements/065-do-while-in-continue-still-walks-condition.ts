// xl:title `do...while` 里的 `continue` 仍然要走条件
// xl:round 691
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/statements/065-do-while-continue.ts
//   · runtime/round742/p742c-c11.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
let i = 0;
const out: number[] = [];
do {
  i++;
  if (i % 2 === 0) continue;
  out.push(i);
} while (i < 5);
console.log(out.join(","), i);
