const Weekchars = ["日", "月", "火", "水", "木", "金", "土"];

class LineNotification {
  constructor() {
    this.LineUserId = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
    this.AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
    this.Vwdb = new MyDbms("ccview.mydbms");
    this.Now = new Date();
    this.Ymd = this.Now.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
    this.LnClient = new LineBotSDK.Client({ channelAccessToken: this.AccessToken });
  };

  notification(trnsvalue, trnsshop, trnsdate) {
    const Vwdatas = {
      today_sum: parseInt(this.Vwdb.select("today-sum")[3]),
      balance_avg: parseInt(this.Vwdb.select("this-m-balance-avg")[3]),
      this_m_sum: parseInt(this.Vwdb.select("this-m-sum")[3]),
      this_m_balance: parseInt(this.Vwdb.select("this-m-balance")[3]),
      this_m_avg: parseInt(this.Vwdb.select("this-m-avg")[3])
    };
    const Options = { style: "currency", currency: 'JPY', currencySign: "accounting" };
    const Binds = [
      trnsvalue.toLocaleString(),  // 利用金額
      trnsshop, // 利用先
      trnsdate.slice(0, 10) + "_" + trnsdate.slice(10), // 利用日
      this.Ymd + "_－_" + Weekchars[this.Now.getDay()],  // yyyy/mm/dd - weekday
      Vwdatas.today_sum.toLocaleString("ja-JP", Options), // 本日合計
      (Vwdatas.balance_avg - Vwdatas.today_sum).toLocaleString("ja-JP", Options), // 本日残高　実績
      Vwdatas.balance_avg.toLocaleString("ja-JP", Options), // 本日残高　目標
      this.Ymd.slice(0, 7),  // yyyy/mm
      Vwdatas.this_m_sum.toLocaleString("ja-JP", Options), // 当月合計
      Vwdatas.this_m_balance.toLocaleString("ja-JP", Options), // 当月残高
      Vwdatas.this_m_avg.toLocaleString("ja-JP", Options), // 当月日数の日割金額
    ];
    let t = `
      [利用情報]^^
      利用金額:_${Binds[0]}^
      利用先!S:_${Binds[1]}^
      利用日!S:_${Binds[2]}^
      ―――――――――――――――――――^
      #_${Binds[3]}^
      本日^
      !S合計:_${Binds[4]}^
      !S残高:_${Binds[5]}_/_${Binds[6]}*^
      ―――――――――――――――――――^
      #_${Binds[7]}^
      当月^
      !S合計:_${Binds[8]}^
      !S残高:_${Binds[9]}^
      ―――――――――――――――――――^
      当月日数の日割金額:_${Binds[10]}^
      *当月残高の日割金額（本日含む）^
      >>_設定_|_記帳
    `;
    this.LnClient.pushMessage(this.LineUserId, { type: 'text', text: spchar(sptrim(t)), "quickReply": QuickReplyTemplates.standby });
  }
}
