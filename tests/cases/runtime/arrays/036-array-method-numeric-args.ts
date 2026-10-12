// xl:title 数组方法收到小数 / 负数 / 越界实参
// xl:round 371
// xl:judge stdout
// xl:end
const xs = [1, 2, 3, 4, 5];
console.log(JSON.stringify(xs.slice(1.5, 3.9)), JSON.stringify(xs.slice(-2.5)));
console.log(JSON.stringify(xs.splice(1.5, 2.5)), JSON.stringify(xs));
console.log(JSON.stringify([1, 2, 3].fill(9, 1.5)), JSON.stringify([1, 2, 3].copyWithin(0, 1.5)));
console.log([1, 2, 3].indexOf(2, 1.5), [1, 2, 3].includes(2, 1.5), [1, 2, 3].at(1.5));
console.log([1, 2, 3].join().length, JSON.stringify([1, 2, 3].concat(4).slice(NaN)));
