// xl:title `Reflect` 与函数那一族：接收者与实参表的口径（守卫）
// xl:round 770
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (Reflect as any).get(1, \'x\')', show(() => (Reflect as any).get(1, 'x')));
console.log('02 (Reflect as any).get(null, \'x\')', show(() => (Reflect as any).get(null, 'x')));
console.log('03 (Reflect as any).set(1, \'x\', 2)', show(() => (Reflect as any).set(1, 'x', 2)));
console.log('04 (Reflect as any).has(1, \'x\')', show(() => (Reflect as any).has(1, 'x')));
console.log('05 (Reflect as any).ownKeys(1)', show(() => (Reflect as any).ownKeys(1)));
console.log('06 (Reflect as any).ownKeys(null)', show(() => (Reflect as any).ownKeys(null)));
console.log('07 (Reflect as any).defineProperty(1, \'x\'', show(() => (Reflect as any).defineProperty(1, 'x', {})));
console.log('08 (Reflect as any).getPrototypeOf(1)', show(() => (Reflect as any).getPrototypeOf(1)));
console.log('09 (Reflect as any).apply(1, null, [])', show(() => (Reflect as any).apply(1, null, [])));
console.log('10 (Reflect as any).construct(1, [])', show(() => (Reflect as any).construct(1, [])));
console.log('11 (Function.prototype.call as any).call(', show(() => (Function.prototype.call as any).call(1)));
console.log('12 (Function.prototype.apply as any).appl', show(() => (Function.prototype.apply as any).apply(1, [])));
console.log('13 (Function.prototype.bind as any).call(', show(() => (Function.prototype.bind as any).call(1)));
console.log('14 (Function.prototype.apply as any).call', show(() => (Function.prototype.apply as any).call(function () {}, null, 1)));
console.log('15 ({} as any).toString.call(null)', show(() => ({} as any).toString.call(null)));
