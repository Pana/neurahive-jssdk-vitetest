
export const ERC20ABI = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address a) view returns (uint)",
    "function name() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256 balance)",
    "function transfer(address to, uint256 value) returns (bool success)",
    "function transferFrom(address from, address to, uint256 value) returns (bool success)",
    "function approve(address spender, uint256 value) returns (bool success)",
    "function allowance(address owner, address spender) view returns (uint256 remaining)",
]

// export const ESPACE_TESTNET_USDT = '0x7d682e65efc5c13bf4e394b8f376c48e6bae0355';
export const ESPACE_TESTNET_USDT = '0xe3a700dF2a8bEBeF2f0B1eE92f46d230b01401B1';
