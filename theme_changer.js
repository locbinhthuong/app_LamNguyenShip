const fs = require('fs');
const path = require('path');

const directories = [
  'c:/app_LamNguyenShip/admin-app/src',
  'c:/app_LamNguyenShip/driver-app/src'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // BACKGROUNDS
  content = content.replace(/bg-gray-900/g, 'bg-slate-50');
  content = content.replace(/bg-slate-900/g, 'bg-slate-50');
  content = content.replace(/bg-gray-800/g, 'bg-white');
  content = content.replace(/bg-slate-800/g, 'bg-white');
  content = content.replace(/bg-gray-700\/50/g, 'bg-blue-50/50');
  content = content.replace(/bg-gray-700/g, 'bg-blue-50 hover:bg-blue-100');
  content = content.replace(/hover:bg-gray-700/g, 'hover:bg-blue-100');
  content = content.replace(/hover:bg-gray-600/g, 'hover:bg-blue-200');

  // BORDERS
  content = content.replace(/border-gray-700/g, 'border-slate-200');
  content = content.replace(/border-gray-600/g, 'border-slate-300');
  content = content.replace(/border-slate-700/g, 'border-slate-200');

  // TEXTS
  content = content.replace(/text-gray-300/g, 'text-slate-600');
  content = content.replace(/text-gray-400/g, 'text-slate-500');
  content = content.replace(/text-gray-500/g, 'text-slate-500');
  content = content.replace(/text-slate-400/g, 'text-slate-500');
  content = content.replace(/text-white/g, 'text-slate-800');

  // FIX TEXT-WHITE IN PILLS AND BUTTONS 
  // (where bg-color is used, text should be white, not slate-800)
  const fixWhiteColors = ['blue', 'green', 'red', 'orange', 'yellow', 'emerald', 'sky'];
  fixWhiteColors.forEach(color => {
      // Look for combinations in className. Using a simple regex to replace if bg-color is near text-slate-800
      // Since order is arbitrary, we just replace all text-slate-800 inside strings that contain bg-color-500 or 600
      const classRegex = /className=(\{`[^`]*\`\}|"[^"]*")/g;
      content = content.replace(classRegex, (match) => {
          if (match.includes(`bg-${color}-500`) || match.includes(`bg-${color}-600`) || match.includes(`bg-blue-600`)) {
              if (!match.includes('text-slate-800 hover:text-')) {
                 return match.replace(/text-slate-800/g, 'text-white');
              }
          }
          return match;
      });
  });

  // ORANGE to BLUE conversion (The primary brand color)
  content = content.replace(/text-orange-500/g, 'text-blue-600');
  content = content.replace(/text-orange-400/g, 'text-blue-600');
  content = content.replace(/text-orange-300/g, 'text-blue-500');
  content = content.replace(/bg-orange-500/g, 'bg-blue-600');
  content = content.replace(/bg-orange-600/g, 'bg-blue-700');
  content = content.replace(/bg-orange-500\/10/g, 'bg-blue-600\/10');
  content = content.replace(/bg-orange-500\/20/g, 'bg-blue-600\/20');
  content = content.replace(/shadow-orange-500/g, 'shadow-blue-600');
  content = content.replace(/ring-orange-500/g, 'ring-blue-600');
  content = content.replace(/border-orange-500/g, 'border-blue-600');

  // MORE FIXES
  content = content.replace(/bg-emerald-600 to-green-700/g, 'bg-sky-500 to-blue-600');
  content = content.replace(/text-emerald-400/g, 'text-sky-600');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverseDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  });
}

directories.forEach(dir => {
    if (fs.existsSync(dir)) {
        traverseDir(dir);
    }
});
console.log('Xong!');
