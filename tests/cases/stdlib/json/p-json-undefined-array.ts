// xl:title 数组里的 undefined / 函数 / 符号
// xl:round 692
// xl:judge stdout
// xl:end

console.log(JSON.stringify([undefined, function () {}, Symbol("s")]));
