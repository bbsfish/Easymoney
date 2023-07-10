class f1_user_data_update {
    constructor() {
        this.bookid = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
        this.db = SpreadSheetsSQL.open(this.bookid, "usrdata.db");
        this.template_group = [
            { name: "設定", id_list: ["card_limit", "todays_limit"] },
        ];
    }

    template(template_group_name = "") {
        for (let g of this.template_group) {
            if (g.name != template_group_name) continue;
            let arr = [];
            for (let id of g.id_list) {
                let row = this.db.select(["id", "key", "value"]).filter(`id = ${id}`).result();
                arr.push(
                    row[0].key + "=" + row[0].value
                );
            }
            return template_group_name + "::^" + arr.join("^");
        }
    }

    update(template_group_name = "", setting_text = "") { // template_group_name = "XXX", setting_text = "aaa=x^bbb=y"
        try {
            // let r = setting_text.match(/(?<=.+::).+/);
            // if (r == null) throw new Error("'::'が見つかりません");
            let setting_str = setting_text.replace(/\^/g, "\n"); // = "aaa=x\nbbb=y"
            let options = setting_str.match(/.+=.+/g); // = ["aaa=x", "bbb=y"]
            if (options == null) throw new Error("該当する設定キーが見つかりません");

            let changepoints = [];

            for (let g of this.template_group) {
                if (g.name != template_group_name) continue;

                for (let ops of options) {
                    let kv = ops.split("=");
                    for (let id of g.id_list) {
                        let row = this.db.select(["id", "key"]).filter(`id = ${id}`).result();
                        if (row[0].key != kv[0]) continue; // != "aaa"
                        let updatequery = { update: new Date(), value: kv[1] }; // value: "x"
                        this.db.updateRows(
                            updatequery,
                            `id = ${id}`
                        );
                        Logger.log("f1_user_data_update().update: UpdateRecords(%s) ; Filter(%s)", JSON.stringify(updatequery), `id = "${id}"`);
                        changepoints.push(row[0].key); // == "aaa"
                    }
                }
            }

            return changepoints;

        } catch (e) {
            Logger.log("f1_user_data_update().update: Error ; %s", e.message);
            return null;
        }
    }
}
