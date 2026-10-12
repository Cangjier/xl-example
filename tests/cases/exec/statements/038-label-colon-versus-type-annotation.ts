// xl:title 标签的冒号 vs 类型标注的冒号（两个子形状，**还没修**）
// xl:round 380
// xl:judge stdout
// xl:end
// **同一个冒号、两种意思**：`outer: { … }` 是标签，`x: { … }` 是类型标注。
// 词法阶段是平列表，分不出这两者——靠的是 `LabelReorganization` 抢在
// `TypeDefineReorganization` 前面把标签收走。它**只在一种位置上抢不到**：
// 标签前面还有别的语句时（那一刻前一条语句还没成形，前一个单元是它那个 `}` 括号，
// `IsStatementStart` 给假）。
//
// 子形状 ①：标签块前面还有一条语句
const out: string[] = [];
for (let i = 0; i < 1; i++) { out.push("f" + i); }
block: { out.push("b"); break block; out.push("never"); }
console.log("A", out.join(","));
// 子形状 ②：标签块里再嵌一个裸块，裸块里 `break` 那个标签
const other: string[] = [];
lbl: { other.push("a"); { break lbl; } other.push("never"); }
console.log("B", other.join(","));
