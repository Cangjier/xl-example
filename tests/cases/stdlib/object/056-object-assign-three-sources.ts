// xl:title `Object.assign` 三个来源，后面的覆盖前面的
// xl:round 305
// xl:judge stdout
// xl:end

const target = Object.assign({}, { a: 1 }, { b: 2 }, { a: 3 });
console.log(JSON.stringify(target), target.a, target.b);
