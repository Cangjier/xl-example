// xl:title const enum 与字符串 enum 的取值（类型剥离线）
// xl:round 8
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Dir { Up, Down }
enum Name { A = "a", B = "b" }
console.log(Dir.Up, Dir.Down, Dir[0], Name.A, Name.B);
