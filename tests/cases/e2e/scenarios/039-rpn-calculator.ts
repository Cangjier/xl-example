// xl:title 逆波兰计算器：栈 + 运算符表 + 报错
// xl:round 330
// xl:judge stdout
// xl:end

function evaluate(expr: string): number {
  const ops: { [k: string]: (a: number, b: number) => number } = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
  };
  const stack: number[] = [];
  for (const token of expr.split(" ")) {
    const op = ops[token];
    if (op !== undefined) {
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(op(a, b));
      continue;
    }
    stack.push(Number(token));
  }
  if (stack.length !== 1) throw new Error("bad expression: " + expr);
  return stack[0];
}
console.log(evaluate("3 4 + 2 *"));
console.log(evaluate("10 2 / 3 -"));
try {
  evaluate("1 2");
} catch (e) {
  console.log((e as Error).message);
}
