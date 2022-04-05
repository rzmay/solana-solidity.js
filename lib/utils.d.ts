/// <reference types="node" />
import { JsonFragment } from '@ethersproject/abi';
import { PublicKey } from '@solana/web3.js';
/** Application Binary Interface of a Solidity contract in JSON form */
export declare type ABI = JsonFragment[];
/** PDA and the seed used to derive it */
export interface ProgramDerivedAddress {
    address: PublicKey;
    seed: Buffer;
}
/**
 * Create a Program Derived Address from a program ID and a random seed
 *
 * @param program Program ID to derive the PDA using
 *
 * @return PDA and the seed used to derive it
 */
export declare function createProgramDerivedAddress(program: PublicKey): Promise<ProgramDerivedAddress>;
/**
 * Encode a public key as a hexadecimal string
 *
 * @param publicKey Public key to convert
 *
 * @return Hex-encoded public key
 */
export declare function publicKeyToHex(publicKey: PublicKey): string;
