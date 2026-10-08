// xl:note 两个装饰器之间夹一条**行注释**：换行那一刻这一段仍然「只装装饰器」，
// 语句壳不该收 —— 只跳软换行时循环停在注释上 ⇒ 两个装饰器被劈成两条语句
// xl:expect Decorator,Class,ClassBody
@a // x
@b class C {}
