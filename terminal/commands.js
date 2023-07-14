const commands = [
    // ----- 設定
    {
        callname: "設定",
        calling: function (book_id = "") {
            const Mydb = new MyDbms(book_id, "usrdata.db");
            const Ids = ["card_limit", "todays_limit"];
            let arr = Ids.map((v) => {
                let r = Mydb.select(v);
                return r[2] + "=" + r[3]
            });
            let message = "設定::^" + arr.join("^");
            return {
                lineNotification: {
                    flag: true,
                    message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                },
                text: ""
            }
        },
        execute: function (book_id = "", arg = "") {   // arg = "aaa=x\n bbb=y"
            const Mydb = new MyDbms(book_id, "usrdata.db");
            const Ids = ["card_limit", "todays_limit"];
            const MyStr = new MyString();
            let options = MyStr.sptrim(arg).match(/.+=.+/g); // = ["aaa=x", "bbb=y"]
            if (options == null) throw new Error("該当する設定キーが見つかりません");
            let opsKeys = [];
            let opsValues = [];
            for (let ops of options) {
                let kv = ops.split("=");
                if (kv.length != 2 || kv[1] == "" || kv[1] === undefined) continue;
                opsKeys.push(kv[0]);
                opsValues.push(kv[1]);
            }
            let changepoints = [];
            for (let id of Ids) {
                let r = Mydb.select(id);
                let i = opsKeys.indexOf(r[2]);
                if (i == -1) continue;
                let newArr = [r[2], opsValues[i]];
                if (Mydb.update(id, newArr)) {
                    changepoints.push(r[2]);
                    Logger.log("commands.execute: Update data (%s)", JSON.stringify(newArr));
                }
            }
            let message = (changepoints[0] == "")
                ? `[通知]^変更された設定はありません.`
                : `[通知]^設定が変更されました.^変更:^_` + changepoints.join(", ");
            return {
                lineNotification: {
                    flag: true,
                    message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                },
                text: ""
            }
        }
    },
    // ----- 記帳
    {
        callname: "記帳",
        calling: function (book_id = "") {
            const Rcq = SpreadSheetsSQL.open(book_id, "recordque.db");
            let r = Rcq.select(["id", "update", "date", "value", "shop", "data_type", "expense_for",
                "comment", "gnlc_symbol", "written"]).filter("written = 0").result();
            if (r[0] == undefined) {
                let message = `[通知]^書き込み待ちのデータはありません.`;
                return {
                    lineNotification: {
                        flag: true,
                        message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                    },
                    text: ""
                }
            } else {
                let ss = SpreadsheetApp.openById(book_id).getSheetByName("recordque.db");
                let n = ss.getRange("M1").getValue();
                let binds = [
                    Utilities.formatDate(r[0].update, "Asia/Tokyo", "yyyy/MM/dd_kk:mm:ss"),
                    Utilities.formatDate(r[0].date, "Asia/Tokyo", "yyyy/MM/dd_kk:mm:ss"),
                    r[0].value,
                    r[0].expense_for,
                    r[0].comment,
                    quedata["data_type"]
                ];
                let message = `
                    [記帳]^書き込み待ちのデータが${n}件あります.^
                    ―――――――――――――――――――^
                    #_登録日時:_${binds[0]}^日付!S!S:_${binds[1]}^
                    利用金額:_${binds[2]}^費目!S!S:_${binds[3]}^
                    コメント:_${binds[4]}^支払方法:_${binds[5]}^
                    ―――――――――――――――――――^
                    このデータを書き込みます.^
                    >>_書込_|_修正_|_キャンセル
                `;
                const Mydb = new MyDbms(book_id, "usrdata.db");
                Mydb.update("terminal_status", ["ターミナル状態", r[0].id]);
                return {
                    lineNotification: {
                        flag: true,
                        message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.confirm }
                    },
                    text: ""
                }
            }
        },
        execute: function (book_id = "", arg = "") {
            const Mydb = new MyDbms(book_id, "usrdata.db");
            if (arg == "書込") {
                let ready_id = Mydb.select("terminal_status");
                const Rcq = SpreadSheetsSQL.open(book_id, "recordque.db");
                let r = Rcq.select(["id", "update", "date", "value", "shop", "data_type", "expense_for",
                    "comment", "gnlc_symbol", "written"]).filter(`id = ${ready_id}`).result();
                r = r[0];
                try {
                    if (r == undefined) throw new Error("レコードキューに該当するデータがありません.");
                    if (r["written"] == "1") throw new Error("書込済みのデータです. '記帳'を実行してください.");
                    const Ss = SpreadsheetApp.openById(book_id).getSheetByName("records.db");
                    let dd = new Date();
                    const id2 = dd.getTime().toString(32).toUpperCase();
                    let arr = [id2, dd, r.date, r.value, r.shop, r.data_type, r.expense_for,
                        r.comment, r.gnlc_symbol];
                    Ss.appendRow(arr);
                    Rcq.updateRows({ written: "1", update: dd }).filter(`id = ${ready_id}`);
                    const Ss2 = SpreadsheetApp.openById(book_id).getSheetByName("recordque.db");
                    let n = ss.getRange("M1").getValue();
                    let message = (n > 0)
                        ? `[通知]^記帳されました.(${ready_id})^*_書き込み待ちのデータが残っています.`
                        : `[通知]^記帳されました.(${ready_id})^*_書き込み待ちのデータはありません.`;
                    return {
                        lineNotification: {
                            flag: true,
                            message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                        },
                        text: ""
                    }
                } catch (error) {
                    let message = `[通知]^記帳されませんでした.`;
                    return {
                        lineNotification: {
                            flag: true,
                            message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                        },
                        text: ""
                    }
                }
            }
            if (arg == "キャンセル") {
                Mydb.update("terminal_status", ["ターミナル状態", ""]);
                const Ss3= SpreadsheetApp.openById(book_id).getSheetByName("recordque.db");
                let n = Ss3.getRange("M1").getValue();
                let message = (n > 0)
                    ? `[通知]^キャンセルされました.^*_書き込み待ちのデータが${n}件残っています.`
                    : `[通知]^キャンセルされました.^*_書き込み待ちのデータはありません.`;
                return {
                    lineNotification: {
                        flag: true,
                        message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                    },
                    text: ""
                }
            }
            if (arg == "修正") {
                let ready_id = Mydb.select("terminal_status");
                let message = `[通知]^編集してください.^ID = ${ready_id}^https://docs.google.com/spreadsheets/d/1wq5ziUHNjOtoVx5YSLeV8vpnGdenMic6B16uv0e-FrE/edit#gid=1928129199`;
                return {
                    lineNotification: {
                        flag: true,
                        message: { type: 'text', text: spchar(message), "quickReply": QuickReplyTemplates.standby }
                    },
                    text: ""
                }
            }
        }
    }
];