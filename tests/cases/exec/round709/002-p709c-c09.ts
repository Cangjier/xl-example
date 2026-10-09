// xl:title 展开一个字符串
// xl:round 709
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/round709/p709c-c09.ts
//   · exec/round710/p710c-c11.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show([...("ab" as any)].join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
