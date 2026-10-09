// xl:title 端到端：事件总线（Map<事件, 处理器数组> + 注销）
// xl:round 623
// xl:judge stdout
// xl:end

type Handler = (payload: any) => void;
class Bus {
  private map = new Map<string, Handler[]>();
  on(k: string, h: Handler) {
    const list = this.map.get(k) ?? [];
    list.push(h);
    this.map.set(k, list);
    return () => this.off(k, h);
  }
  off(k: string, h: Handler) {
    const list = this.map.get(k) ?? [];
    const i = list.indexOf(h);
    if (i >= 0) list.splice(i, 1);
  }
  emit(k: string, payload: any) { for (const h of this.map.get(k) ?? []) h(payload); }
}
const bus = new Bus();
const seen: string[] = [];
const off = bus.on("x", (p) => seen.push("a" + p));
bus.on("x", (p) => seen.push("b" + p));
bus.emit("x", 1);
off();
bus.emit("x", 2);
console.log(seen.join(","));
