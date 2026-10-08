// xl:title `JSON.stringify` 的缩进与 `replacer` 数组
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { b: 1, a: [1, 2], c: { d: 3 } };
console.log(JSON.stringify(o, null, 2));
console.log(JSON.stringify(o, ["b", "a"]));
console.log(JSON.stringify({ x: undefined, y: () => 1, z: null }));
