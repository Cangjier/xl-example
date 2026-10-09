// xl:title toString / String() / join 对洞与 null 的处置
// xl:round 291
// xl:judge stdout
// xl:end

console.log([1, null, undefined, 2].toString());
console.log(String([1, [2, [3]]]));
console.log([, , 1].join("-"));
