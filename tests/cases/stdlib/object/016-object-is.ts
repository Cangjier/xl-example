// xl:title Object.is 与 `===` 的两处不同
// xl:judge stdout
// xl:end

console.log(Object.is(NaN, NaN), NaN === NaN);
console.log(Object.is(0, -0), 0 === -0);
console.log(Object.is("a", "a"), Object.is({}, {}), Object.is(null, null));
