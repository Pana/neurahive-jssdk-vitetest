import {NHProvider} from "js-neurahive-sdk";

export interface RequestArguments {
    method: string;
    readonly params?: readonly unknown[] | object;
}

export interface JsonRpcRequest {
    jsonrpc: string;
    method: string;
    params?: readonly unknown[] | object;
    id: number;
}

export class ZgProvider extends NHProvider {
    buildRpcPayload(req: RequestArguments): JsonRpcRequest {
        req.method = req.method.replace('nrhv_', 'zgs_')
        return super.buildRpcPayload(req);
    }
}
