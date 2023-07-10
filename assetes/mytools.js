// 特殊定義文字置き換え
function spchar(raw_text) {
  return output = raw_text.replace(/#Y/g, "\xA5") // "#Y"->YEN記号
    .replace(/\n/g, "")          // 改行削除
    .replace(/\^/g, "\n")          // "^"->改行記号
    .replace(/!S/g, "　")          // "!S"->全角空白文字
    .replace(/_/g, " ")        // "_"->空白文字
}

// 全角記号を半角記号に変換
function toHalfWidth(strVal){
  // 半角変換
  var halfVal = strVal.replace(/[！-～]/g, (tmpStr)=>{
    return String.fromCharCode( tmpStr.charCodeAt(0) - 0xFEE0 ); // Unicodeにおいて、"!"から"~"の範囲の全角／半角はコード値が 0xFEE0だけずれている
  } );
  // 文字コードシフトで対応できない文字の変換
  return halfVal.replace(/”/g, "\"")
    .replace(/’/g, "'")
    .replace(/‘/g, "`")
    .replace(/￥/g, "\\")
    .replace(/　/g, " ")
    .replace(/〜/g, "~");
}

// 改行全削除
function sptrim(str) {
  return str.replace(/\r?\n/g, "")
    .replace(/\s+/g, "");
}