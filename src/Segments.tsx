import {NHBlob, NHMerkleTree, NHProvider, SegmentWithProof} from "js-neurahive-sdk";
import {useCallback, useEffect, useState} from "react";
import {buildSegments} from "./tool.ts";

type SegReg = { error?: string, ok?: boolean }
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const TD = ({children})=>{
    return <td style={{background: 'white'}}>{children}</td>
}
export const Segments = ({file, tree, provider}: { file: NHBlob, tree: NHMerkleTree, provider: NHProvider }) => {
    const [list, setList] = useState<(SegmentWithProof & SegReg)[]>([])
    const [error, setError] = useState('')
    useEffect(() => {
        setList([])
        buildSegments(file, tree).then(res => {
            if (Array.isArray(res)) {
                setList(res)
            } else {
                setError(`build segments: ${res}`)
            }
        })
    }, [file, tree])
    const up = useCallback((seg: SegmentWithProof & SegReg) => {
        const props = {ok: false, error: ''}
        function update() {
            setList(list => {
                return list.map(e => {
                    return e.index === seg.index ? {...e, ...props} : e
                })
            })
        }
        update()
        provider.request({
            method: 'nrhv_uploadSegment',
            params: [seg],
        }).then((res) => {
            console.log(`upload ret`, res)
            props.ok = true
        }).catch(e => {
            props.error = `${e.data || ''} - ${e.message || e}`
        }).finally(() => {
            update()
        })
    }, [provider])
    return (
        <>
            {error}
            <table style={{background: 'black', borderSpacing: 1}}>
                <tbody>
                <tr>
                    <TD>index</TD>
                    <TD>proof.lemma</TD>
                    <TD>-</TD>
                    <TD>-</TD>
                </tr>
                {
                    list.map(p => {
                        return <tr key={p.index}>
                            <TD>{p.index}</TD>
                            <TD>{p.proof.lemma[0]}</TD>
                            <TD>
                                <button onClick={() => up(p)}>upload</button>
                            </TD>
                            <TD>
                                <div style={{color:'red', display: 'inline'}}>{p.error}</div>
                                {p.ok ? 'uploaded' : ''}
                            </TD>
                        </tr>
                    })
                }
                </tbody>
            </table>
        </>
    )
}