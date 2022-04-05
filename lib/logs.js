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
exports.parseLogFailedToComplete = exports.parseLogComputeUnitsUsed = exports.parseLogLog = exports.parseLogReturn = exports.parseLogTopic = exports.parseTransactionError = exports.parseTransactionLogs = exports.sendAndConfirmTransactionWithLogs = exports.simulateTransactionWithLogs = exports.LogsParser = void 0;
const abi_1 = require("@ethersproject/abi");
const bytes_1 = require("@ethersproject/bytes");
const web3_js_1 = require("@solana/web3.js");
const errors_1 = require("./errors");
const LOG_RETURN_PREFIX = 'Program return: ';
const LOG_LOG_PREFIX = 'Program log: ';
const LOG_COMPUTE_UNITS_REGEX = /consumed (\d+) of (\d+) compute units/i;
const LOG_DATA_PREFIX = 'Program data: ';
const LOG_FAILED_TO_COMPLETE_PREFIX = 'Program failed to complete: ';
const LOG_FAILED_REGEX = /(Program \w+ )?failed: (.*)$/;
/** @internal */
class LogsParser {
    constructor(contract) {
        this._contract = contract;
        this._eventListeners = new Map();
        this._logListeners = new Map();
        this._listenerId = 0;
    }
    addEventListener(listener) {
        const listenerId = ++this._listenerId;
        this._eventListeners.set(listenerId, listener);
        this.setupSubscription();
        return listenerId;
    }
    removeEventListener(listenerId) {
        return __awaiter(this, void 0, void 0, function* () {
            this._eventListeners.delete(listenerId);
            yield this.teardownSubscription();
        });
    }
    addLogListener(listener) {
        const listenerId = ++this._listenerId;
        this._logListeners.set(listenerId, listener);
        this.setupSubscription();
        return listenerId;
    }
    removeLogListener(listenerId) {
        return __awaiter(this, void 0, void 0, function* () {
            this._logListeners.delete(listenerId);
            yield this.teardownSubscription();
        });
    }
    setupSubscription() {
        this._subscriptionId || (this._subscriptionId = this._contract.connection.onLogs(this._contract.program, (logs) => {
            if (logs.err)
                return;
            for (const log of logs.logs) {
                const eventData = parseLogTopic(log);
                const message = parseLogLog(log);
                if (eventData) {
                    for (const listener of this._eventListeners.values()) {
                        let event = null;
                        try {
                            event = this._contract.interface.parseLog(eventData);
                        }
                        catch (error) {
                            console.error(error);
                        }
                        if (event) {
                            listener(event);
                        }
                    }
                }
                if (message) {
                    for (const listener of this._logListeners.values()) {
                        listener(message);
                    }
                }
            }
        }));
    }
    teardownSubscription() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._subscriptionId !== undefined && this._eventListeners.size == 0 && this._logListeners.size == 0) {
                yield this._contract.connection.removeOnLogsListener(this._subscriptionId);
                this._subscriptionId = undefined;
            }
        });
    }
}
exports.LogsParser = LogsParser;
/** @internal */
function simulateTransactionWithLogs(connection, transaction, signers) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield connection.simulateTransaction(transaction, signers);
        const logs = (_a = result.value.logs) !== null && _a !== void 0 ? _a : [];
        const { log, encoded, computeUnitsUsed } = parseTransactionLogs(logs);
        if (result.value.err)
            throw parseTransactionError(encoded, computeUnitsUsed, log, logs);
        return { logs, encoded, computeUnitsUsed };
    });
}
exports.simulateTransactionWithLogs = simulateTransactionWithLogs;
/** @internal */
function sendAndConfirmTransactionWithLogs(connection, transaction, signers, confirmOptions, finality) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        confirmOptions = Object.assign({ commitment: 'confirmed', skipPreflight: false, preflightCommitment: 'processed' }, confirmOptions);
        try {
            const signature = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, signers, confirmOptions);
            const parsed = yield connection.getParsedConfirmedTransaction(signature, finality);
            const logs = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed.meta) === null || _a === void 0 ? void 0 : _a.logMessages) !== null && _b !== void 0 ? _b : [];
            const { encoded, computeUnitsUsed } = parseTransactionLogs(logs);
            return { logs, encoded, computeUnitsUsed };
        }
        catch (error) {
            if (error instanceof web3_js_1.SendTransactionError) {
                if (error.logs && error.logs.length != 0) {
                    const { encoded, computeUnitsUsed } = parseTransactionLogs(error.logs);
                    throw parseTransactionError(encoded, computeUnitsUsed, null, error.logs);
                }
            }
            throw error;
        }
    });
}
exports.sendAndConfirmTransactionWithLogs = sendAndConfirmTransactionWithLogs;
/** @internal */
function parseTransactionLogs(logs) {
    let encoded = null;
    let computeUnitsUsed = 0;
    let log = null;
    for (const message of logs) {
        const _encoded = parseLogReturn(message);
        if (_encoded)
            encoded = _encoded;
        let _log = parseLogFailedToComplete(message);
        if (_log)
            log = _log;
        _log = parseLogLog(message);
        if (_log)
            log = _log;
        const _computeUnitsUsed = parseLogComputeUnitsUsed(message);
        if (_computeUnitsUsed)
            computeUnitsUsed = _computeUnitsUsed;
    }
    return { encoded, computeUnitsUsed, log };
}
exports.parseTransactionLogs = parseTransactionLogs;
/** @internal */
function parseTransactionError(encoded, computeUnitsUsed, log, logs) {
    let error;
    if (log) {
        error = new errors_1.TransactionError(log);
    }
    else if (!encoded) {
        const failedMatch = logs[logs.length - 1].match(LOG_FAILED_REGEX);
        error = failedMatch ? new errors_1.TransactionError(failedMatch[2]) : new errors_1.TransactionError('return data or log not set');
    }
    else if (encoded.readUInt32BE(0) != 0x08c379a0) {
        error = new errors_1.TransactionError('signature not correct');
    }
    else {
        const revertReason = abi_1.defaultAbiCoder.decode(['string'], (0, bytes_1.hexDataSlice)(encoded, 4));
        error = new errors_1.TransactionError(revertReason.toString());
    }
    error.logs = logs;
    error.computeUnitsUsed = computeUnitsUsed;
    return error;
}
exports.parseTransactionError = parseTransactionError;
/** @internal */
function parseLogTopic(log) {
    if (log.startsWith(LOG_DATA_PREFIX)) {
        const fields = log.slice(LOG_DATA_PREFIX.length).split(' ');
        if (fields.length == 2) {
            const topicData = Buffer.from(fields[0], 'base64');
            const topics = [];
            for (let offset = 0; offset < topicData.length; offset += 32) {
                topics.push('0x' + topicData.subarray(offset, offset + 32).toString('hex'));
            }
            const data = '0x' + Buffer.from(fields[1], 'base64').toString('hex');
            return { data, topics };
        }
    }
    return null;
}
exports.parseLogTopic = parseLogTopic;
/** @internal */
function parseLogReturn(log) {
    if (log.startsWith(LOG_RETURN_PREFIX)) {
        const [, returnData] = log.slice(LOG_RETURN_PREFIX.length).split(' ');
        return Buffer.from(returnData, 'base64');
    }
    return null;
}
exports.parseLogReturn = parseLogReturn;
/** @internal */
function parseLogLog(log) {
    if (log.startsWith(LOG_LOG_PREFIX))
        return log.slice(LOG_LOG_PREFIX.length);
    return null;
}
exports.parseLogLog = parseLogLog;
/** @internal */
function parseLogComputeUnitsUsed(log) {
    const computeUnitsUsedMatch = log.match(LOG_COMPUTE_UNITS_REGEX);
    if (computeUnitsUsedMatch)
        return Number(computeUnitsUsedMatch[1]);
    return null;
}
exports.parseLogComputeUnitsUsed = parseLogComputeUnitsUsed;
/** @internal */
function parseLogFailedToComplete(log) {
    if (log.startsWith(LOG_FAILED_TO_COMPLETE_PREFIX))
        return log.slice(LOG_FAILED_TO_COMPLETE_PREFIX.length);
    return null;
}
exports.parseLogFailedToComplete = parseLogFailedToComplete;
//# sourceMappingURL=logs.js.map