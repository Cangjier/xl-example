// xl:title 展开落在 new 的实参与调用实参里（两个位置各一个）
// xl:judge stdout
// xl:end

class P { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } sum() { return this.x + this.y; } }
const args: [number, number] = [3, 4];
console.log(new P(...args).sum());
console.log(Math.max(...args), [0, ...args, 9].join(","));
const obj = { ...{ k: 1 }, ...{ k: 2 } };
console.log(JSON.stringify(obj));
