// xl:title 端到端：用 Map 写的状态机驱动一段输入
// xl:round 323
// xl:judge stdout
// xl:end

type State = "idle" | "run" | "done";
const table: Record<State, Record<string, State>> = {
  idle: { start: "run" },
  run: { tick: "run", stop: "done" },
  done: {},
};
function drive(events: string[]): string[] {
  const seen: string[] = [];
  let cur: State = "idle";
  for (const ev of events) {
    const next = table[cur][ev];
    seen.push(cur + "-" + ev + "->" + (next ?? "?"));
    if (!next) break;
    cur = next;
  }
  return seen;
}
console.log(drive(["start", "tick", "tick", "stop", "tick"]).join(" | "));
console.log(drive(["tick"]).join(" | "));
