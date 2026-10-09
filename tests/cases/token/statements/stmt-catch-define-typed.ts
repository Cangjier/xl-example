// xl:note catch 形参带类型标注：VariableDeclaration 要连 `: 类型` 一起
// xl:round 893
// xl:expect CatchDefine
// xl:expect TypeDefine
// xl:end
// 第 893 轮片段普查量出来的：`catch (e: unknown)` 的 TS 那边
// `VariableDeclaration` 是 [15,25)（`e: unknown` 整段）、`type` 是 `UnknownKeyword[17,25)`，
// 而本仓原来按名字两端给（[15,16)）且把类型投成了那层 `TypeDefine` 壳
// ⇒ 漂一格 + 多一格 + 缺 `UnknownKeyword` + 字段名少 `type`。
// 判据钉在**同一份文件的两头**：有类型标注（这一段）与没有（`catch (f) { }`）。
try { } catch (e: unknown) { }
try { } catch (f) { }
