import {
    DEFAULT_CHUNK_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_SEGMENT_SIZE,
    NHBlob,
    NHMerkleTree,
    SegmentWithProof
} from "js-neurahive-sdk";

import {encodeBase64} from "ethers";

export const buildSegments = async (file: NHBlob, tree: NHMerkleTree)=>{
    let segIndex = 0
    const iter = file.iterateWithOffsetAndBatch(0, DEFAULT_SEGMENT_SIZE, true);
    const numChunks = file.numChunks();
    const fileSize = file.size();
    const ret = []
    let allDataUploaded = false;
    while(!allDataUploaded) {
        const [ok, err] = await iter.next();
        if(err) {
            return new Error('Failed to read segment');
        }

        if (!ok) {
            break;
        }

        let segment = iter.current();
        const proof = tree.proofAt(segIndex);

        const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;

        if (startIndex >= numChunks) {
            break;
        } else if (startIndex + segment.length / DEFAULT_CHUNK_SIZE >= numChunks) {
            const expectedLen = DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
            segment = segment.slice(0, expectedLen);
            allDataUploaded = true;
        }

        const segWithProof: SegmentWithProof = {
            root: tree.rootHash() as string,
            data: encodeBase64(segment),
            index: segIndex,
            proof: proof,
            fileSize,
        };
        ret.push(segWithProof)
        segIndex++;
    }

    return ret;
}