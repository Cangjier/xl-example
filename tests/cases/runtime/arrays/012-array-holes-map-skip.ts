// xl:title 稀疏数组：map / forEach 跳过洞、join 把洞当空
// xl:judge stdout
// xl:end

const xs = [1, , 3];
let visits = 0;
const mapped = xs.map((v) => { visits += 1; return v * 2; });
console.log(xs.length, visits, mapped.join("|"), mapped.length, 1 in xs, 1 in mapped);
xs.forEach(() => { visits += 1; });
console.log(visits);
