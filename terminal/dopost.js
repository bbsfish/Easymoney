Logger = BetterLog.useSpreadsheet("your-spread-sheet-id-for-logging");

function doPost(e) {
    const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
    const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    try {
        Logger.log("doPost().GetPOST: %s", e);
        if (e == undefined) throw new Error("doPost().Err: 空の e オブジェクト");

        const event = JSON.parse(e.postData.contents).events[0];
        if (event.message.type != "text") throw new Error("doPost().Err: 未対応のイベントタイプ");
        const Posttext = event.message.text; // 受信メッセージ
        const replytoken = event.replyToken;
        const lc = new LineBotSDK.Client({ channelAccessToken: AccessToken });
        let nMessage = ""; // 返信テキスト

        if (Posttext == "設定") {
            let func = new f1_user_data_update();
            nMessage = func.template("設定");
            nMessage = spchar(nMessage);
            lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
        }

        if (Posttext == "記帳") {
            let func = new f2_writeout_manregi();
            let quedata = func.getdata();
            if (quedata === false) {
                nMessage = `[通知]^書き込み待ちのデータはありません.`;
                nMessage = spchar(nMessage);
                lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
            } else {
                let p = quedata["expense_for"].split(":");
                let n = func.getunwriten();
                let binds = [
                    Utilities.formatDate(quedata.update, "Asia/Tokyo", "yyyy/MM/dd_kk:mm:ss"),
                    Utilities.formatDate(quedata.date, "Asia/Tokyo", "yyyy/MM/dd_kk:mm:ss"),
                    quedata.value,
                    p[0],
                    p[1],
                    quedata["data_type"]
                ];
                nMessage = `
            [記帳]^書き込み待ちのデータが`+ n + `件あります.^
            ―――――――――――――――――――^
            #_登録日時:_${binds[0]}^
            日付!S!S:_${binds[1]}^
            利用金額:_${binds[2]}^
            費目!S!S:_${binds[3]}^
            コメント:_${binds[4]}^
            支払方法:_${binds[5]}^
            ―――――――――――――――――――^
            このデータを書き込みます.^
            >>_書込_|_修正_|_キャンセル
          `;
                let db = SpreadSheetsSQL.open(BookId, "usrdata.db");
                db.updateRows({ value: quedata.id, update: new Date() }, "id = terminal_status");
                nMessage = spchar(sptrim(nMessage));
                lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.confirm }]);
            }
        }

        if (Posttext == "書込") {
            let db = SpreadSheetsSQL.open(BookId, "usrdata.db");
            let udata = db.select(["id", "value"]).filter("id = terminal_status").result();
            let func = new f2_writeout_manregi();
            let r = func.writeout(udata[0].value);
            if (r) {
                let n = func.getunwriten();
                if (n > 0) {
                    nMessage = `[通知]^記帳されました.^*_書き込み待ちのデータが残っています.`;
                } else {
                    nMessage = `[通知]^記帳されました.^*_書き込み待ちのデータはありません.`;
                }
            } else {
                nMessage = `[通知]^記帳されませんでした.`;
            }
            nMessage = spchar(sptrim(nMessage));
            lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
        }

        if (Posttext == "キャンセル") {
            let db = SpreadSheetsSQL.open(BookId, "usrdata.db");
            db.updateRows({ value: "", update: new Date() }, "id = terminal_status");
            nMessage = `[通知]^キャンセルされました.`;
            nMessage = spchar(sptrim(nMessage));
            lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
        }

        if (Posttext == "修正") {
            let db = SpreadSheetsSQL.open(BookId, "usrdata.db");
            let udata = db.select(["id", "value"]).filter("id = terminal_status").result();
            nMessage = `[通知]^編集してください.^ID = ${udata[0].value}^https://docs.google.com/spreadsheets/d/1wq5ziUHNjOtoVx5YSLeV8vpnGdenMic6B16uv0e-FrE/edit#gid=1928129199`;
            nMessage = spchar(sptrim(nMessage));
            lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
        }

        let Command = (function (str) { // return null | String "" ; str: "XXX::\n AAA=aaa\n BBB=bb"
            let s = str.split("::");
            if (s.length == 1) return null;
            return { hdr: s[0].trim(), arg: rpeol(s[1]) }
        })(Posttext)

        if (Command == null) return;

        if (Command.hdr == "設定") {
            let func = new f1_user_data_update();
            let changepoints = func.update("設定", Command.arg);
            if (changepoints == null) {
                nMessage = `[通知]^変更された設定はありません.`;
            } else {
                nMessage = `[通知]^設定が変更されました.^変更:^_` + changepoints.join(", ");
            }
            nMessage = spchar(nMessage);
            lc.replyMessage(replytoken, [{ type: 'text', text: nMessage, "quickReply": QuickReplyTemplates.standby }]);
        }



    } catch (e) {
        e = (typeof e === "string") ? new Error(e) : e;
        Logger.severe(
            "%s: %s (line %s, file \"%s\"). Stack: \"%s\"",
            e.name || "", e.message || "", e.lineNumber || "", e.fileName || "", e.stack || ""
        );
        throw e;
    }
}