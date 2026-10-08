// xl:title splice 的返回值与负起点
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.splice(1, 2).join(","), xs.join(","));
console.log([1, 2, 3].splice(-1, 1).join(","));
console.log([1, 2, 3].splice(1).join(","), [1, 2, 3].splice(9).length);
