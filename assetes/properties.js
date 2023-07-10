const BookId = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
const AccessToken = PropertiesService.getScriptProperties().getProperty("ACCESS_TOKEN");
const LineUserId = PropertiesService.getScriptProperties().getProperty("LINE_USER_ID");
const AppRootUrl = "https://script.google.com/macros/s/AKfycbxFj8Uq7DuaCl6AWXcGEsaJVyNBa5tFW3KuhE_yICp4QfP0lfT5mB3OtRrG2sZxmf4/exec";
Logger = BetterLog.useSpreadsheet("your-spread-sheet-id-for-logging");