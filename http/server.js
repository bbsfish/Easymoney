Logger = BetterLog.useSpreadsheet("your-spread-sheet-id-for-logging");

// Preview HTML
function doGet(e) {
    const AppRootUrl = "https://script.google.com/macros/s/AKfycbxFj8Uq7DuaCl6AWXcGEsaJVyNBa5tFW3KuhE_yICp4QfP0lfT5mB3OtRrG2sZxmf4/exec";

    Logger.log("doGet().GetGET: %s", e);
    try {
        let file = "index.html";
        if (e.parameter["pg"] !== undefined) {
            if (e.parameter.pg == 2) {
                file = "index2.html";
            }
        }
        const Html = HtmlService.createTemplateFromFile(file);
        if (e.parameter["pg"] !== undefined) {
            if (e.parameter.pg == 2) {
                let tablehtml = show_cardbilling();
                console.log(tablehtml);
                Html.cardbillingtables = tablehtml;
            }
        }
        Html.statusStyle = "display: none";
        Html.statusMessage = "";
        Html.index = AppRootUrl;
        return Html.evaluate();
    } catch (e) {
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
    }
}

function show_cardbilling() {
    let result_html = "";
    let Mydb = new MyDbms(BookId, "ccview.mydbms");
    let serialValue = Mydb.select("serialv-50");
    let db = SpreadSheetsSQL.open(BookId, "cardbilling.db");
    let data = db.select(["card_name", "billing_total", "withdrawal_date", "comment", "status"]).filter("withdrawal_date > " + serialValue[3]).orderBy(["withdrawal_date"]).result();
    if (data[0] == "") return "<p>データはありません</p>";
    data.forEach(r => {
        result_html += `
        <table><thead><tr><th colspan='2'>${r.card_name}</th></tr><tr><th width='180px'></th><th width='270px'></th></tr></thead>
          <tbody> <tr><th>請求金額</th><td class='cell-y'>${Number(r.billing_total).toLocaleString()}</td></tr>
            <tr><th>引落日</th><td>${new Date(r.withdrawal_date).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}</td></tr>
            <tr><th>コメント</th><td>${r.comment}</td></tr> </tbody></table>`;
    });
    return result_html;
}

// When Get POST
function doPost(e) {
    const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
    const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    const LineUserId = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
    Logger.log("doPost().GetPOST: %s", e);

    if (String(e.parameters.datatype) == "card_billing_regi") {
        return card_billing_regi(e);
    }

    // insert オブジェクト
    let insert_obj = {
        "id": "",
        "update": "",
        "date": "",
        "value": "",
        "shop": "",
        "data_type": "",
        "expense_for": "",
        "comment": "",
        "gnlc_symbol": "M",
        "written": "0"
    }

    // 処理
    try {
        // 結果バインド
        const Formdata = {
            "支払金額": Number(e.parameters.total[0]),
            "費目": String(e.parameters.expense_item),
            "コメント": String(e.parameters.cmnt),
            "日付": {
                // "日付" は空でも存在。あとは、選択されたものだけが存在、値は キー: ["on"]
                "今日": e.parameters.date_today,
                "昨日": e.parameters.date_yest,
                "指定": e.parameters.date_manual,
                "日付": e.parameters.date // -> ["yyyy-MM-dd"]
            },
            "支払方法": String(e.parameters.payway),
            "データタイプ": String(e.parameters.datatype)
        }

        if (Formdata.データタイプ != "registration") throw new Error("データタイプが不正です");

        let dd = new Date();

        insert_obj.update = dd;

        // id
        insert_obj.id = dd.getTime().toString(32).toUpperCase();

        // 利用日
        if (Formdata.日付.今日 !== undefined) {
            insert_obj.date = dd;
        }
        else if (Formdata.日付.昨日 !== undefined) {
            let ndd = new Date(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1).getTime() + 1000);
            insert_obj.date = ndd;
        }
        else {
            let a = Formdata.日付.日付[0].split("-"); // "YYYY-MM-DD"
            let ndd = new Date(new Date(a[0], Number(a[1]) - 1, a[2]).getTime() + 1000);
            insert_obj.date = ndd;
        }

        // その他
        insert_obj.value = Formdata.支払金額;
        insert_obj.expense_for = Formdata.費目;
        insert_obj.comment = Formdata.コメント;
        insert_obj.data_type = Formdata.支払方法;

        // 書き込み
        let db = SpreadSheetsSQL.open(BookId, "recordque.db");
        db.insertRows([insert_obj]);

        // unwrittenチェック
        let ss = SpreadsheetApp.openById(BookId).getSheetByName("recordque.db");
        let n = ss.getRange("M1").getValue();
        let nMessage = "[通知]^情報登録が完了しました.";
        nMessage += (n > 0) ? "^*_書込待ちのデータが" + n + "件あります." : "^*_書込待ちのデータはありません.";
        nMessage += "^*_追加IDは以下です.";
        let nMessage2 = insert_obj.id;

        // 完了
        const Lc = new LineBotSDK.Client({ channelAccessToken: AccessToken });
        Lc.pushMessage(LineUserId, { type: 'text', text: spchar(sptrim(nMessage)) });
        Lc.pushMessage(LineUserId, { type: 'text', text: spchar(sptrim(nMessage2)), "quickReply": QuickReplyTemplates.standby });
        return respons("[成功] 書き込み完了");

    } catch (e) {
        // エラー処理
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
        return respons(e);
    }

    function respons(message) {
        const Html = HtmlService.createTemplateFromFile("index.html");
        Html.statusStyle = "display: block";
        Html.statusMessage = message;
        Html.index = AppRootUrl;
        return Html.evaluate();
    }
}

function card_billing_regi(e) {
    // insert オブジェクト
    let insert_obj = {
        "id": "",
        "update": "",
        "card_name": "",
        "billing_total": "",
        "withdrawal_date": "",
        "comment": "",
        "status": ""
    }

    // 処理
    try {
        // 結果バインド
        const Formdata = {
            "カード": String(e.parameter.cardname),
            "請求金額": String(e.parameter.total),
            "コメント": String(e.parameter.cmnt),
            "引落日": e.parameter.date
        }

        let dd = new Date();
        insert_obj.update = dd;

        // id
        insert_obj.id = dd.getTime().toString(32).toUpperCase();

        // 利用日
        let a = Formdata.引落日.split("-"); // "YYYY-MM-DD"
        let ndd = new Date(new Date(a[0], Number(a[1]) - 1, a[2]).getTime() + 1000);
        insert_obj.withdrawal_date = ndd;

        // その他
        insert_obj.card_name = Formdata.カード;
        insert_obj.billing_total = Formdata.請求金額;
        insert_obj.comment = (Formdata.コメント == undefined) ? "" : Formdata.コメント;
        let ss = SpreadsheetApp.openById(BookId).getSheetByName("cardbilling.db");
        let lastrow = ss.getLastRow();
        insert_obj.status = `=IF($B${lastrow + 1}>TODAY(), "before", "after")`;

        // 書き込み
        let db = SpreadSheetsSQL.open(BookId, "cardbilling.db");
        db.insertRows([insert_obj]);

        let nMessage = "[通知]^カード請求情報登録が完了しました.";

        // 完了
        const Lc = new LineBotSDK.Client({ channelAccessToken: AccessToken });
        Lc.pushMessage(LineUserId, { type: 'text', text: spchar(sptrim(nMessage)), "quickReply": QuickReplyTemplates.standby });
        return respons("[成功] 書き込み完了");

    } catch (e) {
        // エラー処理
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
        return respons(e);
    }

    function respons(message) {
        const Html = HtmlService.createTemplateFromFile("index2.html");
        Html.statusStyle = "display: block";
        Html.statusMessage = message;
        Html.index = AppRootUrl;
        return Html.evaluate();
    }
}

