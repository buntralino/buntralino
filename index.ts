import type {WindowOptions as NeutralinoWindowOptions} from '@neutralinojs/lib';
import EventEmitter from 'events';

import logger from './lib/logger';
import {spawnNeutralino} from './lib/spawnNeutralino';
import * as neuWindow from './lib/window';
import {getUid} from './lib/utils';
import type {Connection} from './lib/connections';
// eslint-disable-next-line no-duplicate-imports
import {dropConnection, registerConnection, getConnectionByToken, awaitConnection} from './lib/connections';
import fulfillRequests from './lib/requests';


export const events = new EventEmitter();


export {
    registerMethod,
    registerMethodMap
} from './lib/methodLibrary';
export * from './lib/window';
export {isConnectionOpen} from './lib/connections';

interface WindowOptions extends NeutralinoWindowOptions {
    name?: string;
}

const awaitedNames = new Set<string>();

// This websocket server is used by Neutralino to run commands in Bun.
const receiver = Bun.serve({
    fetch(req, server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
        // eslint-disable-next-line consistent-return
        return new Response('Upgrade failed', {
            status: 500
        });
    },
    websocket: {
        // this is called when a message is received
        async message(ws, message) {
            const payload = JSON.parse(message as string);
            if (payload.command === 'announceSelf') {
                if (!payload.NL_PORT || !payload.NL_TOKEN || !payload.name) {
                    throw new Error('🥟 Invalid payload for announceSelf: ', payload);
                }
                if (!awaitedNames.has(payload.name)) {
                    throw new Error('🥟 Attempt to announce a window we didn\'t create! Fishy!');
                }
                const wsToken = payload.NL_TOKEN.split('.').pop();
                const wsHref = `ws://localhost:${payload.NL_PORT}?connectToken=${wsToken}`;
                const ws = new WebSocket(wsHref);
                const connection: Connection = {
                    ws,
                    port: parseInt(payload.NL_PORT, 10),
                    neuToken: payload.NL_TOKEN,
                    bunToken: getUid(),
                    name: payload.name
                };
                ws.onopen = () => {
                    registerConnection(payload.name, connection);
                    neuWindow.sendEvent(connection, 'buntralinoRegisterParent', {
                        token: connection.bunToken,
                        port: receiver.port
                    });
                    logger`Registered ${payload.name} window 💅`;
                };
                return;
            }
            const connection = getConnectionByToken(payload.token);
            if (!connection) {
                ws.send(JSON.stringify({
                    error: 'Invalid token'
                }));
                return;
            }
            await fulfillRequests(payload, connection);
        }
    }
});

logger`Bun server listening on port ${receiver.port} 👂`;

const normalizeArgument = (arg: unknown) => {
    if (typeof arg !== 'string') {
        return arg;
    }
    let str = arg as string;
    str = str.trim();
    if (str.includes(' ')) {
        str = `"${str}"`;
    }
    return str;
};

export const create = async (url: string, options = {} as WindowOptions): Promise<string> => {
    const id = String(Math.random()
        .toString(36)
        .slice(2, 9));
    const name = options.name ?? id;
    awaitedNames.add(name);

    options = {
        useSavedState: false,
        ...options
    };
    const args: string[] = [];
    for (const key in options) {
        if (key === 'processArgs') {
            args.push(options.processArgs as string);
        }
        const cliKey: string = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        args.push(`--window-${cliKey}=${normalizeArgument(options[key as keyof WindowOptions])}`);
    }

    const proc = await spawnNeutralino([
        '--buntralino-port=' + receiver.port,
        '--buntralino-name=' + name,
        `--url=${url}`,
        ...args
    ]);
    events.emit('open', name);
    proc.exited.then(() => {
        logger`Neutralino window ${name} exited with code ${proc.exitCode} 🪦`;
        dropConnection(name);
        events.emit('close', name);
    });

    await awaitConnection(name);
    return id;
};
