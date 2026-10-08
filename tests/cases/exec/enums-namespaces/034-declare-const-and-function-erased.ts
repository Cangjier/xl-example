// xl:title `declare const` / `declare function` 整条擦掉
// xl:round 305
// xl:judge stdout
// xl:end

declare const VERSION: string;
declare function nativeFn(x: number): number;
console.log("erased", typeof VERSION);
