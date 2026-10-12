// xl:title `Object(1)` / `Object("a")` 给包装对象
// xl:round 305
// xl:judge stdout
// xl:end

console.log(typeof Object(1), typeof Object("a"), typeof Object(true), Object(1).valueOf());
