// xl:title Object.assign 与对象展开：覆盖与浅拷贝
// xl:round 291
// xl:judge stdout
// xl:end

const target = { a: 1 };
console.log(JSON.stringify(Object.assign(target, { b: 2 }, { a: 9 })));
const src = { x: { y: 1 } };
const copy = { ...src };
console.log(copy.x === src.x, JSON.stringify({ ...src, z: 3 }));
