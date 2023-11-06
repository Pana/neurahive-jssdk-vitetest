import {useCallback, useEffect, useMemo, useState} from 'react'
import {BrowserProvider, Contract, formatEther, parseEther} from 'ethers';
import {FileInfo, getFlowContract, NHBlob, NHMerkleTree, NHProvider, TESTNET_FLOW_ADDRESS,} from 'js-neurahive-sdk';
import {ERC20ABI, ESPACE_TESTNET_USDT} from './ERC20Abi';
import {Loading} from "./components/Loading.tsx";
import {Segments} from "./Segments.tsx";

function App() {
    const scanUrl = 'https://evmtestnet.confluxscan.net'
    const [file, setFile] = useState<File|null>(null);
    const [account, setAccount] = useState<string|null>(null);
    const [tree, setTree] = useState<NHMerkleTree|null>(null);
    const [blob, setBlob] = useState<NHBlob|null>(null);
    const [v, setV] = useState({
        loading: false, approveHash: '', submitHash:'', allowance: 0, balance: 0, error: '',
        info: '', rootHash: '', uploaded: 0,
    })
    const [showLayer1info, setShowLayer1info] = useState(true);
    const [fileInfo, setFileInfo] = useState<Partial<FileInfo>|null>({})
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
    const updateBalance = useCallback(()=>{
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
    const getFileInfo = useCallback((rootHash:string, checkError:boolean)=>{
        setFileInfo(null)
        nhProvider.getFileInfo(rootHash).then(res=>{
            setFileInfo(res || {})
            if (res?.finalized && checkError) {
                setV(v=>{return {...v, error: `Uploaded already.`}})
            }
        })
    }, [nhProvider])
    const uploadFile = useCallback(async () => {
        if (!blob) {
            return
        }
        setV(v=>{return {...v, info: '', error: ''}});
        const [tree, err] = await blob.merkleTree();
        if (tree === null || err) {
            console.log('get tree error', err);
            return;
        }
        setV(v=>{return {...v, loading: false,  info: 'uploading...', uploaded: 0}})

        const errUp = await nhProvider.uploadFile(blob, undefined, (p)=>{
            setV(v=>{return {...v, uploaded: p.uploaded}})
        }).catch(e=>e);
        if (errUp) {
            setV(v=>{return {...v, info: '', error: `Failed to upload: ${errUp.data || ''} ${errUp.message || errUp}`}})
            return
        }
        // alert('Upload finished');
        setV(v=>{return {...v, info: 'uploaded', uploaded: 0}})
        getFileInfo(tree.rootHash()!, false)
    }, [blob, nhProvider, getFileInfo])

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
            updateBalance()
        }).catch(e=>{
            setV(v=>{
                return {...v, loading: false, error: `${e}`}
            })
        })
    }, [updateBalance, provider])

    useEffect(() => {
        if (!file) {
            return
        }
        (async ()=>{
            setTree(null)
            const blob = new NHBlob(file);
            const [tree, err] = await blob.merkleTree();
            if (tree === null || err) {
                console.log('get tree error', err);
                return;
            }
            setTree(tree)
            setBlob(blob)
            setV(v=>{return {...v, submitHash:'', rootHash: tree.rootHash()!, info: '', error: ''}})
            getFileInfo(tree.rootHash()!, true)
        })()
    }, [nhProvider, file, getFileInfo]);

    const submitToLayer1 = useCallback(async ()=>{
        if (!blob) {
            return
        }
        setFileInfo(null)
        setV(v=>{return {...v, submitHash: ''}});
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
        setV(v=>{return {...v, loading: false}})
    }, [blob, provider])

    useEffect(() => {
        updateBalance()
    }, [updateBalance]);
  return (
    <>
        <div>
            <a href={'/storage'}>Explorer</a>
        </div>
        <div style={{marginBottom: '10px'}}>
            <button onClick={connectWallet}>Connect wallet</button> {account}
            <button style={{marginLeft: '8px'}} onClick={()=>setShowLayer1info(!showLayer1info)}>{showLayer1info ? 'less' : 'more'}</button>
        </div>
        <div style={{marginBottom: '10px', display: showLayer1info ? '' : 'none'}}>
            <div>Token: <a href={`${scanUrl}/token/${ESPACE_TESTNET_USDT}`} target={'_blank'}>{ESPACE_TESTNET_USDT}</a></div>
            <div>Flow: {TESTNET_FLOW_ADDRESS}</div>
            <div>Balance: {formatEther(v.balance)}</div>
            <div>Allowance: {formatEther(v.allowance)} <button onClick={updateBalance}>refresh</button></div>
            <button onClick={approve}>Approve USDT</button>
            <div>{v.approveHash}</div>
        </div>
        <div style={{marginTop: '8px'}}>
            <input id={'fileId'} type='file' onChange={(e) => {
                if (e.target.files && e.target.files?.length > 0) {
                    setFile(e.target?.files[0]);
                } else {
                    alert('Please select a file');
                }
            }}></input>
            <button onClick={()=>{
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                document.getElementById('fileId').value = null;
                setFile(null);}}
            >clear</button>
        </div>
        <div>Root hash: {v.rootHash}</div>
        <div>
        <button onClick={submitToLayer1}  style={{marginTop: '8px'}}>Submit to layer 1</button>
        {v.submitHash && <> <a href={`${scanUrl}/tx/${v.submitHash}`} target={'_blank'}>{v.submitHash}</a></>}
        </div>
        <div>{v.loading && <Loading/>}</div>
        <div  style={{marginTop: '8px'}}>
            File Info:
            uploadedSegNum: {fileInfo?.uploadedSegNum ?? '-'} finalized: {fileInfo?.finalized?.toString() || '-'}
            {v.rootHash && <button style={{margin: '0 8px'}} onClick={()=>getFileInfo(v.rootHash!, true)}>refresh</button>}
            {fileInfo === null ? 'loading':''}
        </div>
        <div><button onClick={uploadFile}>Upload All segments</button> {v.uploaded || ''}</div>
        <div>{v.info}</div>
        <div style={{color:'red'}}>{v.error}</div>
        <div style={{marginTop: '8px'}}>Segments:</div>
        {tree && <Segments file={blob!} tree={tree} provider={nhProvider}/>}
    </>
  )
}

export default App
