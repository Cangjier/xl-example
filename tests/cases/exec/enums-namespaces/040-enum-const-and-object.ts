// xl:title `const enum` 的成员在运行期就是一个数
// xl:round 330
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Level { Low = 1, Mid = 5, High = 10 }
function score(level: Level): number {
  return level * 2;
}
console.log(score(Level.Mid), Level.High);
