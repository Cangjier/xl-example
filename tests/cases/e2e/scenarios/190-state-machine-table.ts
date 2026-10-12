// xl:title 状态机：转移表 + 非法转移 + 事件日志
// xl:round 653
// xl:judge stdout
// xl:end

type State = "idle" | "run" | "done";
const table: Record<string, Record<string, State>> = {
  idle: { start: "run" },
  run: { finish: "done", reset: "idle" },
  done: { reset: "idle" },
};
let state = ("idle" as State);
const log: string[] = [];
function send(event: string): boolean {
  const next = table[state][event];
  if (next === undefined) {
    log.push(state + "!" + event);
    return false;
  }
  log.push(state + ">" + next);
  state = next;
  return true;
}
console.log(send("finish"), send("start"), send("finish"), send("reset"), send("reset"));
console.log(state, log.join(","));
