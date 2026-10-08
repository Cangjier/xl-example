// xl:title `for..of` 一个 `Map`：条目是**两个元素的新数组**
// xl:round 737
// xl:judge stdout
// xl:end
const m = new Map([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const e of m) console.log(Array.isArray(e), e.length, e[0]);
console.log([...m].length, [...m.keys()].join(","), [...m.values()].join(","));
