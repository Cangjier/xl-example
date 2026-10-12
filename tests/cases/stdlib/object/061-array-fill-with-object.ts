// xl:title `fill` 同一个引用填满（与 `map` 造新对象对照）
// xl:round 305
// xl:judge stdout
// xl:end

const filled = new Array(3).fill({ n: 0 });
filled[0].n = 9;
console.log(filled.map((x) => x.n).join(","), filled[0] === filled[1]);
