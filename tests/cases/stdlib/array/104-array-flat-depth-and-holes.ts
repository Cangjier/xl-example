// xl:title flat / flatMap 的深度与空洞处理
// xl:round 7
// xl:judge stdout
// xl:end

const nested = [1, [2, [3, [4]]], , 5];
console.log(JSON.stringify(nested.flat()));
console.log(JSON.stringify(nested.flat(2)));
console.log(JSON.stringify(nested.flat(Infinity)));
console.log(JSON.stringify([1, 2, 3].flatMap((n) => (n === 2 ? [] : [n, n * 10]))));
console.log([1, , 3].flatMap((v) => [v]).length);
