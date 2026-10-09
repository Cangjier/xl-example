// xl:title 事件总线：Map + 回调数组 + call
// xl:round 682
// xl:judge stdout
// xl:end
class Bus { handlers: Map<string, any[]> = new Map(); on(ev: string, fn: any): void { const list = this.handlers.get(ev) ?? []; list.push(fn); this.handlers.set(ev, list); } emit(ev: string, payload: any): number { const list = this.handlers.get(ev) ?? []; for (const fn of list) fn.call(null, payload); return list.length; } }
const bus = new Bus();
const seen: string[] = [];
bus.on('a', (p: any) => { seen.push('1' + p); });
bus.on('a', (p: any) => { seen.push('2' + p); });
console.log(bus.emit('a', 'x'), bus.emit('b', 'y'), seen.join(','));
