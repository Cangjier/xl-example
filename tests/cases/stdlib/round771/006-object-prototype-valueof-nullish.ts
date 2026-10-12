// xl:title `Object.prototype.valueOf` 的空值那一档
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
console.log('01 (Object.prototype.valueOf as any).call', show(() => (Object.prototype.valueOf as any).call(null)));
console.log('02 (Object.prototype.valueOf as any).call', show(() => (Object.prototype.valueOf as any).call(undefined)));
console.log('03 (Object.prototype.valueOf as any).call', show(() => (Object.prototype.valueOf as any).call({ a: 1 }).a));
console.log('04 (Object.prototype.hasOwnProperty as an', show(() => (Object.prototype.hasOwnProperty as any).call(1, 'x')));
console.log('05 (Object.prototype.isPrototypeOf as any', show(() => (Object.prototype.isPrototypeOf as any).call(1, {})));
