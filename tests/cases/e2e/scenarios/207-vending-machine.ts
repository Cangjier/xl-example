// xl:title 端到端：状态机售货机（状态迁移表 + 非法输入 + 找零计算）
// xl:round 7
// xl:judge stdout
// xl:end

type State = "idle" | "paid" | "dispensing";
const prices: Record<string, number> = { cola: 3, water: 2 };
function vend(events: Array<{ type: string; v?: string | number }>): string[] {
  const log: string[] = [];
  let state: State = "idle";
  let credit = 0;
  let chosen: string | null = null;
  for (const e of events) {
    if (e.type === "select" && state === "idle") {
      const name = String(e.v);
      if (!(name in prices)) { log.push("unknown:" + name); continue; }
      chosen = name; credit = 0; state = "paid"; log.push("selected:" + name);
    } else if (e.type === "coin" && state === "paid") {
      credit += Number(e.v); log.push("credit:" + credit);
      if (credit >= prices[chosen as string]) state = "dispensing";
    } else if (e.type === "coin" && state === "idle") {
      log.push("returned:" + e.v);
    } else if (e.type === "take" && state === "dispensing") {
      const change = credit - prices[chosen as string];
      log.push("took:" + chosen + " change:" + change);
      credit = 0; chosen = null; state = "idle";
    } else {
      log.push("invalid:" + e.type + "@" + state);
    }
  }
  return log;
}
console.log(vend([{ type: "coin", v: 1 }, { type: "select", v: "cola" }, { type: "coin", v: 2 }, { type: "coin", v: 2 }, { type: "take" }]).join("|"));
console.log(vend([{ type: "select", v: "chips" }, { type: "select", v: "water" }, { type: "take" }]).join("|"));
