// xl:title interface / type / declare：一个运行期指令都不产生
// xl:round 323
// xl:judge stdout
// xl:end

interface Opts { n: number; s?: string }
type Alias = Opts & { extra: boolean };
declare const ghost: number;
const f = (o: Opts): string => o.n + (o.s ?? "-");
console.log(f({ n: 1 }), f({ n: 2, s: "x" }));
