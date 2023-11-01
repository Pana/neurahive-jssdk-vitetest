import {useCallback, useEffect, useMemo, useState} from 'react'
import {BrowserProvider, Contract, formatEther, parseEther} from 'ethers';
import {FileInfo, getFlowContract, NHBlob, NHProvider, TESTNET_FLOW_ADDRESS,} from 'js-neurahive-sdk';
import {ERC20ABI, ESPACE_TESTNET_USDT} from './ERC20Abi';
import {Loading} from "./components/Loading.tsx";

function App() {
    const [file, setFile] = useState<File|null>(null);
    const [account, setAccount] = useState<string|null>(null);
    const [v, setV] = useState({
        loading: false, approveHash: '', submitHash:'', allowance: 0, balance: 0, error: '',
        info: '', rootHash: '',
    })
    const [fileInfo, setFileInfo] = useState<FileInfo|null>(null)
    const provider = useMemo(()=>{
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return new BrowserProvider(window.ethereum);
    }, []);
    const nhProvider = useMemo(()=>{
        const nhRpc = 'http://47.92.4.77:5678';
        return new NHProvider(nhRpc)
    }, [])
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

    const approve = useCallback(async () => {
        const signer = await provider.getSigner();
        const usdt = new Contract(ESPACE_TESTNET_USDT, ERC20ABI, signer);
        usdt.approve(TESTNET_FLOW_ADDRESS, parseEther('10')).then(tx=>{
            console.log(`tx is `, tx)
            setV(v=>{
                return {...v, loading: true, approveHash: tx.hash || tx.transactionHash}
            })
            return tx.wait()
        }).then(()=>{
            setV(v=>{
                return {...v, loading: false}
            })
        }).catch(e=>{
            setV(v=>{
                return {...v, loading: false, error: `${e}`}
            })
        })
    }, [provider])
    const getFileInfo = useCallback((rootHash:string, checkError:boolean)=>{
        setFileInfo(null)
        nhProvider.getFileInfo(rootHash).then(res=>{
            setFileInfo(res)
            if (res?.finalized && checkError) {
                setV(v=>{return {...v, error: `Uploaded already.`}})
            }
        })
    }, [nhProvider])
    useEffect(() => {
        if (!file) {
            return
        }
        (async ()=>{
            const blob = new NHBlob(file);
            const [tree, err] = await blob.merkleTree();
            if (tree === null || err) {
                console.log('get tree error', err);
                return;
            }
            setV(v=>{return {...v, rootHash: tree.rootHash()!, info: '', error: ''}})
            getFileInfo(tree.rootHash()!, true)
        })()
    }, [nhProvider, file, getFileInfo]);

    const uploadFile = useCallback(async () => {
        setV(v=>{return {...v, info: '', submitHash: '', error: ''}})
        if (!file) return;
        const blob = new NHBlob(file);
        const [tree, err] = await blob.merkleTree();
        if (tree === null || err) {
            console.log('get tree error', err);
            return;
        }
        if (!fileInfo) {
            const [sub, err1] = await blob.createSubmission("0x")
            if (err1 || sub === null) {
                console.log('get submission error', err1);
                return;
            }
            console.log('File submission', sub);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            const signer = await provider.getSigner();
            const flow = getFlowContract(TESTNET_FLOW_ADDRESS, signer);

            const tx = await flow.submit(sub).catch(e => {
                setV(v => {
                    return {...v, error: `submit: ${e.reason || e}`}
                })
            });
            if (!tx) {
                return
            }
            setV(v => {
                return {...v, submitHash: tx.hash, loading: true}
            });
            await tx.wait();
            console.log('Submit hash', tx.hash);
        } else {
            setV(v=>{return {...v, submitHash: ''}})
        }
        setV(v=>{return {...v, loading: false,  info: 'uploading...'}})

        const errUp = await nhProvider.uploadFile(blob);
        if (errUp) {
            setV(v=>{return {...v, error: `Failed to upload: ${errUp}`}})
            return
        }
        // alert('Upload finished');
        setV(v=>{return {...v, info: 'uploaded'}})
        getFileInfo(tree.rootHash()!, false)
    }, [provider, file, nhProvider, fileInfo, getFileInfo])

    useEffect(()=>{
        if (!account) {
            return
        }
        (async ()=>{
            const signer = await provider.getSigner();
            const usdt = new Contract(ESPACE_TESTNET_USDT, ERC20ABI, signer);
            const allowance = await usdt.allowance(account, TESTNET_FLOW_ADDRESS);
            const balance = await usdt.balanceOf(account);
            setV(v=>{
                return {...v, allowance, balance}
            })
        })();
    }, [provider, account])
  return (
    <>
        <div><a href={'/storage'}>Explorer</a></div>
        <div style={{marginBottom: '10px'}}>
            <button onClick={connectWallet}>Connect wallet</button> {account}
        </div>
        <div style={{marginBottom: '10px'}}>
            <div>Token: {ESPACE_TESTNET_USDT}</div>
            <div>Flow: {TESTNET_FLOW_ADDRESS}</div>
            <div>Balance: {formatEther(v.balance)}</div>
            <div>Allowance: {formatEther(v.allowance)}</div>
            <button onClick={approve}>Approve USDT</button>
            <div>{v.approveHash}</div>
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
        {v.rootHash && <div>Root hash: {v.rootHash}</div>}
        {v.submitHash && <div>Submit on layer1: {v.submitHash}</div>}
        <div>{v.loading && <Loading/>}</div>
        {fileInfo && <div>uploadedSegNum: {fileInfo?.uploadedSegNum} finalized: {fileInfo.finalized.toString()}
            <button style={{marginLeft: '8px'}} onClick={()=>getFileInfo(v.rootHash!, true)}>refresh</button>
        </div>}
        <div>{v.info}</div>
        <div>{v.error}</div>

    </>
  )
}

export default App
