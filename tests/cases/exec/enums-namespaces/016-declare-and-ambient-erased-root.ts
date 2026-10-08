// xl:title declare 一族（const / let / function / class / global）：全擦掉
// xl:judge stdout
// xl:end

declare const ambientValue: number;
declare function ambientFn(x: number): string;
declare class AmbientClass { m(): void }
declare global { interface Window { extra: number } }
const local = 1;
console.log(local, typeof ambientValue);
