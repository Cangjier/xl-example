// xl:title 订单状态机：闭包 + `switch` + 抛错收尾
// xl:round 305
// xl:judge stdout
// xl:end

type State = "new" | "paid" | "shipped" | "done";
function machine(initial: State) {
  let state: State = initial;
  const log: string[] = [];
  return {
    send(event: string): State {
      switch (state) {
        case "new":
          if (event === "pay") { state = "paid"; break; }
          throw new Error("bad " + event + " in " + state);
        case "paid":
          if (event === "ship") { state = "shipped"; break; }
          throw new Error("bad " + event + " in " + state);
        case "shipped":
          if (event === "deliver") { state = "done"; break; }
          throw new Error("bad " + event + " in " + state);
        default:
          throw new Error("closed");
      }
      log.push(state);
      return state;
    },
    history(): string { return log.join(">"); },
  };
}
const m = machine("new");
console.log(m.send("pay"), m.send("ship"), m.send("deliver"));
console.log(m.history());
try { m.send("pay"); } catch (e) { console.log("stopped", (e as Error).message); }
