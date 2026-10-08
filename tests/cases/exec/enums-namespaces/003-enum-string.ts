// xl:title 字符串 enum：没有反向映射
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Dir { Up = "UP", Down = "DOWN" }
console.log(Dir.Up, Dir.Down, Object.keys(Dir).join(","));
