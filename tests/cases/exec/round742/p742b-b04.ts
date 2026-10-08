// xl:title `switch` 与 `try` / `finally`：`break` 走 `finally`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  const log: string[] = [];
  switch (x) {
    case 1:
      try {
        log.push("try");
        break;
      } finally {
        log.push("finally");
      }
    default: log.push("def");
  }
  log.push("end");
  return log.join(",");
}
console.log(f(1));
console.log(f(2));
