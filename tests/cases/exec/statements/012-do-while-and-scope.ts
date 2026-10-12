// xl:title do..while 的块作用域与循环外的可见性
// xl:judge stdout
// xl:end

let n = 0;
do { const step = 2; n += step; } while (n < 5);
console.log(n);
let outer = "before";
{ let outer = "inner"; console.log(outer); }
console.log(outer);
