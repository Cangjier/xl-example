// xl:title flat 的深度参数与 Infinity
// xl:judge stdout
// xl:end

const xs: any[] = [1, [2, [3, [4]]]];
console.log(xs.flat().join(","), xs.flat(2).join(","), xs.flat(Infinity).join(","));
console.log(xs.flat(0).length, [].flat().length);
