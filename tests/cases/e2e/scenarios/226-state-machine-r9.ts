// xl:title 完整程序：状态机（对象表 + 生成器驱动 + 异常恢复）
// xl:round 9
// xl:judge stdout
// xl:end

type State = "idle" | "running" | "done";
class Machine {
  state: State = "idle";
  steps = 0;
  private table: Record<string, State> = { idle: "running", running: "done", done: "idle" };
  next() {
    const from = this.state;
    this.state = this.table[from];
    this.steps += 1;
    return from + "->" + this.state;
  }
}
const m = new Machine();
const trail: string[] = [];
for (let i = 0; i < 5; i++) trail.push(m.next());
console.log(trail.join(" "));
console.log(m.steps);
