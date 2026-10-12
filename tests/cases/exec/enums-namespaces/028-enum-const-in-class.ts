// xl:title const 枚举当类字段的初始值
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

const enum Level { Low = 1, High = 10 }
class Threshold {
  level: Level = Level.High;
  isHigh(): boolean { return this.level === Level.High; }
}
const t = new Threshold();
console.log(t.level, t.isHigh());
