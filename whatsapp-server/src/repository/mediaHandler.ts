import { UploadedFile } from "express-fileupload";
import { config } from "../config/config";
import fs from 'fs';
import mimeTypes from './mimetypes.json';
import { Message } from "whatsapp-web.js";

type Map<U> = { [key: string]: U };


export default class MediaHandler {
    private _mediaDirectory: string;
    private _mediaCache: Map<{ path: string, updated: number }>;
    private _fileClearInterval: number;


    constructor() {
        this._mediaDirectory = config.mediaDirectory;
        this._mediaCache = {};
        this._fileClearInterval = config.fileClearInterval;

        this.createMediaDirectory();
        setInterval(() => this.deleteOldFiles(), this._fileClearInterval);
    }


    // If the service is stopped and some files have not been deleted, they will be there forever but thats ok for now
    /**
     * Deletes old files from the media cache and removes their references.
     * 
     * This method iterates through the `_mediaCache` to identify files that have
     * not been updated within the specified `_fileClearInterval`. It attempts to
     * delete these files from the filesystem and removes their entries from the
     * cache. Any errors encountered during file deletion are logged to the console.
     * 
     * @async
     * @returns {Promise<void>} A promise that resolves when the cleanup process is complete.
     */
    public async deleteOldFiles() {
        console.log("Cleaning up old files...");
        const now = Date.now();

        for (const [fileId, file] of Object.entries(this._mediaCache)) {
            if (now - file.updated <= this._fileClearInterval) continue;

            try {
                await fs.promises.unlink(file.path);
            } catch (err) {
                console.error(`Failed to delete file: ${err}`);
            }
            delete this._mediaCache[fileId];
        }

        console.log("Cleanup completed");
    }

    /**
     * Ensures that the media directory exists by creating it if it does not already exist.
     * This method checks for the existence of the directory specified by `_mediaDirectory`.
     * If the directory does not exist, it creates it recursively.
     *
     * @private
     */
    private createMediaDirectory() {
        if (fs.existsSync(this._mediaDirectory)) return;

        fs.mkdirSync(this._mediaDirectory, { recursive: true });
    }

    /**
     * Generates a unique file identifier.
     *
     * This method creates a UUID (Universally Unique Identifier) using the `crypto.randomUUID` function
     * and removes all hyphens from the generated string to produce a compact identifier.
     *
     * @returns {string} A unique, hyphen-free string identifier.
     */
    private generateFileId(): string {
        return crypto.randomUUID().replace(/-/g, '');
    }

    /**
     * Retrieves the file extension associated with a given MIME type.
     *
     * @param mimeType - The MIME type for which the file extension is required.
     * @returns The file extension corresponding to the provided MIME type.
     * @throws {Error} If the provided MIME type is not supported.
     */
    private getFileExtension(mimeType: string): string {
        const mimeTypeMap = mimeTypes.find((m) => m.mimetype === mimeType);
        if (!mimeTypeMap) throw new Error(`Unsupported MIME type: ${mimeType}`);

        return mimeTypeMap.extension;
    }

    /**
     * Retrieves the directory path for incoming media files. 
     * If the directory does not exist, it is created recursively.
     *
     * @returns {string} The path to the incoming media directory.
     */
    public getIncomingMediaDirectory(): string {
        const dir = `${this._mediaDirectory}/incoming`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        return dir;
    }

    /**
     * Retrieves the directory path for outgoing media files and ensures its existence.
     * If the directory does not exist, it is created recursively.
     *
     * @returns {string} The path to the outgoing media directory.
     */
    public getOutgoingMediaDirectory(): string {
        const dir = `${this._mediaDirectory}/userMedia`;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        return dir;
    }

    /**
     * Saves an uploaded media file to the outgoing media directory and caches its metadata.
     *
     * @param file - The uploaded file object containing the file data and metadata.
     * @returns The unique identifier (fileId) assigned to the saved file.
     * 
     * @throws {Error} If the file cannot be moved to the target directory.
     */
    public saveUploadedMedia(file: UploadedFile): string {
        const fileId = this.generateFileId();
        const fileExtension = this.getFileExtension(file.mimetype);

        const filePath = `${this.getOutgoingMediaDirectory()}/${fileId}.${fileExtension}`
        file.mv(filePath, (err) => {
            if (err) throw new Error(`Failed to move file: ${err}`);
        });

        this._mediaCache[fileId] = { path: filePath, updated: Date.now() };
        return fileId;
    }

    /**
     * Downloads the media associated with a given message and saves it to the incoming media directory.
     * 
     * @param msg - The message object containing the media to be downloaded.
     * @returns A promise that resolves to a tuple containing:
     *          - `fileName`: The name of the saved media file.
     *          - `mimeType`: The MIME type of the downloaded media.
     * @throws An error if the media download fails.
     */
    public async downloadMessageMedia(msg: Message): Promise<[fileName: string, mimeType: string]> {
        const data = await msg.downloadMedia();
        if (!data) throw new Error(`Failed to download media for message ${msg.id}`);

        const fileId = this.generateFileId();
        const fileName = `${fileId}.${this.getFileExtension(data.mimetype)}`;
        const filePath = `${this.getIncomingMediaDirectory()}/${fileName}`;

        await fs.promises.writeFile(filePath, data.data, "base64");

        this._mediaCache[fileId] = { path: filePath, updated: Date.now() };
        return [fileName, data.mimetype];
    }

    /**
     * Retrieves the file path associated with the given file ID from the media cache.
     *
     * @param fileId - The unique identifier of the file.
     * @returns The file path as a string if the file ID exists in the media cache, 
     *          or `undefined` if the file ID is not found.
     */
    public getFilePath(fileId: string): string | undefined {
        return this._mediaCache[fileId]?.path;
    }

    /**
     * Deletes a file from the file system and removes its reference from the media cache.
     *
     * @param fileId - The unique identifier of the file to be deleted.
     * @returns A promise that resolves when the file is successfully deleted or if the file does not exist.
     * 
     * @remarks
     * If the file does not exist in the media cache, the method returns early without performing any operations.
     * If an error occurs during the file deletion process, it is logged to the console, but the method ensures
     * that the file reference is removed from the cache regardless of the outcome.
     */
    public async deleteFile(fileId: string) {
        const file = this._mediaCache[fileId];
        if (!file) return;

        try {
            await fs.promises.unlink(file.path);
        } catch (err) {
            console.error(`Failed to delete file: ${err}`);
        } finally {
            delete this._mediaCache[fileId];
        }
    }
}