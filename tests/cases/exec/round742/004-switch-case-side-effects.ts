// xl:title `switch` 里改外面那张表：从 `case` 里 `push` 再 `break`
// xl:round 742
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p742b-b06`；正文一字未动）。
// 判定点只有一个：**`case` 体里的副作用与 `return` 的次序**——
// 命中的那一格先 `push` 再返回，`default` 也走同一条路，多次调用按次序记账。
const seen: number[] = [];
function classify(x: number): string {
  switch (x) {
    case 0: seen.push(0); return "zero";
    case 1: seen.push(1); return "one";
    case 2: seen.push(2); return "two";
    default: seen.push(-1); return "other";
  }
}
console.log([0, 1, 2, 3, 1].map(classify).join("|"));
console.log(seen.join(","));
