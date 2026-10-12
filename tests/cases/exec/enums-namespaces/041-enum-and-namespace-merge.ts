// xl:title `enum` 与 `namespace` 合并（运行期两个都在）
// xl:round 331
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Level { Low = 1, High = 2 }
namespace Level {
  export function label(value: Level): string {
    return value === Level.Low ? "low" : "high";
  }
}
console.log(Level.Low, Level.High, Level.label(Level.High), Level[1]);
