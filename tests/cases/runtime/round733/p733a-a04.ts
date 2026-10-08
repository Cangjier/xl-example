// xl:title `WeakMap` / `WeakSet` 的两格原型：五个名字、`size` 不该跟着来、`instanceof`
// xl:round 733
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

const wm: any = WeakMap.prototype;
console.log(typeof wm, wm.constructor === WeakMap, typeof wm.get, typeof wm.set,
  typeof wm.has, typeof wm.delete);
console.log(t(() => (WeakMap.prototype as any).size));
const ws: any = WeakSet.prototype;
console.log(typeof ws, ws.constructor === WeakSet, typeof ws.add, typeof ws.has,
  typeof ws.delete);
console.log(t(() => (WeakSet.prototype as any).size));
console.log(new WeakMap() instanceof WeakMap, new WeakSet() instanceof WeakSet);
console.log(Object.keys(WeakMap.prototype).length, Object.keys(WeakSet.prototype).length);
console.log(Object.getPrototypeOf(WeakMap.prototype) === Object.prototype);
console.log(Object.getPrototypeOf(WeakSet.prototype) === Object.prototype);
console.log((Map.prototype as any).get.name, (Map.prototype as any).set.length,
  (Map.prototype as any).get.length, (Set.prototype as any).add.name,
  (Set.prototype as any).add.length);
