// xl:title 嵌套数组、负/越界下标、length 的写
// xl:judge stdout
// xl:end

const grid = [[1, 2], [3, 4]];
console.log(grid[1][0], grid[0][1], grid[9]);
const xs = [1, 2, 3];
console.log(xs[-1], xs[xs.length - 1], xs[100]);
