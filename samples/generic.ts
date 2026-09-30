// GenericType 样本：泛型实参段与比较运算符并存
class Foo<T> {
    let value: T
}

let numbers: Array<Int64> = Array<Int64>(3)
let table: HashMap<String, Int64> = HashMap<String, Int64>()
let nested: Array<Array<Int64>> = Array<Array<Int64>>(1)
let spread: HashMap<String,
    Int64> = HashMap<String, Int64>()
let commented: HashMap<String, // 键类型
    Int64> = HashMap<String, Int64>()
let made = new Array<Int64>(3)
let called = identity<Int64>(1)

// 下面全部必须仍然是比较符号 Symbol
let lt = a < b
let le = a <= b
let tight = a<b
let spanning = a < b > c
print(a < b, c > d)
if (a < b) {
    print("lt")
}
if (a < b && c > d) {
    print("mp")
}
for (let i = 0; i < 10; i++) {
    print(i)
}

// 字符串与注释里的尖括号不受影响
let text = "a < b"
// 注释里的 a < b 也不该变成泛型

// 结尾两条用 ; 收住：as / type 会一路吞到语句结束，这是当前的行为
let cast = value as Array<Int64>;
type Pair = Array<Int64> // 行尾注释不该影响判定
