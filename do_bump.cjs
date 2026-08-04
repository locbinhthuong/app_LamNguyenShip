const fs = require('fs');
function bump(p, r, n) {
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(r, n);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Bumped ' + p);
  }
}

// Frontend
bump('frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 79;');
bump('frontend/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = [\d\.]+;/g, 'MARKETING_VERSION = 1.10.6;');
bump('frontend/android/app/build.gradle', /versionCode \d+/g, 'versionCode 68');
bump('frontend/android/app/build.gradle', /versionName ".*"/g, 'versionName "1.10.6"');
bump('frontend/package.json', /"version": ".*"/, '"version": "1.10.6"');

// Driver App
bump('driver-app/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 101;');
bump('driver-app/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = [\d\.]+;/g, 'MARKETING_VERSION = 1.8.12;');
bump('driver-app/android/app/build.gradle', /versionCode \d+/g, 'versionCode 101');
bump('driver-app/android/app/build.gradle', /versionName ".*"/g, 'versionName "1.8.12"');
bump('driver-app/package.json', /"version": ".*"/, '"version": "1.8.12"');
