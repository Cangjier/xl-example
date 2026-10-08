// xl:title keyof 约束下的动态取值与 set
// xl:round 371
// xl:judge stdout
// xl:end
function get<T, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }
function set<T, K extends keyof T>(o: T, k: K, v: T[K]): void { o[k] = v; }
const rec = { a: 1, b: "s" };
console.log(get(rec, "a"), get(rec, "b"));
set(rec, "a", 5);
console.log(rec.a, Object.keys(rec).length);
const arr: { id: number }[] = [{ id: 1 }, { id: 2 }];
console.log(arr.map((x) => get(x, "id")).join(","));
