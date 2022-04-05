"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingReturnDataError = exports.MissingPayerAccountError = exports.InvalidStorageAccountError = exports.InvalidProgramAccountError = exports.TransactionError = exports.ContractError = void 0;
/** Base class for contract errors */
class ContractError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.ContractError = ContractError;
/** Thrown if transaction simulation fails */
class TransactionError extends ContractError {
    constructor(message) {
        super(message);
        this.logs = [];
        this.computeUnitsUsed = 0;
    }
}
exports.TransactionError = TransactionError;
/** Thrown if the program ID provided doesn't match the contract */
class InvalidProgramAccountError extends ContractError {
    constructor() {
        super(...arguments);
        this.name = 'InvalidProgramAccountError';
    }
}
exports.InvalidProgramAccountError = InvalidProgramAccountError;
/** Thrown if the storage account provided doesn't match the contract */
class InvalidStorageAccountError extends ContractError {
    constructor() {
        super(...arguments);
        this.name = 'InvalidStorageAccountError';
    }
}
exports.InvalidStorageAccountError = InvalidStorageAccountError;
/** Thrown if a payer account wasn't provided */
class MissingPayerAccountError extends ContractError {
    constructor() {
        super(...arguments);
        this.name = 'MissingPayerAccountError';
    }
}
exports.MissingPayerAccountError = MissingPayerAccountError;
/** Thrown if a contract function expects return values and didn't receive them */
class MissingReturnDataError extends ContractError {
    constructor() {
        super(...arguments);
        this.name = 'MissingReturnDataError';
    }
}
exports.MissingReturnDataError = MissingReturnDataError;
//# sourceMappingURL=errors.js.map