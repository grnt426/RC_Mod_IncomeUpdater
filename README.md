Income Updater Mod
==================
This mod exports income data from the game and dumps it into a Google spreadsheet. This allows for easy forecasting
of incomes, planning expenses, and more.

Setup
=====
1) Give edit permissions to `rc-receiver-uploader@aerobic-furnace-343101.iam.gserviceaccount.com` to your Google sheet
by clicking the share button and putting in the above email. 

3) You MUST create a file named `incomeupdate_config.json` in the `SteamLibrary/Rising Constellation/dist/main/` directory.
This file should have a structure similar to that of the `example_incomeupdate_config.json` file, which should look like
this.

```json
{
  "url": "https://rc-mod-api.com",
  "sheetId": "find_me_in_the_url_of_the_sheets_page_very_long",
  "cell_locations": {
    "income_total": "B2",
    "income_rate": "B3",

    "tech_total": "C2",
    "tech_rate": "C3",

    "ideo_total": "D2",
    "ideo_rate": "D3"
  }
}
```

You can find the `sheetId` by looking at the URL of the Google Sheet in your browser, it should look something like this:

docs.google.com/spreadsheets/d/**VERY_LONG_STRING_OF_LETTERS_AND_NUMBERS_THIS_IS_IT_THE_WHOLE_THING**/edit#gid=0

Where the bolded part is the ENTIRE ID you will need to past into the `incomeupdate_config.json` file you created.

3) [Optional] You can also change where the income values are written to by changing the cell IDs.
4) You're done!