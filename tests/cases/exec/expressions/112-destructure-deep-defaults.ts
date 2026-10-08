// xl:title 解构：深层默认、重命名、剩余、函数形参处
// xl:round 9
// xl:judge stdout
// xl:end

const { a: { b: { c = 3 } = {} } = {}, d = 4, ...rest } = { d: 9, e: 1, f: 2 };
console.log(c, d, JSON.stringify(rest));
function f({ x = 1, y: { z = 2 } = {} }: any, [p, q = 5]: any[] = []) {
  return [x, z, p, q].join(",");
}
console.log(f({}), f({ x: 9, y: { z: 8 } }, [7]));
