// xl:title delete 数组元素留洞、delete 对象属性真的没有
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
delete xs[1];
console.log(xs.length, xs.join("|"), 1 in xs, xs[1]);
const o: any = { a: 1, b: 2 };
console.log(delete o.a, delete o.zzz, "a" in o, Object.keys(o).join(","));
