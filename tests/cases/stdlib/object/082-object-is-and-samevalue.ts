// xl:title Object.is：NaN / ±0 / 引用
// xl:round 371
// xl:judge stdout
// xl:end
const o = {};
console.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is(-0, -0), Object.is(o, o), Object.is({}, {}));
console.log(NaN === NaN, 0 === -0);
console.log([NaN].includes(NaN), [0].includes(-0), [0].indexOf(-0));
