// xl:title 泛型事件总线：`Map` + `Set` + 回调 + `Array.from`
// xl:round 305
// xl:judge stdout
// xl:end

type Handler<T> = (payload: T) => void;
class Bus<T extends Record<string, unknown>> {
  #handlers = new Map<keyof T, Set<Handler<any>>>();
  on<K extends keyof T>(event: K, fn: Handler<T[K]>): void {
    const set = this.#handlers.get(event) ?? new Set<Handler<any>>();
    set.add(fn);
    this.#handlers.set(event, set);
  }
  emit<K extends keyof T>(event: K, payload: T[K]): number {
    const set = this.#handlers.get(event);
    if (!set) return 0;
    for (const fn of set) fn(payload);
    return set.size;
  }
  count(): number {
    let n = 0;
    for (const set of this.#handlers.values()) n += set.size;
    return n;
  }
}
const bus = new Bus<{ tick: number; name: string }>();
const seen: string[] = [];
bus.on("tick", (n) => seen.push("t" + n));
bus.on("tick", (n) => seen.push("T" + n * 2));
bus.on("name", (s) => seen.push("n:" + s));
console.log(bus.emit("tick", 3), bus.emit("name", "x"), bus.emit("tick", 1));
console.log(seen.join(","), bus.count());
