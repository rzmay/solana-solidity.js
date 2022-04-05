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
exports.Contract = void 0;
const abi_1 = require("@ethersproject/abi");
const keccak256_1 = require("@ethersproject/keccak256");
const properties_1 = require("@ethersproject/properties");
const web3_js_1 = require("@solana/web3.js");
const errors_1 = require("./errors");
const logs_1 = require("./logs");
const utils_1 = require("./utils");
/** A contract represents a Solidity contract that has been compiled with Solang to be deployed on Solana. */
class Contract {
    /*
     * Create a contract. It can either be a new contract to deploy as a Solana program,
     * or a reference to one already deployed.
     *
     * @param connection Connection to use
     * @param program    Account the program is located at (aka Program ID)
     * @param storage    Account the program's data is stored at
     * @param abi        Application Binary Interface in JSON form
     * @param payer      Payer for transactions and storage (optional)
     */
    constructor(connection, program, storage, abi, payer = null) {
        this.connection = connection;
        this.program = program;
        this.storage = storage;
        this.abi = abi;
        this.interface = new abi_1.Interface(abi);
        this.functions = {};
        this.transactions = {};
        this.payer = payer;
        this.logs = new logs_1.LogsParser(this);
        const uniqueNames = {};
        const uniqueSignatures = {};
        for (const [signature, fragment] of Object.entries(this.interface.functions)) {
            if (uniqueSignatures[signature]) {
                console.warn(`Duplicate ABI entry for ${JSON.stringify(signature)}`);
                return;
            }
            uniqueSignatures[signature] = true;
            const name = fragment.name;
            if (!uniqueNames[`%${name}`]) {
                uniqueNames[`%${name}`] = [];
            }
            uniqueNames[`%${name}`].push(signature);
            if (!this.functions[signature]) {
                (0, properties_1.defineReadOnly)(this.functions, signature, this.buildCall(fragment, false));
            }
            if (!this.transactions[signature]) {
                (0, properties_1.defineReadOnly)(this.transactions, signature, this.buildTransaction(fragment));
            }
            if (typeof this[signature] === 'undefined') {
                (0, properties_1.defineReadOnly)(this, signature, this.buildCall(fragment, true));
            }
        }
        for (const uniqueName of Object.keys(uniqueNames)) {
            const signatures = uniqueNames[uniqueName];
            if (signatures.length > 1)
                continue;
            const signature = signatures[0];
            const name = uniqueName.slice(1);
            if (!this.functions[name]) {
                (0, properties_1.defineReadOnly)(this.functions, name, this.functions[signature]);
            }
            if (!this.transactions[name]) {
                (0, properties_1.defineReadOnly)(this.transactions, name, this.transactions[signature]);
            }
            if (typeof this[name] === 'undefined') {
                (0, properties_1.defineReadOnly)(this, name, this[signature]);
            }
        }
    }
    /**
     * Load the contract's BPF bytecode as a Solana program.
     *
     * @param program Keypair for the account the program is located at
     * @param so      ELF .so file produced by compiling the contract with Solang
     * @param payer   Payer for transactions and storage (defaults to the payer provided in the constructor)
     */
    load(program, so, payer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program.publicKey.equals(this.program))
                throw new errors_1.InvalidProgramAccountError();
            payer || (payer = this.payer);
            if (!payer)
                throw new errors_1.MissingPayerAccountError();
            yield web3_js_1.BpfLoader.load(this.connection, payer, program, so, web3_js_1.BPF_LOADER_PROGRAM_ID);
        });
    }
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
    deploy(name, constructorArgs, program, storage, space, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program.publicKey.equals(this.program))
                throw new errors_1.InvalidProgramAccountError();
            if (!storage.publicKey.equals(this.storage))
                throw new errors_1.InvalidStorageAccountError();
            const payer = (options === null || options === void 0 ? void 0 : options.payer) || this.payer;
            if (!payer)
                throw new errors_1.MissingPayerAccountError();
            const { accounts = [], writableAccounts = [], programDerivedAddresses = [], signers = [], sender = payer.publicKey, value = 0, simulate = false, ed25519sigs = [], confirmOptions = {
                commitment: 'confirmed',
                skipPreflight: false,
                preflightCommitment: 'processed',
            }, } = options !== null && options !== void 0 ? options : {};
            const hash = (0, keccak256_1.keccak256)(Buffer.from(name));
            const seeds = programDerivedAddresses.map(({ seed }) => seed);
            const input = this.interface.encodeDeploy(constructorArgs);
            const data = Buffer.concat([
                // storage account where state for this contract will be stored
                this.storage.toBuffer(),
                // msg.sender for this transaction
                sender.toBuffer(),
                // lamports to send to payable constructor
                encodeU64(BigInt(value)),
                // hash of contract name
                Buffer.from(hash.substr(2, 8), 'hex'),
                // PDA seeds
                (0, utils_1.encodeSeeds)(seeds),
                // eth abi encoded constructor arguments
                Buffer.from(input.replace('0x', ''), 'hex'),
            ]);
            const keys = [
                ...programDerivedAddresses.map(({ address }) => ({
                    pubkey: address,
                    isSigner: false,
                    isWritable: true,
                })),
                {
                    pubkey: this.storage,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
                    isSigner: false,
                    isWritable: false,
                },
                {
                    pubkey: web3_js_1.PublicKey.default,
                    isSigner: false,
                    isWritable: false,
                },
                ...accounts.map((pubkey) => ({
                    pubkey,
                    isSigner: false,
                    isWritable: false,
                })),
                ...writableAccounts.map((pubkey) => ({
                    pubkey,
                    isSigner: false,
                    isWritable: true,
                })),
            ];
            const lamports = yield this.connection.getMinimumBalanceForRentExemption(space, confirmOptions.commitment);
            const transaction = new web3_js_1.Transaction();
            if (ed25519sigs.length > 0) {
                keys.push({ pubkey: web3_js_1.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false });
                ed25519sigs.forEach(({ publicKey, message, signature }, index) => {
                    transaction.add(web3_js_1.Ed25519Program.createInstructionWithPublicKey({
                        instructionIndex: index,
                        publicKey: publicKey.toBuffer(),
                        message,
                        signature,
                    }));
                });
            }
            transaction.add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: storage.publicKey,
                lamports,
                space,
                programId: this.program,
            }), new web3_js_1.TransactionInstruction({
                keys,
                programId: this.program,
                data,
            }));
            const { logs, computeUnitsUsed } = simulate
                ? yield (0, logs_1.simulateTransactionWithLogs)(this.connection, transaction, [payer, storage, ...signers])
                : yield (0, logs_1.sendAndConfirmTransactionWithLogs)(this.connection, transaction, [payer, storage, ...signers]);
            const events = this.parseLogsEvents(logs);
            return {
                logs,
                events,
                computeUnitsUsed,
            };
        });
    }
    /**
     * Set the payer for transactions and storage
     *
     * @param payer Payer for transactions and storage
     *
     * @return Contract itself (for method chaining)
     */
    connect(payer) {
        this.payer = payer;
        return this;
    }
    /**
     * Unset the payer for transactions and storage
     *
     * @return Contract itself (for method chaining)
     */
    disconnect() {
        this.payer = null;
        return this;
    }
    /**
     * Add a listener for contract events
     *
     * @param listener Callback for contract events
     *
     * @return ID of the listener (pass to `removeEventListener` to stop listening)
     */
    addEventListener(listener) {
        return this.logs.addEventListener(listener);
    }
    /**
     * Remove a listener for contract events
     *
     * @param listenerId ID of the listener (returned by `addEventListener`)
     */
    removeEventListener(listenerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.logs.removeEventListener(listenerId);
        });
    }
    /**
     * Add a listener for log messages
     *
     * @param listener Callback for log messages
     *
     * @return ID of the listener (pass to `removeLogListener` to stop listening)
     */
    addLogListener(listener) {
        return this.logs.addLogListener(listener);
    }
    /**
     * Remove a listener for log messages
     *
     * @param listenerId ID of the listener (returned by `addLogListener`)
     */
    removeLogListener(listenerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.logs.removeLogListener(listenerId);
        });
    }
    /** @internal */
    parseLogsEvents(logs) {
        const events = [];
        for (const log of logs) {
            const eventData = (0, logs_1.parseLogTopic)(log);
            if (eventData) {
                const event = this.interface.parseLog(eventData);
                events.push(event);
            }
        }
        return events;
    }
    /** @internal */
    buildCall(fragment, returnResult) {
        return (...args) => {
            const options = args[args.length - 1];
            if (args.length > fragment.inputs.length && typeof options === 'object') {
                return this.call(fragment, returnResult, args.slice(0, fragment.inputs.length), options);
            }
            else {
                return this.call(fragment, returnResult, args);
            }
        };
    }
    /** @internal */
    buildTransaction(fragment) {
        return (...args) => {
            const options = args[args.length - 1];
            if (args.length > fragment.inputs.length && typeof options === 'object') {
                return this.generateTransaction(fragment, args.slice(0, fragment.inputs.length), options);
            }
            else {
                return this.generateTransaction(fragment, args);
            }
        };
    }
    /** @internal */
    generateTransaction(fragment, args, options) {
        const payer = (options === null || options === void 0 ? void 0 : options.payer) || this.payer;
        if (!payer)
            throw new errors_1.MissingPayerAccountError();
        const { accounts = [], writableAccounts = [], programDerivedAddresses = [], sender = payer.publicKey, value = 0, ed25519sigs = [], } = options !== null && options !== void 0 ? options : {};
        const seeds = programDerivedAddresses.map(({ seed }) => seed);
        const input = this.interface.encodeFunctionData(fragment, args);
        const data = Buffer.concat([
            // storage account where state for this contract will be stored
            this.storage.toBuffer(),
            // msg.sender for this transaction
            sender.toBuffer(),
            // lamports to send to payable constructor
            encodeU64(BigInt(value)),
            // hash of contract name, 0 for function calls
            Buffer.from('00000000', 'hex'),
            // PDA seeds
            (0, utils_1.encodeSeeds)(seeds),
            // eth abi encoded constructor arguments
            Buffer.from(input.replace('0x', ''), 'hex'),
        ]);
        const keys = [
            ...programDerivedAddresses.map(({ address }) => ({
                pubkey: address,
                isSigner: false,
                isWritable: true,
            })),
            {
                pubkey: this.storage,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: web3_js_1.SYSVAR_CLOCK_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: web3_js_1.PublicKey.default,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: sender,
                isSigner: true,
                isWritable: false,
            },
            ...accounts.map((pubkey) => ({
                pubkey,
                isSigner: false,
                isWritable: false,
            })),
            ...writableAccounts.map((pubkey) => ({
                pubkey,
                isSigner: false,
                isWritable: true,
            })),
        ];
        const transaction = new web3_js_1.Transaction();
        if (ed25519sigs.length > 0) {
            keys.push({ pubkey: web3_js_1.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false });
            ed25519sigs.forEach(({ publicKey, message, signature }, index) => {
                transaction.add(web3_js_1.Ed25519Program.createInstructionWithPublicKey({
                    instructionIndex: index,
                    publicKey: publicKey.toBuffer(),
                    message,
                    signature,
                }));
            });
        }
        transaction.add(new web3_js_1.TransactionInstruction({
            keys,
            programId: this.program,
            data,
        }));
        return transaction;
    }
    /** @internal */
    call(fragment, returnResult, args, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const payer = (options === null || options === void 0 ? void 0 : options.payer) || this.payer;
            if (!payer)
                throw new errors_1.MissingPayerAccountError();
            const { signers = [], simulate = false, confirmOptions = {
                commitment: 'confirmed',
                skipPreflight: false,
                preflightCommitment: 'processed',
            }, } = options !== null && options !== void 0 ? options : {};
            const transaction = this.generateTransaction(fragment, args, options);
            // If the function is read-only, simulate the transaction to get the result
            const { logs, encoded, computeUnitsUsed } = simulate || fragment.stateMutability === 'view' || fragment.stateMutability === 'pure'
                ? yield (0, logs_1.simulateTransactionWithLogs)(this.connection, transaction, [payer, ...signers])
                : yield (0, logs_1.sendAndConfirmTransactionWithLogs)(this.connection, transaction, [payer, ...signers], confirmOptions);
            const events = this.parseLogsEvents(logs);
            const length = (_a = fragment.outputs) === null || _a === void 0 ? void 0 : _a.length;
            let result = null;
            if (length) {
                if (!encoded)
                    throw new errors_1.MissingReturnDataError();
                if (length == 1) {
                    [result] = this.interface.decodeFunctionResult(fragment, encoded);
                }
                else {
                    result = this.interface.decodeFunctionResult(fragment, encoded);
                }
            }
            if (returnResult === true)
                return result;
            return { result, logs, events, computeUnitsUsed };
        });
    }
}
exports.Contract = Contract;
function encodeU64(num) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(num, 0);
    return buf;
}
//# sourceMappingURL=contract.js.map