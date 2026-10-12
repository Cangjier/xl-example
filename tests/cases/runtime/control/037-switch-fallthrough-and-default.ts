// xl:title switch：穿透、default 位置不影响语义、严格相等匹配
// xl:round 7
// xl:judge stdout
// xl:end

function f(n: number): string {
  const out: string[] = [];
  switch (n) {
    case 1: out.push("one");
    case 2: out.push("two"); break;
    default: out.push("def");
    case 3: out.push("three");
  }
  return out.join("/");
}
console.log(f(1), f(2), f(3), f(9), f(0));
