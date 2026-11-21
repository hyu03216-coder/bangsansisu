import {randomBytes} from 'node:crypto';
console.log('TOKEN_A =',randomBytes(32).toString('base64url'));
console.log('TOKEN_B =',randomBytes(32).toString('base64url'));
console.log('Copy the secrets to Apps Script > Project settings > Script properties, NOT GitHub.');
