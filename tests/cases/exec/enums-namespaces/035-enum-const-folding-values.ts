// xl:title `const enum` 的成员在运行期是普通对象上的属性
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Level { Low = 1, High = 2 }
console.log(Level.Low, Level.High, Level[1]);
