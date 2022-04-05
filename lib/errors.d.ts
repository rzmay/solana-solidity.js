/** Base class for contract errors */
export declare abstract class ContractError extends Error {
    constructor(message?: string);
}
/** Thrown if transaction simulation fails */
export declare class TransactionError extends ContractError {
    logs: string[];
    computeUnitsUsed: number;
    constructor(message?: string);
}
/** Thrown if the program ID provided doesn't match the contract */
export declare class InvalidProgramAccountError extends ContractError {
    name: string;
}
/** Thrown if the storage account provided doesn't match the contract */
export declare class InvalidStorageAccountError extends ContractError {
    name: string;
}
/** Thrown if a payer account wasn't provided */
export declare class MissingPayerAccountError extends ContractError {
    name: string;
}
/** Thrown if a contract function expects return values and didn't receive them */
export declare class MissingReturnDataError extends ContractError {
    name: string;
}
