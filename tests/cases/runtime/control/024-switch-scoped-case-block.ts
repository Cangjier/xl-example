// xl:title switch 的 case 里开一个块：作用域不串
// xl:judge stdout
// xl:end

function f(n: number): string {
  switch (n) {
    case 1: {
      const t = "one";
      return t;
    }
    case 2: {
      const t = "two";
      return t;
    }
    default:
      return "other";
  }
}
console.log(f(1), f(2), f(3));
