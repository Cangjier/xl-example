// xl:note 计算成员名 + 成员签名：`[Symbol.iterator](): T;` 必须收成 MethodDeclaration
//（修前它被 SignatureReorganization 抢成一个无名 Signature，
// 因为 `(` 前面是 `[` 括号而那条判据只挡 Identifier/GenericType）
// xl:expect MethodDeclaration,MethodDeclaration:3,ReturnType
interface I {
  [Symbol.iterator](): ArrayIterator<number>;
  [SymbolToken.dispose](): void;
  ["named"](): string;
}
