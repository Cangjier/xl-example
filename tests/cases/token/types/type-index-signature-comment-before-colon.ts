// xl:note 索引签名里名字与冒号之间夹注释（第 900 轮）：`[k /*c*/ : string]` 的第二个实义单元原来是那条注释，判据给否 ⇒ 整条被收成字段（多 `PropertySignature` + `ComputedPropertyName`、缺 `IndexSignature` / `Parameter` / `StringKeyword`）；两跳改走 trivia 口径后仍是 `IndexSignature`
// xl:round 900
// xl:expect IndexSignature:1,Parameter:1,Interface:1,InterfaceBody:1,TypeDefine:2,Identifier:3,AreaAnnotation:1
// xl:end
interface I { [k /*c*/ : string]: number }
