// xl:title 变异方法：splice 返回值、copyWithin、fill 的区间
// xl:round 9
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.splice(1, 2, "x")), JSON.stringify(a));
console.log(JSON.stringify([1, 2, 3, 4].copyWithin(0, 2)));
console.log(JSON.stringify([1, 2, 3, 4].fill(0, 1, 3)));
console.log(JSON.stringify([1, 2, 3].fill(9, -1)));
