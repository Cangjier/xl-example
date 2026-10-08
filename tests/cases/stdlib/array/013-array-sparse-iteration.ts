// xl:title 稀疏数组的遍历：map / forEach 跳过洞、join 补空
// xl:judge stdout
// xl:end

const xs: any[] = [1, , 3];
let count = 0;
xs.forEach(() => { count++; });
console.log(count, xs.map((v) => v).length, xs.join("-"));
