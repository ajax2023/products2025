import crypto from 'crypto';

export function getGravatarUrl(email: string, size: number = 80): string {
  const defaultImage = 'identicon'; // Default to identicon if no Gravatar exists
  const hash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex');
  
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}
