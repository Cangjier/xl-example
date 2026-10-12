// xl:title `switch` 每个 case 各自一对花括号（同名 const 不冲突）
// xl:round 305
// xl:judge stdout
// xl:end

function f(n: number): string {
  switch (n) {
    case 1: { const label = "one"; return label; }
    case 2: { const label = "two"; return label; }
    default: { const label = "other"; return label; }
  }
}
console.log(f(1), f(2), f(3));
