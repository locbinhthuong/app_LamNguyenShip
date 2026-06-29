const fs = require('fs');
function bump(p, r, n) {
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(r, n);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Bumped ' + p);
  }
}
bump('frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 78;');
bump('frontend/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = [\d\.]+;/g, 'MARKETING_VERSION = 1.10.5;');
bump('frontend/android/app/build.gradle', /versionCode \d+/g, 'versionCode 67');
bump('frontend/android/app/build.gradle', /versionName ".*"/g, 'versionName "1.10.5"');
bump('frontend/package.json', /"version": ".*"/, '"version": "1.10.5"');

bump('driver-app/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = \d+;/g, 'CURRENT_PROJECT_VERSION = 92;');
bump('driver-app/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = [\d\.]+;/g, 'MARKETING_VERSION = 1.8.5;');
bump('driver-app/android/app/build.gradle', /versionCode \d+/g, 'versionCode 88');
bump('driver-app/android/app/build.gradle', /versionName ".*"/g, 'versionName "1.8.5"');
bump('driver-app/package.json', /"version": ".*"/, '"version": "1.8.5"');
