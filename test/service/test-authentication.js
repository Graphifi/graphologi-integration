import {generateKeyPair, getKayValuePair, sign, verify} from "../../service/authentication.js";
import {expect} from "chai";


describe("authentication ", () => {
    it('test generateKeyPair and verify', () => {
        let keyPair = generateKeyPair();
        expect(keyPair.publicKey).not.to.eql(undefined);
        expect(keyPair.privateKey).not.to.eql(undefined);

        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;

        let testPayload = "something";
        let authHeader = sign(keyPair.privateKey, testPayload);
        let authHeaderSplit = authHeader.split(";");
        let timestamp = getKayValuePair(authHeaderSplit[1]);
        let signature = getKayValuePair(authHeaderSplit[2]);

        let result = verify(timestamp.value, signature.value, testPayload);
        expect(result).to.be.eql(true);

        //Now assert that with wrong keyPair verification fails
        process.env.GRAPHOLOGI_PUBLIC_KEY = keyPair.publicKey;

        let newKeyPair = generateKeyPair();
        authHeader = sign(newKeyPair.privateKey, testPayload);
        authHeaderSplit = authHeader.split(";");
        timestamp = getKayValuePair(authHeaderSplit[1]);
        signature = getKayValuePair(authHeaderSplit[2]);

        result = verify(timestamp.value, signature.value, testPayload);
        expect(result).to.be.eql(false);

    });
})