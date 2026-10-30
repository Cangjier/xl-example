# 预期 token 树（逐字）：`type A = `a${string}b``

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22
t y p e   A   =   ` a $ { s t r i n g } b ` ⏎
```

## [char 0] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="t"
```

## [char 1] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="ty"
```

## [char 2] `"p"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="typ"
```

## [char 3] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="type"
```

## [char 4] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
└─ WrapSymbol  src=[4,5)  text=" "
```

## [char 5] `"A"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ Common  src=[0,4)  text="type"
├─ WrapSymbol  src=[4,5)  text=" "
└─ Common  src=[5,6)  text="A"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"="`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Symbol  src=[7,8)  text="="
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"`"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
```

## [char 10] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      └─ ConstString  src=[10,11)  text="a"
```

## [char 11] `"$"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      └─ ConstString  src=[10,11)  text="a"
```

## [char 12] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
```

## [char 13] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,14)  text="s"
```

## [char 14] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,15)  text="st"
```

## [char 15] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,16)  text="str"
```

## [char 16] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,17)  text="stri"
```

## [char 17] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,18)  text="strin"
```

## [char 18] `"g"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,...)
         └─ Common  src=[13,19)  text="string"
```

## [char 19] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      └─ InterpolationString  src=[12,20)
         └─ Common  src=[13,19)  text="string"
```

## [char 20] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,...)
      ├─ ConstString  src=[10,11)  text="a"
      ├─ InterpolationString  src=[12,20)
      │  └─ Common  src=[13,19)  text="string"
      └─ ConstString  src=[20,21)  text="b"
```

## [char 21] `"`"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ String  src=[9,22)
      ├─ ConstString  src=[10,11)  text="a"
      ├─ InterpolationString  src=[12,20)
      │  └─ Common  src=[13,19)  text="string"
      └─ ConstString  src=[20,21)  text="b"
```

## [char 22] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TypeAliasDeclarationShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   ├─ WrapSymbol  src=[6,7)  text=" "
   ├─ Symbol  src=[7,8)  text="="
   ├─ WrapSymbol  src=[8,9)  text=" "
   ├─ String  src=[9,22)
   │  ├─ ConstString  src=[10,11)  text="a"
   │  ├─ InterpolationString  src=[12,20)
   │  │  └─ Common  src=[13,19)  text="string"
   │  └─ ConstString  src=[20,21)  text="b"
   └─ WrapSymbol  src=[22,23)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,23)
└─ TypeAliasDeclarationShape  pos=0  src=[0,22)
   ├─ IdentifierShape  pos=4  src=[5,6)  text="A"
   └─ TemplateLiteralTypeShape  pos=8  src=[9,22)
      ├─ TemplateHeadShape  pos=8  src=[9,13)
      └─ TemplateLiteralTypeSpanShape  pos=13  src=[13,22)
         ├─ StringKeywordShape  pos=13  src=[13,19)  text="string"
         └─ TemplateTailShape  pos=19  src=[19,22)
```
