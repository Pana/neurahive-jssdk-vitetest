import { useState } from 'react'
import { BrowserProvider } from 'ethers';
import { 
    NHBlob, 
    getFlowContract, 
    TESTNET_FLOW_ADDRESS, 
    NHProvider,
} from 'js-neurahive-sdk';

function App() {
    const [file, setFile] = useState<File|null>(null);
    const [account, setAccount] = useState<string|null>(null);

    const connectWallet = async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        .catch((err: { code: number; }) => {
            if (err.code === 4001) {
                // EIP-1193 userRejectedRequest error
                // If this happens, the user rejected the connection request.
                console.log('Please connect to MetaMask.');
            } else {
                console.error(err);
            }
        });
        const account = accounts[0];
        setAccount(account);
    }

    const uploadFile = async () => {
        if (!file) return;
        const blob = new NHBlob(file);
        const [tree, err] = await blob.merkleTree();
        if (tree === null || err) {
            console.log('get tree error', err);
            return;
        }
        console.log('File root-hash', tree.rootHash());

        const [sub, err1] = await blob.createSubmission("0x");
        if (err1 || sub === null) {
            console.log('get submission error', err1);
            return;
        }
        console.log('File submission', sub);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const flow = getFlowContract(TESTNET_FLOW_ADDRESS, signer);

        const tx = await flow.submit(sub);
        await tx.wait();
        console.log('Submit hash', tx.hash);

        const nhRpc = 'http://47.92.4.77:5678';
        const nhProvider = new NHProvider(nhRpc);

        await nhProvider.uploadFile(blob);
        console.log('finished');
    }

  return (
    <>
        <div style={{marginBottom: '10px'}}>
            <button onClick={connectWallet}>Connect wallet</button> {account}
        </div>
        <div>
            <input type='file' onChange={(e) => {
                if (e.target.files && e.target.files?.length > 0) {
                    setFile(e.target?.files[0]);
                } else {
                    alert('Please select a file');
                }
            }}></input>
            <button onClick={uploadFile}>Upload</button>
        </div>
    </>
  )
}

export default App
