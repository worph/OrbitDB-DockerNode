import {createHelia, HeliaLibp2p} from 'helia';
import { createOrbitDB,OrbitDBAccessController } from '@orbitdb/core';
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { identify } from "@libp2p/identify";
import {Libp2p, createLibp2p } from 'libp2p';
import { EventEmitter } from 'events';
import {circuitRelayServer, circuitRelayTransport} from "@libp2p/circuit-relay-v2";
import {tcp} from "@libp2p/tcp";
import {webRTC, webRTCDirect} from "@libp2p/webrtc";
import {webSockets} from "@libp2p/websockets";
import {noise} from "@chainsafe/libp2p-noise";
import {yamux} from "@chainsafe/libp2p-yamux";
import {mplex} from "@libp2p/mplex";
import {mdns} from "@libp2p/mdns";
import {bootstrap} from "@libp2p/bootstrap";
import {autoNAT} from "@libp2p/autonat";
import {dcutr} from "@libp2p/dcutr";
import {createDelegatedRoutingV1HttpApiClient} from "@helia/delegated-routing-v1-http-api-client";
import {kadDHT} from "@libp2p/kad-dht";
import {ipnsValidator} from "ipns/validator";
import {ipnsSelector} from "ipns/selector";
import * as libp2pInfo from "libp2p/version";
import {keychain} from "@libp2p/keychain";
import {ping} from "@libp2p/ping";
import {uPnPNAT} from "@libp2p/upnp-nat";
import fs from 'fs';
import { peerIdFromKeys } from '@libp2p/peer-id';
import * as crypto from '@libp2p/crypto'; // Assuming this or a similar module for key generation


// Increase the maximum number of listeners
EventEmitter.defaultMaxListeners = 2000; // Or any number that suits your application's needs

//https://api.orbitdb.org/

function uint8ArrayToBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(base64) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

async function loadOrCreatePeerId(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const keyJson = fs.readFileSync(filePath, 'utf-8');
            const keyData = JSON.parse(keyJson);
            // Convert base64 strings back to Uint8Array for privateKey and publicKey
            const privateKeyBytes = base64ToUint8Array(keyData.privateKey);
            const publicKeyBytes = base64ToUint8Array(keyData.publicKey);
            return await peerIdFromKeys(publicKeyBytes, privateKeyBytes);
        } else {
            const privateKey = await crypto.keys.generateKeyPair('RSA', 2048);
            const peerId = await peerIdFromKeys(privateKey.public.bytes, privateKey.bytes);

            // Save keys to file, converting Uint8Array to base64 for JSON serialization
            const keyData = {
                publicKey: uint8ArrayToBase64(privateKey.public.bytes),
                privateKey: uint8ArrayToBase64(privateKey.bytes),
            };
            fs.writeFileSync(filePath, JSON.stringify(keyData));

            console.log(`Generated and saved a new PeerId to ${filePath}`);
            return peerId;
        }
    } catch (error) {
        console.error('Error in loadOrCreatePeerId:', error);
        throw error;
    }
}

export class DistributedDB {
    private db: any;
    private orbitdb: any;
    private ipfs: HeliaLibp2p<Libp2p>;
    private libp2p: Libp2p;


    async start() {
        const host = process.env.HOST;
        const domain = process.env.DOMAIN;
        let port = process.env.PORT;
        let peerId = await loadOrCreatePeerId('./peer-id.json');
        const libp2pOptions:any = {
            peerId: peerId,
            addresses: {
                listen: [
                    `/ip4/0.0.0.0/tcp/${port}/ws`,
                    `/ip4/0.0.0.0/tcp/${port}`,
                    '/webrtc'
                ],
                announce: host
                    ? [
                        `/ip4/${host}/tcp/${port}/p2p/${peerId?.toString()}`,
                        //`/dns4/${domain}/tcp/443/wss/p2p/${peerId?.toString()}`,
                        //`/dns4/${domain}/tcp/80/ws/p2p/${peerId?.toString()}`,
                    ]: undefined,
            },
            transports: [
                circuitRelayTransport({
                    discoverRelays: 1
                }),
                tcp(),
                webRTC(),
                webRTCDirect(),
                webSockets()
            ],
            connectionEncryption: [
                noise()
            ],
            streamMuxers: [
                yamux(),
                mplex()
            ],
            peerDiscovery: [
                mdns(),
                bootstrap({
                        list: [
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
                            process.env.BOOTSTRAP
                        ]})
            ],
            services: {
                autoNAT: autoNAT(),
                dcutr: dcutr(),
                dht: kadDHT({
                    validators: {
                        ipns: ipnsValidator
                    },
                    selectors: {
                        ipns: ipnsSelector
                    }
                }),
                identify: identify({
                    agentVersion: `${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.process.version}`
                }),
                keychain: keychain(),
                ping: ping(),
                relay: circuitRelayServer({
                    advertise: true
                }),
                upnp: uPnPNAT(),
                pubsub: gossipsub({
                    // neccessary to run a single peer
                    allowPublishToZeroPeers: true
                }),
            }
        }
        this.libp2p = await createLibp2p(libp2pOptions);
        this.ipfs = await createHelia({ libp2p:this.libp2p });
        this.orbitdb = await createOrbitDB({ ipfs:this.ipfs,id:"admin", directory: './data' });
        // Create / Open a database. Defaults to db type "events".
        this.db = await this.orbitdb.open(process.env.DB_NAME, {
            AccessController: OrbitDBAccessController({ write: ['*'] }),
            type: process.env.DB_TYPE
        });

        /*this.libp2p.addEventListener("peer:discovery", () => {
            console.log("Pairs: ", this.libp2p.getPeers());
        });*/
        console.log(`Node Address: /ip4/${host}/tcp/${port}/p2p/${this.libp2p.peerId.toString()}`);
        console.log(`OrbitDB DB address (${process.env.DB_TYPE}) : ${this.db.address}/${process.env.DB_NAME}`);
        //https://github.com/reseau-constellation/relai-libp2p/blob/main/src/relai.ts
        //await this.db.set("ping", "pong");//a reference record to test the db
        //console.log(await this.db.get("ping"));//a reference record to test the db
    }

    async put(key: string, value: string):Promise<string> {
        return await this.db.put(key, value);
    }

    async get(key: string):Promise<string> {
        return await this.db.get(key);
    }

    async stop() {
        await this.db.close();
        await this.orbitdb.stop();
        await this.ipfs.stop();
    }
}