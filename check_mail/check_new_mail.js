function checkNewMailv3() {
    const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
    const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    const LineUserId = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");

    const GmailAppQuery = 'subject:"ご利用のお知らせ【三井住友カード】"';
    const GmailSreadLimit = 3;      // 取得するメール検索結果のスレッド数
    const Offset_DataType = "olive"; // [F] データ種別 
    const Offset_GnlcSymbol = "S";   // [G] 汎用記号

    Logger = BetterLog.useSpreadsheet(BookId);
    const Rcdb = SpreadSheetsSQL.open(BookId, "records.db");

    try {
        // try
        const threads = GmailApp.search(GmailAppQuery, 0, GmailSreadLimit);
        for (let t of threads) {
            for (let m of t.getMessages()) {
                // for m <= thread[].massages[]
                // メール本文
                let mBody = m.getPlainBody();

                // メールの内容から、対象のメールか判断
                if (mBody.indexOf("ご利用カード：Ｏｌｉｖｅ／クレジット") === -1) continue;

                // 情報の取得
                let trnsdate = (function (t) { // 利用日
                    let regexp = new RegExp(/利用日：(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})/);
                    let match = regexp.exec(t);
                    if (match !== null) return match[1] + ":01"; // メール記載は"2023/06/04 23:04"と時間が分までしかない
                    else return "";
                })(mBody);

                let trnsvalue = (function (t) { // 利用金額
                    let regexp = new RegExp(/(?<=利用金額：)(\b\d{1,3}(,\d{3})*\b)(?=円)/);
                    let match = t.match(regexp);
                    if (match !== null) return parseInt(match[0].replace(",", "")); // 数値に変換
                    else return 0;
                })(mBody);

                let trnsshop = (function (t) { // 利用先
                    let regexp = new RegExp(/利用先：(.+)/);
                    let match = regexp.exec(t);
                    if (match !== null) return match[1];
                    else return "";
                })(mBody);

                // 新規メールかどうか

                let isNewMail = (function (mailsDate) { // t/f メールが新規のデータかどうか　DBの最終利用日と比較
                    let Mydb = new MyDbms("ccview.mydbms");
                    let serialValue = Mydb.select("before-m-first-d-serialv");
                    let data = Rcdb.select(["id", "date", "data_type", "value"]).filter("data_type = olive AND date > " + serialValue[3]).result();
                    for (let i = data.length - 1; i >= 0; i--) {
                        let d = data[i];
                        let fdd = new Date(d.date).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
                        if (fdd == mailsDate.slice(0, 16)) return false;
                    }
                    return true;
                })(trnsdate); // "利用日" 引き渡し
                if (!isNewMail) continue; // Next m　メールが新規のデータではない

                let now = new DateJp().date;
                let id = now.getTime().toString(32).toUpperCase();
                let insertQuery = {
                    "id": id,
                    "update": now,
                    "date": trnsdate,
                    "value": trnsvalue,
                    "shop": trnsshop,
                    "data_type": Offset_DataType,
                    "expense_for": "",
                    "comment": "",
                    "gnlc_symbol": Offset_GnlcSymbol
                }
                Rcdb.insertRows([insertQuery]);

                const LnNt = new LineNotification();
                LnNt.notification(trnsvalue, trnsshop, trnsdate);

                // for End
            }
        }
        // try End
    } catch (e) {
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
        throw e;
    }
}