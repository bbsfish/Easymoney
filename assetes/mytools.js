class MyString {
  constructor(text = "") { this.str = text; }
  set(text = "") { this.str = text; }
  get() { return this.str; }

  spchars(text = this.str) {  // 特殊文字列置き換え
    this.str = text.replace(/#Y/g, "\xA5")  // "#Y"->YEN記号
      .replace(/\n/g, "")         // 改行削除
      .replace(/\^/g, "\n")       // "^"->改行記号
      .replace(/!S/g, "　")       // "!S"->全角空白文字
      .replace(/_/g, " ");        // "_"->空白文字
    return this.str;
  }

  toHalfWidth(text = this.str) {  // 全角to半角 全置換
    // 半角変換
    var halfVal = text.replace(/[！-～]/g, (tmpStr) => {
      return String.fromCharCode(tmpStr.charCodeAt(0) - 0xFEE0); // Unicodeにおいて、"!"から"~"の範囲の全角／半角はコード値が 0xFEE0だけずれている
    });
    // 文字コードシフトで対応できない文字の変換
    this.str = halfVal.replace(/”/g, "\"")
      .replace(/’/g, "'")
      .replace(/‘/g, "`")
      .replace(/￥/g, "\\")
      .replace(/　/g, " ")
      .replace(/〜/g, "~");
    return this.str;
  }

  // 改行文字置き換え（削除）
  repEol(text = this.str, delete_mode = false) {
    if (delete_mode) {
      this.str = text.replace(/\r?\n/g, "");
    } else {
      this.str = text.replace(/\r?\n/g, "^");
    }
    return this.str;
  }

  sptrim(text = this.str) {
    this.str = text.replace(/ /g, "");
    return this.str;
  }
}