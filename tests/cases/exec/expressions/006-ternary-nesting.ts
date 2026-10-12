// xl:title 嵌套三元 / 三元当实参 / 三元里的赋值
// xl:judge stdout
// xl:end

function kind(n: number): string { return n === 0 ? "zero" : n > 0 ? (n > 10 ? "big" : "small") : "neg"; }
console.log(kind(0), kind(5), kind(50), kind(-1));
let hit = 0;
console.log(true ? (hit = 1, "yes") : "no", hit);
