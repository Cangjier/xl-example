// xl:title 完整程序：事件总线（Map + 闭包 + 类 + 可选链）
// xl:round 9
// xl:judge stdout
// xl:end

type Handler = (payload: any) => void;
class Emitter {
  private handlers = new Map<string, Handler[]>();
  on(event: string, fn: Handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
    return () => this.off(event, fn);
  }
  off(event: string, fn: Handler) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(event, list.filter((h) => h !== fn));
  }
  emit(event: string, payload?: any) {
    for (const h of this.handlers.get(event) ?? []) h(payload);
  }
}
const bus = new Emitter();
const seen: string[] = [];
const stop = bus.on("ping", (p) => seen.push("a:" + p));
bus.on("ping", (p) => seen.push("b:" + p));
bus.emit("ping", 1);
stop();
bus.emit("ping", 2);
console.log(seen.join(" "));
