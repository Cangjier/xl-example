// xl:title 洞按方法分：find 访问、some 跳过、indexOf 跳过、includes 算 undefined
// xl:round 376
// xl:judge stdout
// xl:end
const holes: any[] = [1, , 3];
console.log("A find", holes.find((v) => v === undefined), "findIndex", holes.findIndex((v) => v === undefined));
console.log("B findLast", holes.findLast((v) => v === undefined), "findLastIndex", holes.findLastIndex((v) => v === undefined));
console.log("C some", holes.some((v) => v === undefined), "every", holes.every((v) => v !== undefined));
let calls = 0;
holes.forEach(() => { calls += 1; });
console.log("D forEach calls", calls);
console.log("E indexOf", holes.indexOf(undefined), "lastIndexOf", holes.lastIndexOf(undefined), "includes", holes.includes(undefined));
console.log("F join", holes.join("-"), "length", holes.length, "in", 1 in holes);
