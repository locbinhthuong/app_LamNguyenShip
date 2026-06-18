const fs = require('fs');

function bump(path, regex, replacement) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log(`Bumped ${path}`);
  } else {
    console.log(`File not found: ${path}`);
  }
}

// Customer app
bump('c:/app_LamNguyenShip/frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 75;/g, 'CURRENT_PROJECT_VERSION = 76;');
bump('c:/app_LamNguyenShip/frontend/android/app/build.gradle', /versionCode 64/g, 'versionCode 65');

// Driver app
bump('c:/app_LamNguyenShip/driver-app/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 79;/g, 'CURRENT_PROJECT_VERSION = 80;');
bump('c:/app_LamNguyenShip/driver-app/android/app/build.gradle', /versionCode 75/g, 'versionCode 76');
