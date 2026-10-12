// xl:title 字面量联合类型与 Record 的键在运行期就是字符串
// xl:round 371
// xl:judge stdout
// xl:end
type Key = "x" | "y" | "z";
const keys: Key[] = ["x", "y", "z"];
const counters = {} as Record<Key, number>;
for (const k of keys) counters[k] = 0;
counters.x += 1;
counters["y"] = 5;
console.log(JSON.stringify(counters), Object.keys(counters).join(","));
function get(o: Record<Key, number>, k: Key): number { return o[k]; }
console.log(get(counters, "z"));
