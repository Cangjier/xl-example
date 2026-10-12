// xl:title 类型位导入导出：import type / export type / typeof 型导入都不产生装载
// xl:round 7
// xl:judge stdout
// xl:end

import type { Stats } from "node:fs";
export type Local = { n: number };
type Alias = Stats | Local;
const x: Alias = { n: 1 };
const t: typeof x = { n: 2 };
console.log(JSON.stringify(x), JSON.stringify(t));
