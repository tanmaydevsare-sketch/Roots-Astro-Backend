/**
 * CCAvenue Payment Gateway Helper
 * Uses AES-128-CBC encryption as required by CCAvenue
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-128-cbc';

function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

function encrypt(plainText, workingKey) {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = Buffer.from(m.digest('hex').substring(0, 32), 'hex');
    const iv = Buffer.alloc(16, 0);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(encryptedText, workingKey) {
    const m = crypto.createHash('md5');
    m.update(workingKey);
    const key = Buffer.from(m.digest('hex').substring(0, 32), 'hex');
    const iv = Buffer.alloc(16, 0);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function getCCAvenueCreds(settings) {
    return {
        merchantId: settings?.ccavenueMerchantId || process.env.CCAVENUE_MERCHANT_ID || '',
        accessCode: settings?.ccavenueAccessCode || process.env.CCAVENUE_ACCESS_CODE || '',
        workingKey: settings?.ccavenueWorkingKey || process.env.CCAVENUE_WORKING_KEY || '',
        mode: settings?.ccavenueMode || 'test'
    };
}

function getCCAvenueBaseUrl(mode) {
    return mode === 'live'
        ? 'https://secure.ccavenue.com/transaction/transaction.do'
        : 'https://test.ccavenue.com/transaction/transaction.do';
}

module.exports = { encrypt, decrypt, getCCAvenueCreds, getCCAvenueBaseUrl };
