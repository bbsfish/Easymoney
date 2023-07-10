# 必要ライブラリ
1. BetterLog
    - スクリプトID: "1DSyxam1ceq72bMHsE6aOVeOl94X78WCwiYPytKi7chlg4x5GqiNXSw0l"
    - ドキュメント: "https://github.com/peterherrmann/BetterLog"
2. spreadsheets-sql
    - スクリプトID: "17p1ghyOkbWOhdE4bdBFhOXL079I-yt5xd0LAi00Zs5N-bUzpQtN7iT1a"
    - ドキュメント: "https://github.com/roana0229/spreadsheets-sql"
3. LineBotSDK
    - スクリプトID: "1EvYoqrPLkKgsV8FDgSjnHjW1jLp3asOSfDGEtLFO86pPSIm9PbuCQU7b"
    - ドキュメント: "https://qiita.com/kobanyan/items/1a590cda9deb85e86296"

# Spread Sheet Property設定
設定プロパティ: "SPREAD_SHEET_ID", "ACCESS_TOKEN", "LINE_USER_ID"
- "SPREAD_SHEET_ID" :
- "ACCESS_TOKEN"    : 
- "LINE_USER_ID"    : 

# 設定
設定ファイル: "properties.js"
- "AppRootUrl": デプロイしたGASアプリケーションのURL * 主にhttp/index*のform.actionの値に利用される
- "your-spread-sheet-id-for-logging" -> Loggerでログを書き込むスプレッドシートのＩＤを格納。初回記録時に"Log"という名前のシートが生成される

# 必要なスプレッドシートのシート
以下は全てSpread Sheet Property > SPREAD_SHEET_IDのスプレッドシート（BOOK）に作成すること
1. "cardbilling.db" シート : カード請求情報を記録していく
- [id   update  card_name   billing_total   withdrawal_date comment status] とA1からG1に記述
2. "records.db" シート : 決済情報を記録していく
- [id	update	date	value	shop	data_type	expense_for	comment	gnlc_symbol] とA1からI1に記述
3. "recordque.db" シート : 手動登録のデータを一時記録していく
- [id	update	date	value	shop	data_type	expense_for	comment	gnlc_symbol	written] とA1からJ1に記述
- M2に"=COUNTIF(J:J, "=0")"
4. "ccview.mydbms" シート : スプレッドシート上で計算すべきデータを格納.
- ID	更新日時	概要    値
- today		本日    =TODAY()
- today-count		本日取引数  =COUNTIFS(records.db!C:C, ">="&$D$2, records.db!C:C, "<="&($D$2+0.99999))
- today-sum		本日合計    =SUMIFS(records.db!D:D, records.db!C:C, ">="&$D$2, records.db!C:C, "<="&($D$2+0.99999))
- before-m-first-d		前月始日    =EOMONTH($D$2, -2)+1
- before-m-last-d		前月締日    =EOMONTH($D$2, -1)+0.99999
- before-m-days		前月日数    =DAY(D6)
- before-m-count		前月取引数  =COUNTIFS(records.db!C:C, ">="&D5, records.db!C:C, "<="&D6)
- before-m-sum		前月合計    =SUMIFS(records.db!D:D, records.db!C:C, ">="&D5, records.db!C:C, "<="&D6)
- this-m-first-d		当月始日    =EOMONTH($D$2, -1)+1
- this-m-last-d		当月締日    =EOMONTH($D$2,0)+0.99999
- this-m-days		当月日数    =DAY(D11)
- this-m-count		当月取引数  =COUNTIFS(records.db!C:C, ">="&D10, records.db!C:C, "<="&D11)
- this-m-sum		当月合計    =SUMIFS(records.db!D:D, records.db!C:C, ">="&D10, records.db!C:C, "<="&D11)
- this-m-limit		当月上限値  =XLOOKUP("card_limit", usrdata.db!A:A, usrdata.db!D:D, 0, 0)
- this-m-avg		当月日数の日割金額  =D15/D12
- this-m-balance		当月残高    =D15-D14
- this-m-balance-avg		当月残高の日割金額（本日含む）  =IF(D17<0, 0, D17/(D12-DAY($D$2)+1))
- serialv-20		20日前のシリアル値  =VALUE(D2-20)
- serialv-50		50日前のシリアル値  =VALUE(D2-50)
5. "usrdata.db" シート : ユーザー固有の値を格納（.dbだが、mydbms形式）
- id	update	key	value
- card_limit		当月上限値	50000
- todays_limit		推奨当日限度額	413
- budget		当月総予算	
- fixed_cost		固定費-現金	
- terminal_status		ターミナル状態	


# デプロイ
- check_mail/check_new_mail.js/checkNewMailv3()を1分ごとに実行
