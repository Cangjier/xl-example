// xl:title `Array.from` / 展开在 `Set` / `Map` / 生成器 / 类数组上的取舍
// xl:round 750
// xl:judge stdout
// xl:end
console.log(JSON.stringify(Array.from(new Set([1, 2, 2]))));
console.log(JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(JSON.stringify(Array.from({ length: 2, 0: "x" })));
console.log(JSON.stringify([...new Map([["a", 1]])]), JSON.stringify([...new Set([1])]));
console.log(JSON.stringify(Array.from("abc")), JSON.stringify(Array.from([1, , 3])));
console.log(Array.from({ length: 3 }, (_, i) => i).join(","));
console.log(JSON.stringify(Array.from([1, 2], (v, i) => v + i)));
