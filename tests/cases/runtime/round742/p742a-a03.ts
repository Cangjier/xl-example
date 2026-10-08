// xl:title `case` 后面带**块**：块里的 `let` / `const` 各归各的
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1: { const v = "one"; return v; }
    case 2: { let v = "two"; v += "!"; return v; }
    case 3: { let v = "three"; return v; }
    default: return "other";
  }
}
console.log(f(1), f(2), f(3), f(4));
