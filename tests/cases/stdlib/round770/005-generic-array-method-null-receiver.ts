// xl:title 通用数组方法遇上空值接收者：`ToObject` 那一步要抛
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
console.log('01 ([1, 2] as any).sort(1)', show(() => ([1, 2] as any).sort(1)));
console.log('02 ([1, 2] as any).toSorted(\'x\')', show(() => ([1, 2] as any).toSorted('x')));
console.log('03 ([1, 2] as any).at(1.5)', show(() => ([1, 2] as any).at(1.5)));
console.log('04 ([1] as any).with(1, 2)', show(() => ([1] as any).with(1, 2)));
console.log('05 ([1] as any).with(-2, 2)', show(() => ([1] as any).with(-2, 2)));
console.log('06 ([1] as any).with(NaN, 2)', show(() => ([1] as any).with(NaN, 2)));
console.log('07 (Array.prototype.slice as any).call(nu', show(() => (Array.prototype.slice as any).call(null)));
console.log('08 (Array.prototype.map as any).call(null', show(() => (Array.prototype.map as any).call(null, (x: any) => x)));
console.log('09 (Array.prototype.join as any).call(und', show(() => (Array.prototype.join as any).call(undefined)));
console.log('10 (Array.from as any)(null)', show(() => (Array.from as any)(null)));
console.log('11 (Array.from as any)(undefined)', show(() => (Array.from as any)(undefined)));
console.log('12 (Array.from as any)(1)', show(() => (Array.from as any)(1)));
console.log('13 (Array.of as any).length', show(() => (Array.of as any).length));
console.log('14 (Array.prototype.concat as any).call(n', show(() => (Array.prototype.concat as any).call(null)));
