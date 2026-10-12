// xl:title 引用同一性：对象按引用相等，改一处两处都变
// xl:judge stdout
// xl:end

const a = { n: 1 };
const b = a;
b.n = 2;
const c = { n: 2 };
console.log(a.n, a === b, a === c, a !== c);
const xs = [1, 2];
const ys = xs;
ys.push(3);
console.log(xs.length, xs === ys, xs === [1, 2, 3]);
