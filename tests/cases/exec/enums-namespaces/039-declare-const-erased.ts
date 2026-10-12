// xl:title `declare const` 与 `declare function` 整条擦掉
// xl:round 330
// xl:judge stdout
// xl:end

declare const INJECTED: number;
declare function injected(): string;
console.log(typeof INJECTED, typeof injected);
