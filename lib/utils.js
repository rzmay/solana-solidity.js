"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeSeeds = exports.seedToBuffer = exports.publicKeyToHex = exports.createProgramDerivedAddress = void 0;
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = require("crypto");
/**
 * Create a Program Derived Address from a program ID and a random seed
 *
 * @param program Program ID to derive the PDA using
 *
 * @return PDA and the seed used to derive it
 */
function createProgramDerivedAddress(program) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const seed = (0, crypto_1.randomBytes)(7);
            let address;
            try {
                address = yield web3_js_1.PublicKey.createProgramAddress([seed], program);
            }
            catch (error) {
                // If a valid PDA can't be found using the seed, generate another and try again
                continue;
            }
            return { address, seed };
        }
    });
}
exports.createProgramDerivedAddress = createProgramDerivedAddress;
/**
 * Encode a public key as a hexadecimal string
 *
 * @param publicKey Public key to convert
 *
 * @return Hex-encoded public key
 */
function publicKeyToHex(publicKey) {
    return '0x' + publicKey.toBuffer().toString('hex');
}
exports.publicKeyToHex = publicKeyToHex;
/** @internal */
function seedToBuffer(seed) {
    if (seed instanceof Buffer) {
        return seed;
    }
    else if (typeof seed === 'string') {
        return Buffer.from(seed, 'utf-8');
    }
    else if (seed instanceof web3_js_1.PublicKey) {
        return seed.toBuffer();
    }
    else {
        return Buffer.from(seed);
    }
}
exports.seedToBuffer = seedToBuffer;
/** @internal */
function encodeSeeds(seeds) {
    const buffers = seeds.map(seedToBuffer);
    let length = 1;
    for (const buffer of buffers) {
        length += buffer.length + 1;
    }
    const encoded = Buffer.alloc(length);
    encoded.writeUInt8(buffers.length);
    let offset = 1;
    for (const buffer of buffers) {
        encoded.writeUInt8(buffer.length, offset);
        offset += 1;
        buffer.copy(encoded, offset);
        offset += buffer.length;
    }
    return encoded;
}
exports.encodeSeeds = encodeSeeds;
//# sourceMappingURL=utils.js.map