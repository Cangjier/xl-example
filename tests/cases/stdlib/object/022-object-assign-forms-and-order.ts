// xl:title Object.assign：多源、覆盖顺序、返回目标、undefined 源
// xl:judge stdout
// xl:end

const target = { a: 1 };
const back = Object.assign(target, { b: 2 }, { a: 3 }, undefined as any);
console.log(back === target, JSON.stringify(target));
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { x: 2, y: 3 })));
console.log(JSON.stringify(Object.assign({}, "ab")));
