// xl:title Array.reverse / concat（含非数组实参）
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
console.log(xs.reverse().join(","), xs.join(","));
console.log([1].concat([2, 3], 4).join(","), [].concat().length);
console.log([1].concat("ab" as any).join(","));
