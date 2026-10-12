// xl:title 事件总线：Map<string, 回调数组> + 闭包 + 剩余参数
// xl:judge stdout
// xl:end

class Emitter {
  private handlers = new Map<string, Array<(...args: any[]) => void>>();
  on(event: string, fn: (...args: any[]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }
  emit(event: string, ...args: any[]): number {
    const list = this.handlers.get(event) ?? [];
    for (const fn of list) fn(...args);
    return list.length;
  }
}
const bus = new Emitter();
let seen = 0;
bus.on("tick", (n: number) => { seen += n; console.log("tick", n); });
bus.on("tick", () => { console.log("second listener"); });
console.log("listeners", bus.emit("tick", 3), "seen", seen);
console.log("no listeners", bus.emit("nope"));
