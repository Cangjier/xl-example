// xl:title 端到端：栈式虚拟机（指令数组 + 分支 + 每步快照）
// xl:round 7
// xl:judge stdout
// xl:end

type Ins = { op: "push" | "add" | "mul" | "dup" | "jmpz" | "print" | "halt"; v?: number };
function run(prog: Ins[]): string {
  const st: number[] = [];
  const out: string[] = [];
  let ip = 0;
  let steps = 0;
  while (ip < prog.length && steps++ < 200) {
    const ins = prog[ip];
    switch (ins.op) {
      case "push": st.push(ins.v as number); ip++; break;
      case "add": { const b = st.pop() as number, a = st.pop() as number; st.push(a + b); ip++; break; }
      case "mul": { const b = st.pop() as number, a = st.pop() as number; st.push(a * b); ip++; break; }
      case "dup": st.push(st[st.length - 1]); ip++; break;
      case "jmpz": { const a = st.pop() as number; ip = a === 0 ? (ins.v as number) : ip + 1; break; }
      case "print": out.push(String(st[st.length - 1])); ip++; break;
      default: ip = prog.length; break;
    }
  }
  return out.join(",") + "|" + st.join(",") + "|" + steps;
}
console.log(run([{ op: "push", v: 2 }, { op: "push", v: 3 }, { op: "add" }, { op: "dup" }, { op: "mul" }, { op: "print" }, { op: "halt" }]));
console.log(run([{ op: "push", v: 0 }, { op: "jmpz", v: 3 }, { op: "push", v: 1 }, { op: "print" }, { op: "halt" }]));
