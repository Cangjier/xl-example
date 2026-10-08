// xl:title 二维数组的按行改与整体观察
// xl:judge stdout
// xl:end

const grid: number[][] = [[1, 2], [3, 4]];
grid[0][1] = 9;
grid.push([5, 6]);
console.log(JSON.stringify(grid));
const copy = grid.slice();
copy[0][0] = 100;
console.log(grid[0][0], copy[0][0], grid === copy);
