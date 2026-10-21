import { a, b as c } //c\nfrom "m";
import a from "m" //c\nwith { type: "json" };
import a from "m"\nwith { type: "json" };
import type x = require("m")
import type { A as B } from "m";
import A = A.B;
namespace N { import A = B.C }
namespace N { import x = require("m") }
namespace N { const a = 1; export = a }
declare module "x" {\n  export function f(): void\n  const y: number\n  export default y\n}
declare module "*.css" {\n  const content: string\n  export default content\n}
declare global { interface Window { x: A } }
const a = 1\nconsole.log(a)
let { a } = o\nconsole.log(a)
const [, second] = [1, 2]\nconsole.log(second)
const o = { x: 1 } as const
try { } catch (e) { }
declare namespace A {}\nexport as namespace A
export as namespace JSON
const x = [1, 2]\nconsole.log(x)
a.class\n{}
a.b\n{}
a.interface\n{}
a.default\n{}
