// xl:title 三层同名变量的遮蔽（全局 / 外层函数 / 内层函数）
// xl:round 305
// xl:judge stdout
// xl:end

const x = 1;
function outer(): number {
  const x = 2;
  function inner(): number {
    const x = 3;
    return x;
  }
  return inner() + x;
}
console.log(outer(), x);
