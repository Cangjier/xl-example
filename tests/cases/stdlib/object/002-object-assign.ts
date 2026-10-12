// xl:title Object.assign：后面的盖前面的、返回目标、多个来源
// xl:judge stdout
// xl:end

const target: any = { a: 1 };
const out = Object.assign(target, { b: 2 }, { a: 9, c: 3 });
console.log(out === target, JSON.stringify(out));
console.log(JSON.stringify(Object.assign({}, { x: 1 }, { y: 2 })));
