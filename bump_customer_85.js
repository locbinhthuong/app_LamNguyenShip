const fs = require('fs');

function replaceInFile(filePath, regex, replacement) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

// 1. package.json
replaceInFile('frontend/package.json', /"version": "1.10.8"/, '"version": "1.10.9"');

// 2. iOS project.pbxproj
replaceInFile('frontend/ios/App/App.xcodeproj/project.pbxproj', /MARKETING_VERSION = 1\.10\.8;/g, 'MARKETING_VERSION = 1.10.9;');
replaceInFile('frontend/ios/App/App.xcodeproj/project.pbxproj', /CURRENT_PROJECT_VERSION = 81;/g, 'CURRENT_PROJECT_VERSION = 85;');

// 3. Android build.gradle
replaceInFile('frontend/android/app/build.gradle', /versionName "1\.10\.8"/g, 'versionName "1.10.9"');
replaceInFile('frontend/android/app/build.gradle', /versionCode 70/g, 'versionCode 75');

console.log("Bumped Customer App to 1.10.9 (iOS: 85, Android: 75)");
