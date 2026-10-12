// xl:title indexOf / lastIndexOf / includes 的 NaN、undefined 与起始下标
// xl:judge stdout
// xl:end

const xs: any[] = [1, undefined, 2, undefined];
console.log(xs.indexOf(undefined), xs.lastIndexOf(undefined), xs.indexOf(undefined, 2));
console.log([NaN].includes(NaN), [NaN].indexOf(NaN), [NaN].lastIndexOf(NaN));
console.log([1, 2, 1].lastIndexOf(1, 1), [1, 2, 1].indexOf(1, -1));
