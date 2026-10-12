// xl:title 观察者模式：优先级、退订、一次性监听
// xl:round 371
// xl:judge stdout
// xl:end
type Handler<T> = (payload: T) => void;
class Emitter<T> {
  private handlers: { fn: Handler<T>; once: boolean; priority: number; id: number }[] = [];
  private nextId = 1;
  on(fn: Handler<T>, options: { once?: boolean; priority?: number } = {}): () => void {
    const id = this.nextId++;
    this.handlers.push({ fn, once: options.once ?? false, priority: options.priority ?? 0, id });
    this.handlers.sort((a, b) => b.priority - a.priority || a.id - b.id);
    return () => { this.handlers = this.handlers.filter((h) => h.id !== id); };
  }
  emit(payload: T): number {
    const snapshot = this.handlers.slice();
    let called = 0;
    for (const h of snapshot) {
      h.fn(payload);
      called += 1;
      if (h.once) this.handlers = this.handlers.filter((x) => x.id !== h.id);
    }
    return called;
  }
  get size(): number { return this.handlers.length; }
}
type Ev = { kind: string };
const log: string[] = [];
const emitter = new Emitter<Ev>();
emitter.on((e) => log.push("low:" + e.kind), { priority: 1 });
const off = emitter.on((e) => log.push("high:" + e.kind), { priority: 10 });
emitter.on((e) => log.push("once:" + e.kind), { once: true, priority: 5 });
console.log(emitter.emit({ kind: "a" }), log.join(","), emitter.size);
off();
console.log(emitter.emit({ kind: "b" }), log.join(","), emitter.size);
let removed = 0;
const selfOff = emitter.on(() => { removed += 1; selfOff(); }, { priority: 0 });
emitter.emit({ kind: "c" });
emitter.emit({ kind: "c" });
console.log(removed, emitter.size);
