/**
 * Play Store release hardening for Android:
 * - backup_rules.xml / data_extraction_rules.xml (exclude app files from cloud backup)
 * - fullBackupContent + dataExtractionRules on <application>
 *
 * Permissions trimmed via app.json `android.blockedPermissions`.
 */
const fs = require("node:fs");
const path = require("node:path");

const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require("@expo/config-plugins");

const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <!-- Auth tokens live in Android Keystore via expo-secure-store — not in app files. -->
  <!-- Exclude all app-private storage from Google Backup / device transfer. -->
  <exclude domain="root" />
  <exclude domain="file" />
  <exclude domain="database" />
  <exclude domain="sharedpref" />
  <exclude domain="external" />
</full-backup-content>
`;

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="root" />
    <exclude domain="file" />
    <exclude domain="database" />
    <exclude domain="sharedpref" />
    <exclude domain="external" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="root" />
    <exclude domain="file" />
    <exclude domain="database" />
    <exclude domain="sharedpref" />
    <exclude domain="external" />
  </device-transfer>
</data-extraction-rules>
`;

function writeXmlFiles(projectRoot) {
  const xmlDir = path.join(projectRoot, "android", "app", "src", "main", "res", "xml");
  fs.mkdirSync(xmlDir, { recursive: true });
  fs.writeFileSync(path.join(xmlDir, "backup_rules.xml"), BACKUP_RULES_XML, "utf8");
  fs.writeFileSync(path.join(xmlDir, "data_extraction_rules.xml"), DATA_EXTRACTION_RULES_XML, "utf8");
}

/** @param {import('@expo/config-plugins').ExpoConfig} config */
function withAndroidPlayRelease(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      writeXmlFiles(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    app.$["android:allowBackup"] = "true";
    app.$["android:fullBackupContent"] = "@xml/backup_rules";
    app.$["android:dataExtractionRules"] = "@xml/data_extraction_rules";
    return modConfig;
  });

  return config;
}

module.exports = withAndroidPlayRelease;
