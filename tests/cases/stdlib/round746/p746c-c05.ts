// xl:title 冻结 / `in` / `hasOwn` / 数字格式化 / `structuredClone` 的边角
// xl:round 746
// xl:judge stdout
// xl:end
const a = [3, 1, 2];
Object.freeze(a);
try { a.push(4); } catch (e) { console.log("push " + (e as Error).constructor.name); }
try { a.sort(); } catch (e) { console.log("sort " + (e as Error).constructor.name); }
console.log(JSON.stringify(a), a.length);
try { a[0] = 9; } catch (e) { console.log("set " + (e as Error).constructor.name); }
console.log(a[0]);
const arr = [1, 2, 3];
console.log(0 in arr, 3 in arr, "length" in arr, "map" in arr);
console.log(Object.hasOwn(arr, 0), Object.hasOwn(arr, "length"), arr.hasOwnProperty(0));
const o = Object.create({ p: 1 });
console.log("p" in o, Object.hasOwn(o, "p"), o.hasOwnProperty("p"));
console.log((255).toString(16), (255).toString(2), (255).toString(36));
try { (255).toString(1); } catch (e) { console.log((e as Error).constructor.name); }
try { (255).toString(37); } catch (e) { console.log((e as Error).constructor.name); }
console.log((-255).toString(16), (0).toString(2));
console.log(JSON.stringify(structuredClone([1, [2]])));
const m = structuredClone(new Map([["k", 1]]));
console.log(m instanceof Map, m.get("k"));
const s = structuredClone(new Set([1, 2]));
console.log(s instanceof Set, [...s].join(","));
const cyc: any = { a: 1 };
cyc.self = cyc;
const cl = structuredClone(cyc);
console.log(cl.a, cl.self === cl);
