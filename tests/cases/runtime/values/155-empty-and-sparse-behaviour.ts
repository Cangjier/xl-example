// xl:title 空数组与稀疏数组：map/forEach/reduce 的差别
// xl:round 323
// xl:judge stdout
// xl:end

const sparse: any[] = [1, , 3];
console.log(sparse.length, sparse.map((v) => v * 2).join(","), sparse.filter((v) => v === undefined).length);
let calls = 0;
sparse.forEach(() => { calls += 1; });
console.log(calls, [].reduce((a, b) => a + b, 0));
console.log(sparse.join("-"), JSON.stringify(sparse));
