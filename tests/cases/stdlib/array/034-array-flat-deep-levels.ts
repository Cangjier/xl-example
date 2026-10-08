// xl:title flat 的深度：2 与 Infinity
// xl:judge stdout
// xl:end

const xs = [1, [2, [3, [4]]]];
console.log(xs.flat(2).join(","), xs.flat(Infinity).join(","), xs.flat(0).length);
