// xl:title `Object` 取值族的顺序与访问器：`keys` / `values` / `entries` / `assign`
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
console.log('Object.keys({ b: 1, 2: 2', show(() => Object.keys({ b: 1, 2: 2, a: 3, 1: 4 })));
console.log('Object.values({ get a() ', show(() => Object.values({ get a() { return 1; } })));
console.log('Object.entries({ get a()', show(() => Object.entries({ get a() { return 1; } })));
console.log('Object.assign({}, { get ', show(() => Object.assign({}, { get a() { return 1; } })));
console.log('Object.fromEntries([["a"', show(() => Object.fromEntries([["a", 1], ["b", 2]])));
console.log('JSON.stringify(Object.fr', show(() => JSON.stringify(Object.fromEntries(new Map([[1, 2]])))));
