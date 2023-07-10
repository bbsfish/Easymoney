class f2_writeout_manregi {
    constructor(){
      this.bookid = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
      this.db = SpreadSheetsSQL.open(this.bookid, "recordque.db");
    }
  
    getdata(){
      let r = this.db.select(["id", "update", "date","value","expense_for","data_type", "gnlc_symbol","written"]).filter("written = 0").result();
      if (r[0]==undefined)  return false;
      return r[0];
    }
  
    writeout(id="") {
      let r = this.db.select(["id", "update", "date","value","expense_for","data_type", "gnlc_symbol","written"]).filter(`id = ${id}`).result();
      r = r[0];
      if (r==undefined)  return false;
      if (r["written"]=="1")  return false;
      let ss = SpreadsheetApp.openById(this.bookid).getSheetByName("cardrecord.mydbms");
      let dd = new Date();;
      const id2 = dd.getTime().toString(32).toUpperCase();
      let arr = [ id2, r.update, r.date, r.value, r["expense_for"], r["data_type"], r["gnlc_symbol"] ];
      ss.appendRow(arr);
      this.db.updateRows({ written: "1", update: dd}).filter(`id = ${id}`);
      return true;
    }
  
    getunwriten() {
      let ss = SpreadsheetApp.openById(this.bookid).getSheetByName("recordque.db");
      return ss.getRange("K1").getValue();
    }
  }