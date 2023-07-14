function doPost(e) {
    const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
    const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    Logger = BetterLog.useSpreadsheet(BookId);
    const MyStr = new MyString();

    try {
        if (e == undefined) throw new Error("doPost().Err: 空の e オブジェクト");
        Logger.log("doPost().GetPOST: %s", e);
        const Event = JSON.parse(e.postData.contents).events[0];
        if (Event.message.type != "text") throw new Error("doPost().Err: 未対応のイベントタイプ");
        const Lc = new LineBotSDK.Client({ channelAccessToken: AccessToken });
        
        let m = Event.message.text.match(/^.+(?=::)/);
        if (m==null) { // m = "{CALLNAME}"
            let s = MyStr.sptrim(Event.message.text);
            for (const c of commands) {
                if (c.callname!=s) continue;
                let res = c.calling(BookId);
                if (res.lineNotification.flag) {
                    Lc.replyMessage(Event.replyToken, [res.lineNotification.message]);
                }
                break;
            }
            return;
        } else { // m = "{CALLNAME}::{ARG}"
            let arr = Event.message.text.split("::");
            if (arr.length!=2 || arr[0]===undefined | arr[0]=="") return;
            let s = MyStr.sptrim(arr[0]);
            for (const c of commands) {
                if (c.callname!=s) continue;
                let res = c.execute(BookId, MyStr.sptrim(arr[1]));
                if (res.lineNotification.flag) {
                    Lc.replyMessage(Event.replyToken, [res.lineNotification.message]);
                }
                break;
            }
            return;
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