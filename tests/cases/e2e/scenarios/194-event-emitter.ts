// xl:title 端到端：事件发射器（监听器表、once、off、异常隔离）
// xl:round 7
// xl:judge stdout
// xl:end

type Handler = (...args: any[]) => void;
class Emitter {
  private map = new Map<string, Handler[]>();
  on(ev: string, h: Handler): this { const list = this.map.get(ev) ?? []; list.push(h); this.map.set(ev, list); return this; }
  off(ev: string, h: Handler): boolean {
    const list = this.map.get(ev);
    if (!list) return false;
    const at = list.indexOf(h);
    if (at < 0) return false;
    list.splice(at, 1);
    return true;
  }
  once(ev: string, h: Handler): this { const wrap: Handler = (...a) => { this.off(ev, wrap); h(...a); }; return this.on(ev, wrap); }
  emit(ev: string, ...args: any[]): number {
    const list = [...(this.map.get(ev) ?? [])];
    let n = 0;
    for (const h of list) { h(...args); n++; }
    return n;
  }
}
const em = new Emitter();
const log: string[] = [];
const a: Handler = (x) => log.push("a" + x);
em.on("t", a).on("t", (x) => log.push("b" + x)).once("t", (x) => log.push("once" + x));
console.log(em.emit("t", 1), em.emit("t", 2), log.join("|"));
console.log(em.off("t", a), em.off("t", a), em.emit("t", 3), em.emit("nope"));
