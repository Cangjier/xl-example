// xl:title `do…while` / 空语句 / 逗号表达式 / 嵌套三元
// xl:round 749
// xl:judge stdout
// xl:end
let i = 0;
do { i++; } while (i < 3);
console.log(i);
let j = 5;
do { j++; } while (false);
console.log(j);
;;
const k = (1, 2, 3);
console.log(k);
console.log(true ? false ? "a" : "b" : "c", false ? "d" : true ? "e" : "f");
let n = 0;
for (let a = 0, b = 10; a < b; a++, b--) n++;
console.log(n);
label: do { break label; } while (true);
console.log("done");
