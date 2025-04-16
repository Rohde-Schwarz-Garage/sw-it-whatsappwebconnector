import { config } from "./config/config";
import { EventManager } from "./repository/eventManager";
import MediaHandler from "./repository/mediaHandler";
import { Server } from "./server/server";
import { WhatsApp } from "./whatsapp/whatsApp";


// Loading the environment variables here assures that all required variables are set and the program
// will not start if any of them is missing.
config.loadEnv();

const mediaHandler = new MediaHandler();
const events = new EventManager();

const whatsApp = new WhatsApp(events, mediaHandler);
const server = new Server(events, whatsApp, mediaHandler);

whatsApp.connect();
server.start();