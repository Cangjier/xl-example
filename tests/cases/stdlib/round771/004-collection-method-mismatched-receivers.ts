// xl:title 集合方法的不匹配接收者：抛的是 `TypeError`
// xl:round 771
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
console.log('01 (Map.prototype.get as any).call(null, ', show(() => (Map.prototype.get as any).call(null, 1)));
console.log('02 (Map.prototype.get as any).call({}, 1)', show(() => (Map.prototype.get as any).call({}, 1)));
console.log('03 (Map.prototype.set as any).call([], 1,', show(() => (Map.prototype.set as any).call([], 1, 2)));
console.log('04 (Map.prototype.has as any).call(\'x\', 1', show(() => (Map.prototype.has as any).call('x', 1)));
console.log('05 (Map.prototype.forEach as any).call(nu', show(() => (Map.prototype.forEach as any).call(null, (v: any) => v)));
console.log('06 (Map.prototype.size as any)', show(() => (Map.prototype.size as any)));
console.log('07 (Set.prototype.add as any).call({}, 1)', show(() => (Set.prototype.add as any).call({}, 1)));
console.log('08 (Set.prototype.has as any).call([], 1)', show(() => (Set.prototype.has as any).call([], 1)));
console.log('09 (Map as any).prototype.get.call(1, 2)', show(() => (Map as any).prototype.get.call(1, 2)));
console.log('10 (new Map() as any).get.call({}, 1)', show(() => (new Map() as any).get.call({}, 1)));
console.log('11 (WeakMap.prototype.get as any).call(nu', show(() => (WeakMap.prototype.get as any).call(null, {})));
console.log('12 (Date.prototype.getTime as any).call({', show(() => (Date.prototype.getTime as any).call({})));
console.log('13 (Date.prototype.getTime as any).call(1', show(() => (Date.prototype.getTime as any).call(1)));
console.log('14 (Date.prototype.toISOString as any).ca', show(() => (Date.prototype.toISOString as any).call({})));
console.log('15 (Date.prototype.setTime as any).call({', show(() => (Date.prototype.setTime as any).call({}, 0)));
