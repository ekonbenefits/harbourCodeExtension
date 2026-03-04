const fs = require("fs");
const path = require("path");

const buildNumber = process.argv[2];
if (!buildNumber) {
  console.error("Missing build number. Usage: node set-build-version.js <buildNumber>");
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Remove a previous CI build suffix so repeated runs stay stable.
const baseVersion = String(packageJson.version).replace(/-build\..*$/, "");
packageJson.version = `${baseVersion}-build.${buildNumber}`;

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
console.log(`Updated extension version: ${packageJson.version}`);
