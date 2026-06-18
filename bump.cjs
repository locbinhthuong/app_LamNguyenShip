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
bump('c:/app_LamNguyenShip/frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 70;/g, 'CURRENT_PROJECT_VERSION = 71;');
bump('c:/app_LamNguyenShip/frontend/android/app/build.gradle', /versionCode 59/g, 'versionCode 60');

// Driver app
bump('c:/app_LamNguyenShip/driver-app/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 74;/g, 'CURRENT_PROJECT_VERSION = 75;');
bump('c:/app_LamNguyenShip/driver-app/android/app/build.gradle', /versionCode 70/g, 'versionCode 71');
