// xl:note 多段装饰器名 `@ns.dec` 仍然要拼成 `ns.dec.name` 这一族：
// 名字之间的 `.` 是「允许再接一个名字」的唯一凭据（防 `@dec x` 吞字段名）。
// xl:expect Decorator,Field
class A {
  @ns.dec x = 1
}
