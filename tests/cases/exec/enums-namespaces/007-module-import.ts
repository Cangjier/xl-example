// xl:title `import` 语句（模块解析与加载不在口径内）
// xl:judge stdout
// xl:want differ
// xl:why 裸说明符（`import { readFileSync } from "node:fs"`）没有解析：本仓给 `undefined`，`node` 给 `function`。**多文件 / 内置模块的加载**是待做项——`tsrun` 现在的单文件口径是现状，不是口径
// xl:end

import { readFileSync } from "node:fs";
console.log(typeof readFileSync);
