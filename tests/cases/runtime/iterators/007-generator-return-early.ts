// xl:title 生成器：提前 return 收尾、finally 照跑
// xl:judge stdout
// xl:end

function* g() {
  try { yield 1; yield 2; } finally { console.log("cleanup"); }
}
const it = g();
console.log(it.next().value);
console.log(it.return(9).value, it.next().done);
