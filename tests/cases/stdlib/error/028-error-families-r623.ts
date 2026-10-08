// xl:title 各错误族构造：TypeError / RangeError / ReferenceError / SyntaxError / URIError / EvalError
// xl:round 623
// xl:judge stdout
// xl:end

const list: any[] = [TypeError, RangeError, ReferenceError, SyntaxError, URIError, EvalError, AggregateError];
console.log(list.map((C) => C.name).join(","));
console.log(new TypeError("t").message, new RangeError().message === "", new TypeError("t") instanceof Error);
