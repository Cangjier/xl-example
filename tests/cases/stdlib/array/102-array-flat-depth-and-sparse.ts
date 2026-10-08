// xl:title Array.flat：深度参数、Infinity、空洞被去掉
// xl:judge stdout
// xl:end

console.log([1, [2, [3, [4]]]].flat().join(","), [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","), [1, [2]].flat(0).join(","));
const holey: any[] = [1, , 3];
console.log(holey.flat().length, holey.flat().join(","), JSON.stringify(holey.flat()));
