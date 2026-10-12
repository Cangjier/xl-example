// xl:title 用立即调用函数圈一块作用域：内外同名互不影响
// xl:judge stdout
// xl:end

const value = "outer";
const inner = (function () { const value = "inner"; return value; })();
console.log(value, inner);
const counter = (() => { let n = 0; return () => ++n; })();
counter(); counter();
console.log(counter());
