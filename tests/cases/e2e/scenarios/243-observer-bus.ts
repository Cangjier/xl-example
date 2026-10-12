// xl:title 观察者：Map + Set + 解构 + 展开
// xl:round 683
// xl:judge stdout
// xl:end
class Registry { subs: Map<string, Set<any>> = new Map(); on(ev: string, fn: any): void { if (!this.subs.has(ev)) this.subs.set(ev, new Set()); this.subs.get(ev).add(fn); } off(ev: string, fn: any): void { this.subs.get(ev)?.delete(fn); } fire(ev: string, v: any): number { const set = this.subs.get(ev); if (!set) return 0; const all = [...set]; for (const fn of all) fn(v); return all.length; } }
const r = new Registry();
const seen: string[] = [];
const h = (v: any) => { seen.push('h' + v); };
r.on('x', h); r.on('x', (v: any) => { seen.push('g' + v); });
console.log(r.fire('x', 1), r.fire('y', 2));
r.off('x', h);
console.log(r.fire('x', 3), seen.join(','));
