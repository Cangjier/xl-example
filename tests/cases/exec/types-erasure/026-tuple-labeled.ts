// xl:title 带标签的元组类型只是类型
// xl:round 304
// xl:judge stdout
// xl:end

type Pair = [first: number, second: string];
const p: Pair = [1, "a"];
const q: [x: number, y: number] = [2, 3];
console.log(p[0], p[1], q[0] + q[1], p.length);
