// xl:title splice：只删 / 只插 / 替换 / 负起点 / 越界
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4];
console.log(a.splice(1, 1).join(","), a.join(","));
const b = [1, 2, 3, 4];
console.log(b.splice(1, 0, "x").length, b.join(","));
const c = [1, 2, 3];
console.log(c.splice(-2, 5).join(","), c.join(","));
