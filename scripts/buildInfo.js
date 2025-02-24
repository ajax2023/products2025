import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildDate = new Date();
// Convert to EST/EDT
const estDate = new Date(buildDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const buildNumber = `Beta-${String(estDate.getMonth() + 1).padStart(2, '0')}${String(estDate.getDate()).padStart(2, '0')}${String(estDate.getFullYear()).slice(2)}-${String(estDate.getHours()).padStart(2, '0')}:${String(estDate.getMinutes()).padStart(2, '0')}`;

const content = `// This file is auto-generated. Do not edit.
export const BUILD_NUMBER = '${buildNumber}';
`;

const outputPath = join(__dirname, '..', 'src', 'buildInfo.ts');
writeFileSync(outputPath, content);
