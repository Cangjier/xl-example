// xl:title declare const 只声明形状，值由别处给
// xl:round 304
// xl:judge stdout
// xl:end

declare const VERSION: string;
declare function external(x: number): number;
type Cfg = { a: number };
const cfg: Cfg = { a: 1 };
console.log(cfg.a, typeof VERSION, typeof external);
