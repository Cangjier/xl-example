// xl:title declare 声明一律不产生运行期代码
// xl:round 371
// xl:judge stdout
// xl:end
declare const ambient: number;
declare function ambientFn(x: number): string;
declare class AmbientClass { m(): void }
declare namespace AmbientNs { const v: number }
declare module "some-module" { export const x: number }
const local = 1;
console.log(local, typeof ambient, typeof ambientFn, typeof AmbientClass, typeof AmbientNs);
