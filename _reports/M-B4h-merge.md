# M-B4h 合并报告：function type parameter catalog

## 结论
- 合并完成，验收全绿，工作树干净。
- base：`20167c71970033cfd2e0ce0872c08154f9d90d10`（feature/all-possible）
- 源：`xl-example-set\b4h-fn-type` `feature/b4h-fn-type` @ `7ef55d304d373cdfa3b4adcd2489c026c9fa2a6a`，base 20167c71
- 合并提交：`998e6e4617103c7683f55e1454ec0bffadb1bf3b`（--no-ff，父 1 = base）
- 冲突：0（ort 自动合并），未手工改源码

## 改动（5 文件，+1264/-2）
- bracket-role-resolver：FunctionTypeParams + `)=>` 前瞻
- parameter-list-possible-shape：AllowQuestion / FinalizeDone / InstallForFunctionType / Probe 10
- type-alias-declaration-shape：`(` 壳、搬参数、返回类型
- probe：`typescript/cases/tts/tools/function-type-probe.mjs`

## 验收（xl build 635 文件全量重建后）
| 项 | 结果 |
| --- | --- |
| xl build (ts) | 0 error / 3 warning（E1107 既存） |
| tsc -p . | exit 0 |
| gates 默认 | 4 通过 / 0 失败 / 7 不适用 |
| gates --legacy | 4 通过 / 0 失败 / 7 不适用 |
| wide-ast 默认 | PASS 0 / 29 / 82+13=95 |
| wide-ast --legacy | PASS 0 / 0 / 2+0=2 |
| real-dts | PASS 0/0，差异 0/33 |
| tts | PASS 429 / FAIL 0（throw 3 / atomic 0 / partial 0 / incremental 426） |
| tshape-judge ts-all | 426 ok / 3 failures（登记在案） |
| function-type-probe | PASS FunctionTypeMountCount=7 |

## 清理
- 源目录 `xl-example-set\b4h-fn-type`：解 junction 后删除
- `git update-ref -d refs/merge/b4h` 已执行
- 未 push、未改源码、未建新分支、未重生成 INDEX/README

