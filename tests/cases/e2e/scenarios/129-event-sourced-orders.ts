// xl:title 订单状态机：事件驱动的状态流转与校验
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
type OrderState = "created" | "paid" | "shipped" | "delivered" | "cancelled";
type Event = { type: "pay" } | { type: "ship" } | { type: "deliver" } | { type: "cancel" };
const transitions: Record<OrderState, Partial<Record<Event["type"], OrderState>>> = {
  created: { pay: "paid", cancel: "cancelled" },
  paid: { ship: "shipped", cancel: "cancelled" },
  shipped: { deliver: "delivered" },
  delivered: {},
  cancelled: {},
};
class Order {
  state: OrderState = "created";
  history: string[] = ["created"];
  constructor(public id: string) {}
  apply(event: Event): boolean {
    const next = transitions[this.state][event.type];
    if (!next) { this.history.push("reject:" + event.type); return false; }
    this.state = next;
    this.history.push(next);
    return true;
  }
}
const orders = [new Order("o1"), new Order("o2"), new Order("o3")];
const script: [number, Event][] = [[0, { type: "pay" }], [1, { type: "ship" }], [0, { type: "ship" }], [2, { type: "cancel" }], [1, { type: "pay" }], [0, { type: "deliver" }]];
for (const [idx, event] of script) {
  const ok = orders[idx].apply(event);
  console.log(orders[idx].id, event.type, ok, orders[idx].state);
}
for (const o of orders) console.log(o.id, o.state, o.history.join(">"));
const counts: Record<string, number> = {};
for (const o of orders) counts[o.state] = (counts[o.state] ?? 0) + 1;
console.log(JSON.stringify(counts));
