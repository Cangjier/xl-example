// xl:title 循环里抛、循环外接住：循环中断且变量停在中途（含 `continue` 那条路）
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：probe694-x05 的一半——「循环里 `continue`
// 跳过本趟，循环变量停在哪儿」（另一半 `break` 在 017 里，那条量的才是 finally）。
// 判定点只有一个：**异常（或跳过）离开循环之后，循环变量停在哪个值上**。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
let i = 0;
try { for (i = 0; i < 5; i++) { if (i === 3) throw new Error("stop"); } } catch (e: any) { console.log("caught", e.message, i); }
console.log("after", i);
let j = 0;
let s = "";
for (j = 0; j < 3; j++) {
  try { if (j === 1) continue; s += j; } finally { s += "f"; }
}
console.log("continue-then:", s, j);
