// xl:title 对象展开：后面的盖前面的，原对象不动
// xl:judge stdout
// xl:end

const a = { x: 1, y: 2 };
const b = { y: 9, z: 3 };
const c = { ...a, ...b, w: 4 };
console.log(c.x, c.y, c.z, c.w, a.y, b.y);
console.log(Object.keys(c).join(","));
