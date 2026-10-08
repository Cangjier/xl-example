// xl:note 剩余形参的 `...` 是平级的 SymbolToken（不是 Spread），投影要把它切出来当 dotDotDotToken
// xl:expect Function,Parameter:2,SymbolToken
function f(a: number, ...rest: string[]): void {}
