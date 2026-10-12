// xl:title 数组的 toString / join 在嵌套与稀疏上的读数
// xl:round 371
// xl:judge stdout
// xl:end
console.log(String([[1, 2], [3]]), [[1, 2], [3]].join(";"));
console.log(JSON.stringify([1, null, undefined, , 2].join("-")));
console.log([1, [2, [3]]].toString());
console.log(String([]), String([, ,]));
