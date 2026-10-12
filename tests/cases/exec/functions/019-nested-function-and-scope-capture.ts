// xl:title 函数里再声明函数：捕获、遮蔽、互相调用
// xl:judge stdout
// xl:end

function outer() {
  const v = "outer";
  function inner() { return v; }
  function shadow() { const v = "shadow"; return v; }
  return inner() + "/" + shadow();
}
function mutual(n: number): number { return n <= 0 ? 0 : even(n - 1); }
function even(n: number): number { return n <= 0 ? 1 : mutual(n - 1); }
console.log(outer(), mutual(4), even(4));
