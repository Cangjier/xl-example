// xl:title concat：非数组实参、洞的保留、Symbol.isConcatSpreadable 缺省
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify([1].concat([2, 3], 4, "ab")));
console.log(JSON.stringify([1].concat([[2], [3]])));
const xs: any[] = [1, , 3];
console.log(xs.length, JSON.stringify(xs.concat([])));
console.log(JSON.stringify([].concat(1, [2], [[3]])));
