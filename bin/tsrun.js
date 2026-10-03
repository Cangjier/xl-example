#!/usr/bin/env node
// shebang 的落点：启动逻辑全在 build/ts/tsrun.js（xl 产物）。
// xl 的产物头占掉前三行，而 tsc 只认文件第 1 行的 `#!`，所以这一行只能落在这里。
//
// **为什么是显式调 RunMain，而不是 require 一下就算**：`tsrun.js` 末尾那句
// `if (require.main === module)` 在**被 require** 时是假（`require.main` 是这个垫片），
// 所以它不会自执行——这正是「同一个文件既是库又是命令行」需要的形状。
const tsrun = require("../build/ts/tsrun.js");

tsrun.RunMain(process.argv.slice(2));
