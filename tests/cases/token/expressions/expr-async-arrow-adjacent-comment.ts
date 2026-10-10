// xl:note `async` 与形参表之间夹注释时，`async` 仍是箭头的修饰词（投影那两格都认）
// xl:round 928
// `LamdaCloseRule.Process` 找 `async` 的那一跳只跳软换行 ⇒ `IsAsync` 是假、`async` 留在外面当
// 平级兄弟（`[Identifier(async), AreaAnnotation, Lamda]`）；把注释换成换行一直是绿的。
// 第 928 轮第二趟：投影那一档（`print-ast-common` 的 0a'）原来只认三格
// `[async, GenericType, Lamda]`，现在两格 / 三格走同一段补法（`async` + 可选泛型段 + `Lamda`）。
// xl:expect Lamda,LamdaParameters,Parameter,LamdaBody,Identifier,AreaAnnotation,TypeDefine,GenericType,Keyword,ReturnType
// xl:end
const g = async /*c*/ x => x;
const f = async/*c*/(): Promise<void> => {};
