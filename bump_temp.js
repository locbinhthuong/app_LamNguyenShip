const fs = require('fs');
const pkgPath = 'driver-app/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const parts = pkg.version.split('.');
parts[2] = parseInt(parts[2]) + 1;
const newVersion = parts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

const buildGradlePath = 'driver-app/android/app/build.gradle';
if (fs.existsSync(buildGradlePath)) {
  let gradle = fs.readFileSync(buildGradlePath, 'utf8');
  gradle = gradle.replace(/versionName "[^"]+"/, "versionName \"" + newVersion + "\"");
  gradle = gradle.replace(/versionCode (\d+)/, (match, p1) => "versionCode " + (parseInt(p1) + 1));
  fs.writeFileSync(buildGradlePath, gradle);
}

const pbxprojPath = 'driver-app/ios/App/App.xcodeproj/project.pbxproj';
if (fs.existsSync(pbxprojPath)) {
  let pbx = fs.readFileSync(pbxprojPath, 'utf8');
  pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, "MARKETING_VERSION = " + newVersion + ";");
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION = (\d+);/g, (match, p1) => "CURRENT_PROJECT_VERSION = " + (parseInt(p1) + 1) + ";");
  fs.writeFileSync(pbxprojPath, pbx);
}

console.log('Bumped driver-app to ' + newVersion);
