const fs = require('fs');

function replaceInFile(filePath, regex, replacement) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

// 1. package.json
replaceInFile('frontend/package.json', /"version": "1.10.7"/, '"version": "1.10.8"');

// 2. iOS project.pbxproj
replaceInFile('frontend/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = 1\.10\.7;/g, 'MARKETING_VERSION = 1.10.8;');
replaceInFile('frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 80;/g, 'CURRENT_PROJECT_VERSION = 81;');

// 3. Android build.gradle
replaceInFile('frontend/android/app/build.gradle', /versionName "1\.10\.7"/g, 'versionName "1.10.8"');
replaceInFile('frontend/android/app/build.gradle', /versionCode 69/g, 'versionCode 70');

console.log("Bumped Customer App to 1.10.8 (iOS: 81, Android: 70)");
