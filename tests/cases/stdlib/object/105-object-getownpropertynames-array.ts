// xl:title Object.getOwnPropertyNames(数组)：下标 + length，symbol 不在里面
// xl:judge stdout
// xl:end

const xs: any[] = [1, 2];
xs.extra = "e";
console.log(Object.getOwnPropertyNames(xs).join(","));
console.log(Object.keys(xs).join(","), Object.getOwnPropertyNames("ab").join(","));
