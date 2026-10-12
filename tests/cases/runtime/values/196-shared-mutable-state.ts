// xl:title 共享可变状态：模块级对象、闭包、实例之间
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
const registry: Record<string, number> = {};
function bump(k: string): number { registry[k] = (registry[k] ?? 0) + 1; return registry[k]; }
console.log(bump("a"), bump("a"), bump("b"), JSON.stringify(registry));
const counters = { total: 0 };
class Inc { constructor(public bag: { total: number }) {} add(): void { this.bag.total += 1; } }
const a = new Inc(counters);
const b = new Inc(counters);
a.add();
b.add();
console.log(counters.total, Object.keys(registry).length);
