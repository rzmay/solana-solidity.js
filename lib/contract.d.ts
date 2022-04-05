/// <reference types="node" />
import { Interface, LogDescription, Result } from '@ethersproject/abi';
import { ConfirmOptions, Connection, PublicKey, Signer, Transaction } from '@solana/web3.js';
import { ABI, ProgramDerivedAddress } from './utils';
/** Accounts, signers, and other parameters for calling a contract function or constructor */
export interface ContractCallOptions {
    payer?: Signer;
    accounts?: PublicKey[];
    writableAccounts?: PublicKey[];
    programDerivedAddresses?: ProgramDerivedAddress[];
    signers?: Signer[];
    sender?: PublicKey | undefined;
    value?: number | bigint;
    simulate?: boolean;
    ed25519sigs?: Ed25519SigCheck[];
    confirmOptions?: ConfirmOptions;
}
export interface Ed25519SigCheck {
    publicKey: PublicKey;
    message: Uint8Array;
    signature: Uint8Array;
}
/** Result of a contract function or constructor call */
export interface ContractCallResult {
    logs: string[];
    events: LogDescription[];
    computeUnitsUsed: number;
}
/** Result of a contract function call */
export interface ContractFunctionResult extends ContractCallResult {
    result: Result | null;
}
/** Function that maps to a function declared in the contract ABI */
export declare type ContractFunction = (...args: any[]) => Promise<ContractFunctionResult | any>;
/** Function that maps to an unsigned transaction of a function declared in the contract ABI */
export declare type ContractTransaction = (...args: any[]) => Transaction;
/** Callback function that will be called with decoded events */
export declare type EventListener = (event: LogDescription) => void;
/** Callback function that will be called with raw log messages */
export declare type LogListener = (message: string) => void;
/** A contract represents a Solidity contract that has been compiled with Solang to be deployed on Solana. */
export declare class Contract {
    /** Functions that map to the functions declared in the contract ABI */
    readonly [name: string]: ContractFunction | any;
    /** Connection to use */
    readonly connection: Connection;
    /** Account the program is located at (aka Program ID) */
    readonly program: PublicKey;
    /** Account the program's data is stored at */
    readonly storage: PublicKey;
    /** Application Binary Interface in JSON form */
    readonly abi: ABI;
    /** Ethers.js interface parsed from the ABI */
    readonly interface: Interface;
    /** Callable functions mapped to the interface */
    readonly functions: Record<string, ContractFunction>;
    /** Callable functions to generate transactions mapped to the interface */
    readonly transactions: Record<string, ContractTransaction>;
    /** Payer for transactions and storage (optional) */
    payer: Signer | null;
    constructor(connection: Connection, program: PublicKey, storage: PublicKey, abi: ABI, payer?: Signer | null);
    /**
     * Load the contract's BPF bytecode as a Solana program.
     *
     * @param program Keypair for the account the program is located at
     * @param so      ELF .so file produced by compiling the contract with Solang
     * @param payer   Payer for transactions and storage (defaults to the payer provided in the constructor)
     */
    load(program: Signer, so: Buffer, payer?: Signer | null): Promise<void>;
    /**
     * Deploy the contract to a loaded Solana program.
     *
     * @param name            Name of the contract to deploy
     * @param constructorArgs Arguments to pass to the contract's Solidity constructor function
     * @param program         Keypair for the account the program is located at
     * @param storage         Keypair for the account the program's data is stored at
     * @param space           Byte size to allocate for the storage account (this cannot be resized)
     * @param options         Accounts, signers, and other parameters for calling the contract constructor
     *
     * @return Result of the contract constructor call
     */
    deploy(name: string, constructorArgs: any[], program: Signer, storage: Signer, space: number, options?: ContractCallOptions): Promise<ContractCallResult>;
    /**
     * Set the payer for transactions and storage
     *
     * @param payer Payer for transactions and storage
     *
     * @return Contract itself (for method chaining)
     */
    connect(payer: Signer): this;
    /**
     * Unset the payer for transactions and storage
     *
     * @return Contract itself (for method chaining)
     */
    disconnect(): this;
    /**
     * Add a listener for contract events
     *
     * @param listener Callback for contract events
     *
     * @return ID of the listener (pass to `removeEventListener` to stop listening)
     */
    addEventListener(listener: EventListener): number;
    /**
     * Remove a listener for contract events
     *
     * @param listenerId ID of the listener (returned by `addEventListener`)
     */
    removeEventListener(listenerId: number): Promise<void>;
    /**
     * Add a listener for log messages
     *
     * @param listener Callback for log messages
     *
     * @return ID of the listener (pass to `removeLogListener` to stop listening)
     */
    addLogListener(listener: LogListener): number;
    /**
     * Remove a listener for log messages
     *
     * @param listenerId ID of the listener (returned by `addLogListener`)
     */
    removeLogListener(listenerId: number): Promise<void>;
}
