// xl:note 抽象方法的名字与类型参数表之间换行（第 900 轮片段普查记在「待登记」那一栏的第 E 格、第 902 轮登记）：`abstract m` 换行 `<T>(): void;` 里方法声明整条认不出来（`abstract m` 落成 `PropertyDeclaration`、`<T>(): void;` 落成一个无名 `CallSignature`）
// xl:round 902
// 第 904 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `SignatureCloseRule.Previous` 的**泛型那一支**——它的「前一个是名字」守卫只跨注释、不跨软换行，
// 于是换行之后的 `<T>` 被当成一条无名签名的开头（本规则位次在 `MethodDeclarationCloseRule` 之前），
// `m` 只剩给 `Field`。现在两支共用 `NameOnPreviousLine`（「上一行只写了一个名字」）。
// xl:expect MethodDeclaration:1
// xl:end
abstract class A { abstract m
<T>(): void; }
