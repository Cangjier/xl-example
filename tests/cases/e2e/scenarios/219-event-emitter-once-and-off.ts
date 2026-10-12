// xl:title 事件总线：on / once / off / 通配与错误冒泡
// xl:round 8
// xl:judge stdout
// xl:end

class Bus {
  constructor() { this.handlers = new Map(); }
  on(name, fn) { const list = this.handlers.get(name) ?? []; list.push(fn); this.handlers.set(name, list); return () => this.off(name, fn); }
  once(name, fn) { const wrap = (...args) => { this.off(name, wrap); fn(...args); }; return this.on(name, wrap); }
  off(name, fn) { const list = this.handlers.get(name) ?? []; const at = list.indexOf(fn); if (at >= 0) list.splice(at, 1); }
  emit(name, ...args) { for (const fn of [...(this.handlers.get(name) ?? [])]) fn(...args); }
}
const bus = new Bus();
const log = [];
const off = bus.on("x", (a) => log.push("on:" + a));
bus.once("x", (a) => log.push("once:" + a));
bus.emit("x", 1);
bus.emit("x", 2);
off();
bus.emit("x", 3);
console.log(log.join("|"));
