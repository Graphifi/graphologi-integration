import crypto, {generateKeyPairSync} from "crypto";


function getPublicKey() {
    return process.env.GRAPHOLOGI_PUBLIC_KEY;
}

function keyNameIsInValid(keyName, pair) {
    return keyName.toLowerCase() !== pair.key?.toLowerCase();
}

export function authenticate(req, res, next) {

    let payload = req.body;

    /*
    `Algorithm="RSA-SHA256";Timestamp="timestamp";Signature="signature"`
     */
    let authHeader = req.headers.authorization;
    if(!authHeader) {
        let error = new Error("Unauthorized : auth header missing");
        error.status = 401;
        return next(error);
    }
    let authHeaderSplit = authHeader.split(";");
    if(authHeaderSplit.length < 3) {
        let error = new Error(`Unauthorized : auth header format should match Algorithm="RSA-SHA256";Timestamp="{timestamp}";Signature="{signature}" `);
        error.status = 401;
        return next(error);
    }
    let algoritham = getKayValuePair(authHeaderSplit[0]);
    if(keyNameIsInValid("Algorithm", algoritham) || "RSA-SHA256" !== algoritham.value) {
        let error = new Error('Unauthorized : invalid Algorithm or value');
        error.status = 401;
        return next(error);
    }
    let timestamp = getKayValuePair(authHeaderSplit[1]);
    if(keyNameIsInValid("timestamp", timestamp) || !timestamp.value) {
        let error = new Error('Unauthorized : invalid timestamp or value');
        error.status = 401;
        return next(error);
    }
    let signature = getKayValuePair(authHeaderSplit[2]);
    if(keyNameIsInValid("Signature", signature) || !signature.value) {
        let error = new Error('Unauthorized : invalid signature or value');
        error.status = 401;
        return next(error);
    }
    if(verify(timestamp.value, signature.value, payload)) {
        return next();
    }
    let error = new Error('Unauthorized : signature verification failed');
    error.status = 401;
    return next(error);
}

export function verify(timestamp, signature, payload) {
    const verify = crypto.createVerify('RSA-SHA256');
    let payloadString = getPayloadString(payload);
    let payloadHash = getPayloadHash(payloadString);
    const verificationPayload = timestamp + "\n" + payloadHash;
    verify.update(verificationPayload);
    let publicKey = getPublicKey();
    return verify.verify(publicKey, signature,'base64');
}

export function getKayValuePair(keyValString) {
    let split = keyValString.split("=");
    let pair = {}
    if(split.length > 0) {
        let key = normalize(split[0]);
        pair.key = key;
    }
    if(split.length > 1) {
        let value = normalize(split[1]);
        pair.value = value;
    }
    return pair;
}

function normalize(value) {
    let normalized = value.trim();
    if(normalized.charAt(0) === '"') {
        normalized = normalized.substring(1);
    }
    if(normalized.charAt(normalized.length - 1) === '"') {
        normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
}

function getPayloadString(payload) {
    let isString = typeof payload === 'string' || payload instanceof String;
    return isString
        ? payload
        : JSON.stringify(payload);
}

function getPayloadHash(payloadString) {
    return crypto.createHash('sha256').update(payloadString).digest('hex');
}

//This is how Graphologi signs payload
export function sign(privateKey, payload) {
    let payloadString = getPayloadString(payload);

    const payloadHash = getPayloadHash(payloadString);
    let timestamp = Date.now();
    const payloadForSignature = timestamp + "\n" + payloadHash;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(payloadForSignature);
    signer.end();

    // Private key should be PKCS8 format
    const signature = signer.sign(privateKey, 'base64');

    return `Algorithm="RSA-SHA256";Timestamp="${timestamp}";Signature="${signature}"`;
}

export function generateKeyPair() {
    return generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
}
