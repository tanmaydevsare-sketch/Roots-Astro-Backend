const crypto = require("crypto");

function getEasebuzzCreds(settings) {
    return {
        key: settings?.easebuzzKey || process.env.EASEBUZZ_KEY || "",
        salt: settings?.easebuzzSalt || process.env.EASEBUZZ_SALT || "",
        mode: (settings?.razorpayMode === "live") ? "production" : "test"
    };
}

function computeInitiateHash({ key, txnid, amount, productinfo, firstname, email, salt, udf1="", udf2="", udf3="", udf4="", udf5="" }) {
    const str = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    return crypto.createHash("sha512").update(str).digest("hex");
}

function verifyResponseHash(params, salt) {
    const { status, udf5="", udf4="", udf3="", udf2="", udf1="", email, firstname, productinfo, amount, txnid, key, hash } = params;
    const str = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    return crypto.createHash("sha512").update(str).digest("hex") === hash;
}

function getEasebuzzBaseUrl(mode) {
    return mode === "production" ? "https://pay.easebuzz.in" : "https://testpay.easebuzz.in";
}

module.exports = { getEasebuzzCreds, computeInitiateHash, verifyResponseHash, getEasebuzzBaseUrl };
