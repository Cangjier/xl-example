// xl:title 数值 enum：反向映射也要造出来
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Color { Red, Green = 5, Blue }
console.log(Color.Red, Color.Green, Color.Blue, Color[5], Color[6]);
