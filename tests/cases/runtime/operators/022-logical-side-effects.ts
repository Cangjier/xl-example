// xl:title 逻辑短路：右边到底跑没跑
// xl:judge stdout
// xl:end

let calls = 0;
const hit = () => { calls += 1; return true; };
const miss = () => { calls += 1; return false; };
console.log(false && hit(), true || hit(), true && hit(), false || hit());
console.log(null ?? hit(), 0 ?? hit());
console.log(calls);
