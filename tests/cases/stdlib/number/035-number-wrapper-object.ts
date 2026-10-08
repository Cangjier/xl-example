// xl:title `new Number(5)` 是一个对象，`Number(5)` 是原始值
// xl:round 305
// xl:judge stdout
// xl:end

const boxed = new Number(5);
console.log(typeof boxed, boxed.valueOf(), typeof Number(5), boxed + 1);
