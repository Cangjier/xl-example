// xl:title 栈式虚拟机：字节码解释器
// xl:round 371
// xl:judge stdout
// xl:end
type Op = number | string;
const OPS: Record<string, (stack: number[]) => void> = {
  add: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a + b); },
  sub: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a - b); },
  mul: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(a * b); },
  dup: (s) => { s.push(s[s.length - 1]); },
  swap: (s) => { const b = s.pop() as number; const a = s.pop() as number; s.push(b, a); },
  neg: (s) => { s.push(-(s.pop() as number)); },
};
function run(program: Op[]): { stack: number[]; steps: number } {
  const stack: number[] = [];
  let steps = 0;
  for (const op of program) {
    steps += 1;
    if (typeof op === "number") { stack.push(op); continue; }
    const fn = OPS[op];
    if (!fn) throw new Error("unknown op: " + op);
    if (stack.length < 2 && (op === "add" || op === "sub" || op === "mul" || op === "swap")) throw new Error("stack underflow at " + op);
    fn(stack);
  }
  return { stack, steps };
}
for (const program of [
  [2, 3, "add"],
  [5, 1, "sub", 3, "mul"],
  [4, "dup", "add"],
  [1, 2, "swap", "sub"],
  [7, "neg"],
] as Op[][]) {
  const r = run(program);
  console.log(program.join(" "), "=>", r.stack.join(","), r.steps);
}
try { run(["add"]); } catch (e) { console.log("err", (e as Error).message); }
try { run([1, "nope"]); } catch (e) { console.log("err", (e as Error).message); }
console.log(run([]).stack.length);
