let fs = require("fs");

class IncomeUpdate {
    constructor() {
        this.URL = "http://localhost:8080";
        this.SOURCE_DIR = "./dist/main/";
        this.CONFIG_FILE = "incomeupdate_config.json";
        this.lastUpdateTimeSeconds = undefined;

        this.resources = {
            cred:{},
            tech:{},
            ideo:{},
        };

        fs.access(this.#getConfigFile(), () => {
            fs.readFile(this.#getConfigFile(), "utf-8", (err, data) => {
                if(err) {
                    window.granite.debug("Error in reading config for IncomeUpdate: " + err);
                }
                else {
                    try {
                        let config = JSON.parse(data);
                        this.URL = config.url ? config.url : this.URL;
                        this.sheetId = config.sheetId;

                        if(!this.sheetId) {
                            window.granite.debug("Need a Google Sheets ID.");
                        }
                    }
                    catch(err) {
                        window.granite.debug("Error in parsing config for IncomeUpdate: " + err);
                    }
                }
            });
        });

        setInterval(this.#regularUpdate, 60_000);
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
        // sheets with non-legacy stuff.
        if(window.gamestate.game.time.speed !== "slow")
            return;

        if(this.lastUpdateTimeSeconds === undefined) {
            this.lastUpdateTimeSeconds = IncomeUpdate.#getCurrentTimeSeconds();
        }

        let income = data.player_player;

        this.resources.cred = income.credit;
        this.resources.tech = income.technology;
        this.resources.ideo = income.ideology;

        this.#calcResourceTotals(IncomeUpdate.#getCurrentTimeSeconds());
    }

    #getCurrentTimeSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    #regularUpdate() {
        if(this.lastUpdateTimeSeconds) {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.URL + "/income_update");
            xhr.timeout = 2000;
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify(
                    {
                        "income": this.resources,
                        "instance": window.gamestate.game.auth.instance,
                        "sheet": this.sheetId
                    }
                )
            );
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

window.granite.addHookListener(new IncomeUpdate());