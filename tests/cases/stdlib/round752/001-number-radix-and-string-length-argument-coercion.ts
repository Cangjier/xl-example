// xl:title `Number` / `String` 的边界：`toString(radix)`、`padStart` 的长度实参
// xl:round 752
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(255).toString(16)', show(() => (255).toString(16)));
console.log('(255).toString(37)', show(() => (255).toString(37)));
console.log('(1.5).toString(2)', show(() => (1.5).toString(2)));
console.log('"a".padStart("3" as any,', show(() => "a".padStart("3" as any, "0")));
console.log('"a".repeat("2" as any)', show(() => "a".repeat("2" as any)));
console.log('"abc".charAt("1" as any)', show(() => "abc".charAt("1" as any)));
