// xl:title 端到端：状态机（对象 + switch + 闭包）
// xl:round 623
// xl:judge stdout
// xl:end

type State = "idle" | "run" | "done";
function machine() {
  let state: State = "idle";
  const log: string[] = [];
  return {
    send(e: string) {
      switch (state) {
        case "idle": state = e === "go" ? "run" : "idle"; break;
        case "run": state = e === "finish" ? "done" : "run"; break;
        default: break;
      }
      log.push(state);
      return state;
    },
    get states() { return log.join(">"); },
  };
}
const m = machine();
console.log(m.send("go"), m.send("tick"), m.send("finish"), m.states);
