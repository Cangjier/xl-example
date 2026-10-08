// xl:title 用一个对象返回多个值（含解构那一半）
// xl:judge stdout
// xl:end

function divmod(a: number, b: number): { q: number; r: number } {
  return { q: Math.floor(a / b), r: a % b };
}
const { q, r } = divmod(17, 5);
console.log(q, r, divmod(17, 5).r, divmod(-7, 3).q, divmod(-7, 3).r);
