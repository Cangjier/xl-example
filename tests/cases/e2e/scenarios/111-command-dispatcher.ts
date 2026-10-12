// xl:title 命令分发器：注册、别名、参数解析、错误处理
// xl:round 371
// xl:judge stdout
// xl:end
type Cmd = { name: string; aliases: string[]; run: (args: string[]) => string };
class Dispatcher {
  private table = new Map<string, Cmd>();
  private history: string[] = [];
  register(cmd: Cmd): void {
    this.table.set(cmd.name, cmd);
    for (const a of cmd.aliases) this.table.set(a, cmd);
  }
  dispatch(line: string): string {
    const parts = line.trim().split(" ").filter((p) => p !== "");
    if (parts.length === 0) return "empty";
    const cmd = this.table.get(parts[0]);
    this.history.push(parts[0]);
    if (!cmd) return "unknown: " + parts[0];
    try { return cmd.run(parts.slice(1)); } catch (e) { return "error: " + (e as Error).message; }
  }
  get log(): string[] { return this.history.slice(); }
}
const d = new Dispatcher();
d.register({ name: "add", aliases: ["a", "+"], run: (args) => String(args.map(Number).reduce((x, y) => x + y, 0)) });
d.register({ name: "echo", aliases: ["e"], run: (args) => args.join(" ") });
d.register({ name: "boom", aliases: [], run: () => { throw new Error("nope"); } });
console.log(d.dispatch("add 1 2 3"), d.dispatch("+ 4 5"), d.dispatch("echo hello world"));
console.log(d.dispatch("nope"), d.dispatch("boom"), d.dispatch("   "));
console.log(d.log.join(","), d.dispatch("a 10"));
