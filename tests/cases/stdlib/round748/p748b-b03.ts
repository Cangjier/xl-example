// xl:title `Array.from` / 展开：可迭代物与类数组两条路
// xl:round 748
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Array.from("abc")));
console.log(JSON.stringify(Array.from(new Set([1, 1, 2]))));
console.log(JSON.stringify(Array.from([1, , 3])));
console.log(JSON.stringify(Array.from({ length: 3, 1: "x" })));
console.log(JSON.stringify(Array.from(new Map([["k", "v"]]))));
console.log(JSON.stringify([..."ab"]), JSON.stringify([...new Set([1, 2])]));
console.log(JSON.stringify(Array.from([1, 2], (v) => v * 2)));
