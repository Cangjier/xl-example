// xl:title toString 与 join 在洞 / null / undefined / 嵌套上的口径
// xl:judge stdout
// xl:end

const xs: any[] = [1, null, undefined, , 5];
console.log(xs.toString(), xs.join("-"));
console.log([[1, 2], [3]].toString(), [[1, 2], [3]].join(";"));
console.log([].toString() === "", [1].toString());
