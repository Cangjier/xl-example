// xl:title `do..while` 体里的块级作用域变量
// xl:round 305
// xl:judge stdout
// xl:end

let i = 0;
const seen: number[] = [];
do {
  const doubled = i * 2;
  seen.push(doubled);
  i++;
} while (i < 3);
console.log(seen.join(","));
