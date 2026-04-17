const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Resolve all modules from app-local node_modules first, then workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force native/React packages to always resolve from the app's own node_modules.
// This prevents the monorepo root's newer (incompatible) versions from being
// bundled alongside the app-local versions, which causes duplicate-view errors.
const nativePackages = [
  "react",
  "react-native",
  "react-native-safe-area-context",
  "react-native-screens",
];

config.resolver.extraNodeModules = nativePackages.reduce((acc, pkg) => {
  acc[pkg] = path.resolve(projectRoot, "node_modules", pkg);
  return acc;
}, config.resolver.extraNodeModules || {});

// Block root-level copies of those packages from being transformed.
// Even though extraNodeModules redirects imports, Metro may still traverse
// root-level transitive dependencies that import their own copies.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const blockPatterns = nativePackages.map((pkg) => {
  const pkgPath = path.resolve(workspaceRoot, "node_modules", pkg);
  return new RegExp(`^${escapeRegex(pkgPath)}${path.sep === "\\" ? "\\\\" : "/"}.*`);
});

config.resolver.blockList = blockPatterns;

config.watchFolders = [workspaceRoot];

module.exports = config;
