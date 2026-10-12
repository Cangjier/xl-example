// xl:title import type / export type / export 声明：单文件里都不产生运行期东西
// xl:round 323
// xl:judge stdout
// xl:end

type Local = { n: number };
const v: Local = { n: 1 };
console.log(v.n);
