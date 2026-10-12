// xl:title keyof / 下标访问类型：只用类型、运行期照样跑
// xl:judge stdout
// xl:end

type O = { a: number; b: string };
type K = keyof O;
type V = O["a"];
const k: K = "a";
const v: V = 1;
console.log(k, v, typeof v);
