import { loadConfig } from "./src/utils/config.js";

const config = loadConfig();
console.log("Config loaded successfully:");
console.log(JSON.stringify(config, null, 2));
