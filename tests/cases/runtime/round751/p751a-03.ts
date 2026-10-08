// xl:title `new Array` 的单实参上界：`2^32` 那一档该抛
// xl:round 751
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
console.log("new Array(4294967296)", show(() => new Array(4294967296)));
console.log("new Array(2 ** 32)", show(() => new Array(2 ** 32)));
console.log("new Array(2 ** 32 + 1)", show(() => new Array(2 ** 32 + 1)));
console.log("new Array(-1)", show(() => new Array(-1)));
