// xl:title NaN 的三问
// xl:round 692
// xl:judge stdout
// xl:end

console.log(NaN === NaN, Object.is(NaN, NaN), Number.isNaN("x"), isNaN("x"));
