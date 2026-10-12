// xl:title 把 Map / Set 摊开成数组的几种写法
// xl:round 371
// xl:judge stdout
// xl:end
const m = new Map([["a", 1], ["b", 2]]);
console.log(JSON.stringify([...m]), JSON.stringify(Array.from(m)));
const s = new Set([1, 2]);
console.log([...s].join(","), JSON.stringify(Array.from(s, (v: number) => v * 2)));
const o = Object.fromEntries(m);
console.log(JSON.stringify(o));
console.log([...m.values()].reduce((a, b) => a + b, 0));
