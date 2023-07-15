const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
const LineUserId = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
Logger = BetterLog.useSpreadsheet(BookId);
const AppRootUrl = "https://script.google.com/macros/s/AKfycbxFj8Uq7DuaCl6AWXcGEsaJVyNBa5tFW3KuhE_yICp4QfP0lfT5mB3OtRrG2sZxmf4/exec";

// Preview HTML
const HtmlFiles = [
    {
        // default
        pg: "", file: "index.html",
        parameters: {
            statusStyle: "display: none",
            statusMessage: "",
            index: AppRootUrl
        }
    },
    {
        pg: 2, file: "index2.html",
        parameters: {
            statusStyle: "display: none",
            statusMessage: "",
            index: AppRootUrl,
            cardbillingtables: function () {
                const Mydb = new MyDbms(BookId, "ccview.mydbms");
                const Cbdb = SpreadSheetsSQL.open(BookId, "cardbilling.db");
                const serialv = Mydb.select("serialv-50");
                const data = Cbdb.select(
                    ["card_name", "billing_total", "withdrawal_date", "comment", "status"]
                ).filter("withdrawal_date > " + serialv[3]).orderBy(["withdrawal_date"]).result();
                if (!data.length) return `<p class="notion">データはありません</p>`;
                let tableArr = data.map((d) => {
                    return `<table><thead><tr><th colspan='2'>${d.card_name}</th></tr><tr><th width='180px'></th><th width='270px'></th></tr></thead>
                        <tbody> <tr><th>請求金額</th><td class='cell-y'>${Number(d.billing_total).toLocaleString()}</td></tr>
                        <tr><th>引落日</th><td>${new Date(d.withdrawal_date).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}</td></tr>
                        <tr><th>コメント</th><td>${d.comment}</td></tr> </tbody></table>`;
                });
                return tableArr.join("");
            }
        }
    }
];

function doGet(e) {
    try {
        if (e === undefined) throw new Error("e is undefined");

        let pg = e.parameter["pg"];
        let hf = (pg === undefined)
            ? HtmlFiles[0] // no "pg" parameter
            : (function (pg) {
                for (let hf of HtmlFiles) {
                    if (hf.pg == pg) return hf;
                }
                return HtmlFiles[0];
            })(pg);
        let html = HtmlService.createTemplateFromFile(hf.file);
        for (let prmkey in hf.parameters) {
            if (typeof hf.parameters[prmkey] == "function") {
                html[prmkey] = hf.parameters[prmkey]();
            } else {
                html[prmkey] = hf.parameters[prmkey];
            }
        }
        return html.evaluate();
    } catch (e) {
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
    }
}

function doPost(e) {
    try {
        if (e === undefined) throw new Error("e is undefined");
        Logger.log("doPost().GetPOST: %s", e);
        const Lc = new LineBotSDK.Client({ channelAccessToken: AccessToken });
        const Funcs = new FnContainer(BookId, e);
        let r = null;
        switch (String(e.parameters.datatype)) {
            case "card_billing_regi":
                r = Funcs.f1();
                break;
            case "registration":
                r = Funcs.f0();
                break;

            default:
                break;
        }
        if (r==null) throw new Error("r is null");
        if (r.lineNotification.flag) {
            Lc.pushMessage(LineUserId, r.lineNotification.message);
        } else {

        }

        const Html = HtmlService.createTemplateFromFile(r.redirect);
        Html.statusStyle = "display: block";
        Html.statusMessage = r.statusMessage;
        Html.index = AppRootUrl;
        return Html.evaluate();
    } catch (error) {
        error = (typeof error === "string") ? new Error(error) : error;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            error.name || "", error.message || "", error.lineNumber || "", error.fileName || "", error.stack || ""
        );
    }
}

class FnContainer {
    constructor(book_id, e) {
        this.BookId = book_id;
        this.Eprm = e;
    }
    f1() {
        let e = this.Eprm;
        try {
            const MyStr = new MyString();
            const Cbdb = SpreadSheetsSQL.open(this.BookId, "cardbilling.db");
            const Ss = SpreadsheetApp.openById(this.BookId).getSheetByName("cardbilling.db");
            const Dt = new Date();
            const Formdata = {
                カード: String(e.parameter.cardname), 請求金額: String(e.parameter.total),
                コメント: String(e.parameter.cmnt), 引落日: e.parameter.date
            }
            let inserts = {
                id: Dt.getTime().toString(32).toUpperCase(),
                update: Dt,
                card_name: Formdata.カード,
                billing_total: Formdata.請求金額,
                comment: (Formdata.コメント == undefined) ? "" : Formdata.コメント,
                withdrawal_date: "",
                status: ""
            }

            // 利用日 withdrawal_date
            inserts.withdrawal_date = (function () {
                let a = Formdata.引落日.split("-"); // "YYYY-MM-DD"
                let ndd = new Date(new Date(a[0], Number(a[1]) - 1, a[2]).getTime() + 1000);
                return ndd;
            })();

            // ステータス status
            inserts.status = (function () {
                let lastrow = Ss.getLastRow();
                return `=IF($B${lastrow + 1}>TODAY(), "before", "after")`;
            })();

            // 書き込み
            Cbdb.insertRows([inserts]);

            let message = "[通知]^カード請求情報登録が完了しました.";

            return {
                lineNotification: {
                    flag: true,
                    message: { type: 'text', text: MyStr.spchars(MyStr.sptrim(message)), "quickReply": QuickReplyTemplates.standby }
                },
                statusMessage: "[成功] 書き込み完了",
                redirect: "index2.html"
            }
        } catch (error) {
            // エラー処理
            error = (typeof error === "string") ? new Error(error) : error;
            Logger.severe(
                "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
                error.name || "", error.message || "", error.lineNumber || "", error.fileName || "", error.stack || ""
            );
            return {
                lineNotification: {
                    flag: false,
                    message: {}
                },
                statusMessage: error.message,
                redirect: "index2.html"
            }
        }
    }
    f0() {
        let e = this.Eprm;
        try {
            const MyStr = new MyString();
            const Rcdb = SpreadSheetsSQL.open(this.BookId, "recordque.db");
            const Ss = SpreadsheetApp.openById(this.BookId).getSheetByName("recordque.db");
            const Dt = new Date();
            const Formdata = {
                支払金額: Number(e.parameters.total[0]),    費目: String(e.parameters.expense_item),
                コメント: String(e.parameters.cmnt),
                日付: {
                    // "日付" は空でも存在。あとは、選択されたものだけが存在、値は キー: ["on"]
                    今日: e.parameters.date_today,
                    昨日: e.parameters.date_yest,
                    指定: e.parameters.date_manual,
                    日付: e.parameters.date // -> ["yyyy-MM-dd"]
                },
                支払方法: String(e.parameters.payway),
                データタイプ: String(e.parameters.datatype)
            }
            let inserts = {
                id: Dt.getTime().toString(32).toUpperCase(),
                update: Dt,
                date: "",
                value: Formdata.支払金額,
                shop: "",
                data_type: Formdata.支払方法,
                expense_for: Formdata.費目,
                comment: Formdata.コメント,
                gnlc_symbol: "M",
                written: "0"
            }

            // 利用日 date
            inserts.date = (function(){
                if (Formdata.日付.今日 !== undefined) return Dt;
                else if (Formdata.日付.昨日 !== undefined) {
                    return new Date(new Date(Dt.getFullYear(), Dt.getMonth(), Dt.getDate() - 1).getTime() + 1000);
                }
                else {
                    let a = Formdata.日付.日付[0].split("-"); // "YYYY-MM-DD"
                    return new Date(new Date(a[0], Number(a[1]) - 1, a[2]).getTime() + 1000);
                }
            })();

            // 書き込み
            Rcdb.insertRows([inserts]);

            // unwrittenチェック
            let n = Ss.getRange("M1").getValue();
            let message = `[通知]^情報登録が完了しました.(${inserts.id})`;
            message += (n > 0) ? `^*_書込待ちのデータが${n}件あります.` : "^*_書込待ちのデータはありません.";
            
            return {
                lineNotification: {
                    flag: true,
                    message: { type: 'text', text: MyStr.spchars(MyStr.sptrim(message)), "quickReply": QuickReplyTemplates.standby }
                },
                statusMessage: "[成功] 書き込み完了",
                redirect: "index.html"
            }

        } catch (error) {
            error = (typeof error === "string") ? new Error(error) : error;
            Logger.severe(
                "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
                error.name || "", error.message || "", error.lineNumber || "", error.fileName || "", error.stack || ""
            );
            return {
                lineNotification: {
                    flag: false,
                    message: {}
                },
                statusMessage: error.message,
                redirect: "index.html"
            }
        }
    }
}