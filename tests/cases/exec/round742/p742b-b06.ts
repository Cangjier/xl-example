// xl:title `switch` 里改外面那张表：从 `case` 里 `push` 再 `break`
// xl:round 742
// xl:judge stdout
// xl:end
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
