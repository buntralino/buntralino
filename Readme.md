![Buntralino logo](https://buntralino.github.io/Buntralino.png)

# Buntralino library for the Bun side

Buntralino unites Bun and Neutralino.js to make a simpler, lighter alternative to Electron and NW.js. Use Neutralino.js API at client and send harder tasks to Bun while keeping your development process easy.

Buntralino is a hybrid app development framework that lets you use web technologies (HTML, CSS, JavaScript, TypeScript) to make desktop apps. Buntralino applications work by creating a Bun application that launches and manages Neutralino.js windows. Neutralino.js windows can exchange information with Bun and each other in a client-server model through websockets, with you using a nice promise-based API. Bun is a faster alternative to Node.js or Deno, while Neutralino.js uses native OS' browser and augments it with native functions.

## Usage

```sh
bun install --save buntralino
```
```typescript
import * as buntralino from 'buntralino';

/**
 * Function map that allows running named functions with `buntralino.run` on the client (Neutralino) side.
 */
const functionMap = {
    sayHello: async (payload: {
        message: string
    }) => {
        await Bun.sleep(1000);
        return `Bun says "${payload.message}"!`;
    }
};

buntralino.registerMethodMap(functionMap);
// or buntralino.registerMethod('sayHello', functionMap.sayHello);

await buntralino.create('/', {
    // Name windows to easily manipulate them and distinguish them in events
    name: 'main'
    // Any options for Neutralino.window.create can go here
});

// Exit the app completely when the main window is closed without the `shutdown` command.
buntralino.events.on('close', (windowName: string) => {
    if (windowName === 'main') {
        // eslint-disable-next-line no-process-exit
        process.exit();
    }
});
```

Docs on all the functions coming SOON! But the sources are readable and straightforward, you can read them in `window.ts`.

## Development

```sh
git clone https://github.com/CosmoMyzrailGorynych/buntralino.git
cd ./buntralino
bun install
# And you're ready to code!
```