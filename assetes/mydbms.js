/*
  データベース管理スクリプト
  ＊使い方＊
  1. スプレッドシートを作成（これがDBファイルとなる）。
  2. シートの１行目にカラム名を入力。設定ルールは以下：
   [A] ID (String), [B] 更新日 (Date-Time), [C] {任意} (String) ...
  3. 基本的にはIDをキーとして、値を保管する形で利用する. (例) ID: {Val1, Val2..} のように
  ＊変数説明＊
  MyDbms.sname = 編集対象のスプレッドシートID(String)
  MyDbms.sname = 対象となるシート名(String)
*/

class MyDbms {
    constructor(book_id = "", sheet_name = "") {
        this.ssid = book_id;
        this.sname = sheet_name;
        this.cmx = -1;
        this.data = null;
        this.ssBook = null;
        this.ssSheet = null;
    };

    init() {
        if (this.ssBook == null) {
            this.ssBook = SpreadsheetApp.openById(this.ssid);
            this.ssSheet = this.ssBook.getSheetByName(this.sname);
        }
        if (this.cmx == -1) {
            this.cmx = this.ssSheet.getLastColumn();
        }
        return this.ssSheet;
    };

    read() {
        const sheet = this.init();
        const lastRow = sheet.getLastRow(); // 最終行数取得
        if (lastRow <= 1) return; // データなしのとき
        return sheet.getRange(2, 1, lastRow - 1, this.cmx).getValues(); // データ取得 ID列から最終列
    };

    stack(strict = false /* false: 読み速度優先, true: 正確さ優先 */) {
        if (strict || this.data == null) {
            // データロード  正確モード||データロード未実施
            this.data = this.read();
        }
        return this.data;
    };

    // 戻り値:: Null | [] | [[]] :: 検索ID = "{ID}" | "*", 検索モード = false (読み速度優先: default) | true (正確さ優先)
    select(id = "", strict = false /* false: 読み速度優先, true: 正確さ優先 */) {
        if (strict) {
            // 正確モード
            const sheet = this.init();
            const lastRow = sheet.getLastRow(); // 最終行の取得
            if (lastRow <= 1) return null; // データなしのとき
            const datas = sheet.getRange(2, 1, lastRow - 1, this.cmx).getValues(); // データ取得 ID列から最終列
            // データの検索
            if (id == "*") {
                return datas;     // すべて返却[[],[],[]]
            } else {
                let n_data = datas.filter(function (value) { return value[0] == id });
                return n_data[0]; // 指定IDのみ返却[[]]
            }
        } else {
            // 高速モード
            const datas = this.stack(); // データ取得
            if (!datas) return null;    // データなしのとき
            // データの検索
            if (id == "*") {
                return datas;     // すべて返却[[],[],[]]
            } else {
                let n_data = datas.filter(function (value) { return value[0] == id });
                return n_data[0];    // 指定IDのみ返却[]
            }
        }
    }

    // 戻り値:: true | false :: 検索ID = "{ID}", 更新したいカラムデータ配列 = [] (ID, Update列を除いたカラムサイズに一致必須)
    update(id = "", new_cols_array = []) {
        const sheet = this.init();
        if (new_cols_array.length < this.cmx - 2) return false;
        let dd = new Date();
        let appendQuery = [id, dd].concat(new_cols_array);
        // 最終行の取得
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return false;
        // データの取得
        const datas = sheet.getRange(2, 1, lastRow - 1, this.cmx - 2).getValues();
        // データの検索
        const dataIndex = datas.findIndex((value) => { return value[0] == id });
        if (dataIndex < 0) return false;  // データがマッチしない場合は除外
        sheet.getRange(dataIndex + 2, 1, 1, this.cmx).setValues([appendQuery]); // データ更新 ID列から最終列
        return true;
    }

    // 戻り値:: true | false :: 検索ID = "{ID}", 削除したい行のID = "{ID}"
    remove(id = "") {
        const sheet = this.init();
        // 最終行の取得
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return false;
        // データの取得
        const datas = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        // データの検索
        const dataIndex = datas.findIndex((value) => value == id)
        // データがマッチしない場合は除外
        if (dataIndex < 0) return false;
        sheet.deleteRow(dataIndex + 2);
        return true;
    }
}