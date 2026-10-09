// xl:title 块里的函数声明与 var / let 的分工
// xl:round 371
// xl:judge stdout
// xl:end
function f(): string {
  if (true) {
    function inner(): string { return "inner"; }
    var v = 1;
    let l = 2;
    return inner() + v + l;
  }
  return typeof inner;
}
console.log(f(), typeof v === "undefined");
{
  let scoped = 1;
  const also = 2;
  console.log(scoped + also);
}
console.log(typeof scoped === "undefined");
