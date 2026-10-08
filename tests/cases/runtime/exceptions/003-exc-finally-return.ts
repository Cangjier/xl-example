// xl:title `finally` 里 return 会**接管**；值要提前算出来
// xl:judge stdout
// xl:end

function a(): number { try { return 1; } finally { console.log("cleanup"); } }
console.log(a());
function b(): number { let n = 0; try { n = 1; return n; } finally { n = 2; } }
console.log(b());
function c(): string { try { return "t"; } finally { return "f"; } }
console.log(c());
