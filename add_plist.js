const fs = require('fs');
const path = require('path');

const pbxprojPath = path.join(__dirname, 'driver-app', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
let content = fs.readFileSync(pbxprojPath, 'utf8');

// If already added, skip
if (content.includes('GoogleService-Info.plist')) {
  console.log('Already added');
  process.exit(0);
}

const fileRefUUID = 'C5A2B2D12A1B3C4D5E6F7G8H';
const buildFileUUID = 'D6B3C3E23B2C4D5E6F7G8H9I';

// 1. Add PBXBuildFile
const buildFileStr = `\n\t\t${buildFileUUID} /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefUUID} /* GoogleService-Info.plist */; };`;
content = content.replace(/(\/\* Begin PBXBuildFile section \*\/)/, `$1${buildFileStr}`);

// 2. Add PBXFileReference
const fileRefStr = `\n\t\t${fileRefUUID} /* GoogleService-Info.plist */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };`;
content = content.replace(/(\/\* Begin PBXFileReference section \*\/)/, `$1${fileRefStr}`);

// 3. Add to App group
// Find the App group children array. It usually starts with something like:
// /* App */ = {
//   isa = PBXGroup;
//   children = (
content = content.replace(/(path = App;\n\t\t\tsourceTree = "<group>";\n\t\t\})/, `$1`); // Just to locate it, actually it's easier to find the group by name
// A better way is to find the main group that contains AppDelegate.swift
const appDelegateMatch = content.match(/([0-9A-F]+) \/\* AppDelegate\.swift \*\//);
if (appDelegateMatch) {
  content = content.replace(new RegExp(`(children = \\([^\\)]*?)(\\t*${appDelegateMatch[1]} \\/\\* AppDelegate\\.swift \\*\\/,?)`, 's'), `$1\t\t${fileRefUUID} /* GoogleService-Info.plist */,\n$2`);
} else {
  console.log('Failed to find AppDelegate.swift in group');
  process.exit(1);
}

// 4. Add to Resources Build Phase
// Find /* Resources */ = {
//   isa = PBXResourcesBuildPhase;
//   buildActionMask = ...
//   files = (
const resourcesMatch = content.match(/\/\* Resources \*\/ = \{\n\t\t\tisa = PBXResourcesBuildPhase;[\s\S]*?files = \(/);
if (resourcesMatch) {
  content = content.replace(/(\/\* Resources \*\/ = \{\n\t\t\tisa = PBXResourcesBuildPhase;[\s\S]*?files = \()/, `$1\n\t\t\t\t${buildFileUUID} /* GoogleService-Info.plist in Resources */,`);
} else {
  console.log('Failed to find Resources Build Phase');
  process.exit(1);
}

fs.writeFileSync(pbxprojPath, content, 'utf8');
console.log('Successfully added GoogleService-Info.plist to project.pbxproj');
