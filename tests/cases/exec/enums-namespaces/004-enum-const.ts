// xl:title const enum：内联成字面量
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Level { Low = 1, High = 2 }
console.log(Level.Low, Level.High);
