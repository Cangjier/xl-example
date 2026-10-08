// xl:title declare 那一族：整句跳过（不产生任何东西）
// xl:judge stdout
// xl:end

declare const globalConst: number;
declare function ambientFn(n: number): number;
declare class Ambient { m(): void }
declare module "whatever" { }
declare namespace AmbientNs { const x: number; }
const real = 1;
console.log(real, typeof ambientFn);
