// xl:title 带泛型的可选形参与剩余形参
// xl:judge stdout
// xl:end

function f<T>(a: T, b?: T, ...rest: T[]): string {
  return [a, b, rest.length].join("|");
}
console.log(f(1), f(1, 2), f("a", "b", "c", "d"));
