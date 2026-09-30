#!/usr/bin/env node
// 只是 shebang 的落点：启动逻辑全在 build/ts/cjcli.js（xl 产物，自执行）。
// xl 的产物头占掉前三行，而 tsc 只认文件第 1 行的 `#!`，所以这一行只能落在这里。
require("../build/ts/cjcli.js");
