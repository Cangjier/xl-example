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
