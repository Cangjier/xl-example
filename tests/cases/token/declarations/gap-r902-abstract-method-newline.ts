// xl:note 抽象方法的名字与类型参数表之间换行（第 900 轮片段普查记在「待登记」那一栏的第 E 格、第 902 轮登记）：`abstract m` 换行 `<T>(): void;` 里方法声明整条认不出来（`abstract m` 落成 `PropertyDeclaration`、`<T>(): void;` 落成一个无名 `CallSignature`）
// xl:round 902
// xl:known-gap `MethodDeclarationCloseRule` 的名字与类型参数段不在同一行时「名字 + `<T>` + `(`」的扫描跨不过那个换行——根因尚未量清，如实登记、不猜
// xl:end
abstract class A { abstract m
<T>(): void; }
