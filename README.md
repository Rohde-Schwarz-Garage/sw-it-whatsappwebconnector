# n8n WhatsApp Connector
## 📃 Disclaimers 
This project is not affiliated with, endorsed by, or sponsored by WhatsApp Inc. The use of this software is subject to WhatsApp's Terms of Service, which can be found [here](https://www.whatsapp.com/legal/terms-of-service).

### License
This project uses the [wweb.js](https://github.com/pedroslopez/whatsapp-web.js) library, which is licensed under the Apache 2.0 license. For more information, please refer to the [license documentation](https://www.apache.org/licenses/LICENSE-2.0).

### Disclaimer of Liability
The developers of this project are not responsible for any misuse of this software. Use at your own risk. Ensure that your use of this software complies with all relevant laws and regulations.

## 📺 Overview
The goal is to create an interface between WhatsApp and n8n that forwards messages to n8n and returns possible responses to WhatsApp. \
This is achieved via custom n8n nodes and an express webserver that sends events to webhooks.

## ⚙️ Functionality
The user starts a local instance of the `whatsapp-server`. The server prompts the user to link their account via the qr-code printed to the console. 
After that the server starts receiving messages and is capable of sending new messages. \
In n8n the user can create `WhatsApp Web Trigger` nodes which register their webhooks with the whatsapp-server. Whenever a webhook is triggered, the node is triggered and starts the workflow with the message data and media (if it exists). \
The `Send WhatsApp Web Message` node can be used to send messages as the WhatsApp client. They work by sending POST requests to the whatsapp-server

## 🔧 Setup
### WhatsApp Server 
To run the `whatsapp-server` which handles the WhatsApp Web connection and the incoming and outgoing messages, you will need to build and start the docker image:
1. Build the docker image
    1. Change to the `whatsapp-server` directory
    1. Run the following command to build the image
        ```sh
        docker build -t decepticons/n8nwa:1.0-bookworm .
        ```
1. Create a volume to store the authentication data
    ```sh
    docker volume create n8nwa_auth_store
    ```
1. Run the docker container
    ```sh
    docker run --rm --name n8nwa -p 8080:8080 -v n8nwa_auth_store:/run/sessionAuth decepticons/n8nwa:1.0-bookworm
    ```

Optionally there are the following environment variables available to configure the server:
```dosini
SERVER_PORT=8080                    # The port that the server runs on
WHATSAPP_AUTH_FOLDER=sessionAuth    # The folder where the WhatsApp credentials are stored. Should be mounted as a volume
MEDIA_DIRECTORY=media               # This folder is used to temporarily store media files that were received
FILE_CLEAR_INTERVAL_SECONDS=900     # The time in seconds after which temporary media files get deleted
```

**Linking the WhatsApp account:** \
After the container is run, it will print a qr code to the console every 3 minutes. \
Scan that code with your phone running WhatsApp by tapping the three dots and going to `Linked devices -> Link a device`.

> The server can generally be left running. If it not used frequently, the qr code might need to be re-scanned every now and then.

### n8n
To use the custom nodes in n8n, they needs to be copied into the correct folder inside the n8n data volume, since the node has not been published on npm. \
A pre-compiled zip folder of the custom nodes can be found in the releases.
1. In the docker volume that contains n8ns data (mounted as `/home/node/.n8n`), create a new folder called `custom`
1. Copy the contents of the zip folder into the newly created `custom` folder
1. Restart n8n and the new nodes should be available

To use the node in n8n after installing it, just search for the `Send WhatsApp Web Message` and `Whats App Web Trigger` nodes.

The WhatsAppWeb nodes use `WhatsApp Web API Credentials` which have the following options: 
- `API URL`: The URL pointing to the `whatsapp-server` instance. Do not include trailing slashes and only use HTTP, not HTTPS!
- `API Key` is not being used yet, just enter anything 

> It is important to have a firewall that prevents external users from accessing the n8nwa server!

## 🚀 Possible Improvements 
- **Web based login:** It would be nice to have a web endpoint that displays the current QR code to make login easier
- **Authorization:** It would be nice to have proper authorization in the express server so that it can be exposed to the public
- **Other Events:** It would be nice to allow the nodes to receive events other than the message received event

## 🖊️ Modifying the Source Code
### Prerequisites
 - Node.js **v20.18.0** ([Website](https://nodejs.org/en/download/prebuilt-installer))
 - Pnpm for developing the n8n node ([Website](https://pnpm.io/installation))
 - Recommended: Visual Studio Code ([Website](https://code.visualstudio.com/Download))

### Setup
1. Clone this repository (**git clone**)
1. Inside the `n8n-nodes` directory, run `pnpm install`
1. Inside the whatsapp-server directory run `npm install`

Now the projects can be worked on. \
To test the `whatsapp-server`, run `npm run dev` in the correct folder \

### Developing the n8n Nodes
Refer to the [n8n documentation](https://docs.n8n.io/integrations/creating-nodes/overview/) for a guide on how developing custom nodes works and how to test the nodes locally.

### Developing the WhatsApp Server
The `whatsapp-server` is built in TypeScript and can be run with this command (inside the `whatsapp-server` directory):
```sh
npm run dev
```

#### Structure overview
- `config/config.ts`: Responsible for reading the environment variables and providing a type saf way to access them. Also checks if all required variables are set when starting the server.

- `model/message.ts`: Defines all custom data structures needed to represent a WhatsApp message. Also proviedes a function to convert a wweb.js message to a custom message.
- `model/request.ts`: Defines the structure for requests made to the `POST message` endpoint and provides functions to convert them to a wweb.js message.

- `repository/eventManager.ts`: Defines the event types that a webhook can receive and dispatches events to the webhooks that are registered to it.
- `repository/mediaHandler.ts`: Responsible for managing all media received and deleting files that have been stored too long.
- `repository/mimetypes.json`: A list of all media mimetypes that are accepted by WhatsApp Web.

- `server/server.ts`: The express.js webserver providing the REST API to n8n.

- `whatsapp/messaging.ts`: A cache to temporarily store chat and contact information if they are frequently used.
- `whatsapp/whatsApp.ts`: Responsible for forwarding messages between the `whatsapp-server` and the `whatsapp-web.js` library.

- `app.ts`: The main file, responsible for starting all application components and dependency injection.

## 👨‍💻 Responsible
[@2000Dobby](https://github.com/2000Dobby)