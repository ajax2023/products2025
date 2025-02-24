import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildDate = new Date();
const buildNumber = `Beta-${String(buildDate.getMonth() + 1).padStart(2, '0')}${String(buildDate.getDate()).padStart(2, '0')}${String(buildDate.getFullYear()).slice(2)}-${String(buildDate.getHours()).padStart(2, '0')}:${String(buildDate.getMinutes()).padStart(2, '0')}`;

const content = `// This file is auto-generated. Do not edit.
export const BUILD_NUMBER = '${buildNumber}';
`;

const outputPath = join(__dirname, '..', 'src', 'buildInfo.ts');
writeFileSync(outputPath, content);
