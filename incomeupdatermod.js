let fs = require("fs");

class IncomeUpdate {
    constructor() {
        this.URL = "http://localhost:8080";
        this.SOURCE_DIR = "./dist/main/";
        this.CONFIG_FILE = "incomeupdate_config.json";
        this.lastUpdateTimeSeconds = undefined;
        this.failures = 0;
        this.name = "Income Update Mod";

        this.resources = {
            cred:{},
            tech:{},
            ideo:{},
        };

        // These are the default write locations for resources; as used by this example sheet:
        // https://docs.google.com/spreadsheets/d/15odMYjnZIDRx05W-11griZDN72sZKVwkLC0jGRKYvC0/edit#gid=0
        this.cellsForResources = {
            "income_total": "B2",
            "income_rate": "B3",

            "tech_total": "C2",
            "tech_rate": "C3",

            "ideo_total": "D2",
            "ideo_rate": "D3"
        };

        fs.access(this.#getConfigFile(), () => {
            fs.readFile(this.#getConfigFile(), "utf-8", (err, data) => {
                if(err) {
                    window.granite.debug(
                        "Error in reading config for IncomeUpdate: " + err,
                        window.granite.levels.ERROR
                    );
                }
                else {
                    try {
                        let config = JSON.parse(data);
                        this.URL = config.url ? config.url : this.URL;


                        if(config.sheetId) {
                            this.sheetId = config.sheetId;
                        }
                        else {
                            window.granite.debug("Need a Google Sheets ID.", window.granite.levels.ERROR);
                        }

                        if(config.cell_locations) {
                            this.cellsForResources = config.cell_locations;
                        }
                    }
                    catch(err) {
                        window.granite.debug(
                            "Error in parsing config for IncomeUpdate: " + err,
                            window.granite.levels.ERROR
                        );
                    }
                }
            });
        });

        this.regularUpdateInterval = setInterval(this.#regularUpdate.bind(this), 30_000);
    }

    #getConfigFile() {
        return this.SOURCE_DIR + this.CONFIG_FILE;
    }

    /**
     * When the player does something to change their total income values or income rate, this is called.
     * We will update the projected income totals with these new values and build future projections on this data.
     * @param data  expecting a player_player object.
     */
    update(data) {

        // Ignore updates that aren't player updates, as they don't have income information.
        if(!data.player_player)
            return;

        // Ignore non-legacy games for now. This prevents players who play legacy from overwriting their
        // sheets with non-legacy stuff if they switch around.
        if(window.gamestate.game.time.speed !== "slow")
            return;

        if(this.lastUpdateTimeSeconds === undefined) {
            this.lastUpdateTimeSeconds = this.#getCurrentTimeSeconds();
        }

        let income = data.player_player;

        this.resources.cred = income.credit;
        this.resources.tech = income.technology;
        this.resources.ideo = income.ideology;

        this.#calcResourceTotals(this.#getCurrentTimeSeconds());
    }

    #getCurrentTimeSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    #regularUpdate() {

        console.log("Update entered: " + this.lastUpdateTimeSeconds);

        // We have a very simple guard against too many failures from our server. This prevents excessive calls that
        // we know will fail anyway. This can be improved, but it should prevent really dumb situations for now.
        if(this.lastUpdateTimeSeconds && this.failures < 100) {
            window.granite.debug("Updating totals.", window.granite.levels.DEBUG);
            this.#calcResourceTotals(this.#getCurrentTimeSeconds());
            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.URL + "/income_update");
            xhr.timeout = 2000;
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify(
                    {
                        "resources": this.resources,
                        "cell_locations": this.cellsForResources,
                        "instance": window.gamestate.game.auth.instance,
                        "sheet": this.sheetId
                    }
                )
            );

            xhr.onreadystatechange = () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    window.granite.debug("Response.", window.granite.levels.DEBUG);
                    if(xhr.status !== 200) {
                        let resp = xhr.responseText;
                        window.granite.debug(
                            "Issue in sending income to API: " + resp + " | Status: " + xhr.statusText,
                            window.granite.levels.ERROR
                        );
                        this.failures += 1;
                    }
                    else {
                        window.granite.debug("Successfully updated income", window.granite.levels.DEBUG);
                    }
                }
            }
        }
    }

    /**
     * Given the `curTime`, will compute the new estimated total for resources this player should have.
     * The time passed in will be stored and used for a subsequent call to this function.
     *
     * @param curTime   The time in seconds since Epoch.
     */
    #calcResourceTotals(curTime) {
        let delta = curTime - this.lastUpdateTimeSeconds;
        if(delta > 0) {
            Object.values(this.resources).forEach(r => {

                // change represents income per 3 minutes, which is 1000ms * 60 s * 3min
                r.value += r.change * (delta / 60 / 3);
            });
        }

        this.lastUpdateTimeSeconds = curTime;
    }
}

console.addHookListener(new IncomeUpdate());