// xl:expect Decorator,Class
// xl:note 基线用例（来自缺口审计语料）
@Component({ selector: "app" })
class A {
  @Input() name: string
  @Output() ev = new EventEmitter()
}
