const fs = require('fs');
const path = require('path');

const buildDate = new Date();
const buildNumber = `Beta-${String(buildDate.getMonth() + 1).padStart(2, '0')}${String(buildDate.getDate()).padStart(2, '0')}${String(buildDate.getFullYear()).slice(2)}-${String(buildDate.getHours()).padStart(2, '0')}:${String(buildDate.getMinutes()).padStart(2, '0')}`;

const content = `// This file is auto-generated. Do not edit.
export const BUILD_NUMBER = '${buildNumber}';
`;

const outputPath = path.join(__dirname, '..', 'src', 'buildInfo.ts');
fs.writeFileSync(outputPath, content);
