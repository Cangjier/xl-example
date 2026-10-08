// xl:title 数组的 toString / String() / 模板里的形态
// xl:judge stdout
// xl:end

const xs: any = [1, [2, 3], null, undefined];
console.log(String(xs), xs.toString(), `${xs}`);
console.log([].toString().length, String([1, 2]));
