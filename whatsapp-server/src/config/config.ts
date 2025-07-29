class Config {
    // Define the properties that will hold the configuration values
    public serverPort: number = 8080;
    public whatsAppAuthFolder: string = "sessionAuth";
    public mediaDirectory: string = "media";
    public fileClearInterval: number = 1000 * 60 * 15; // 15 minutes


    // Load the environment variables and set the properties. This also ensures that all required environment variables are set.
    public loadEnv(): void {
        this.serverPort = this.getEnv<number>('SERVER_PORT', 8080);
        if (isNaN(this.serverPort) || this.serverPort <= 0) throw new Error(`Invalid SERVER_PORT: ${this.serverPort}. It must be a positive number.`);

        this.whatsAppAuthFolder = this.getEnv<string>('WHATSAPP_AUTH_FOLDER', 'sessionAuth');
        this.mediaDirectory = this.getEnv<string>('MEDIA_DIRECTORY', 'media');
        this.fileClearInterval = this.getEnv<number>('FILE_CLEAR_INTERVAL_SECONDS', 60 * 15) * 1000; // 15 minutes
        if (isNaN(this.fileClearInterval) || this.fileClearInterval <= 0) throw new Error(`Invalid FILE_CLEAR_INTERVAL_SECONDS: ${this.fileClearInterval}. It must be a positive number.`);
    }
    

    // Helper method to get an environment variable with a default value
    private getEnv<T>(key: string, defaultValue?: T): T {
        const value = process.env[key];

        if (value) return value as T;
        if (defaultValue) return defaultValue;

        throw new Error(`Environment variable '${key}' is not set but is required!`);
    }
}

// Create a singleton instance of the Config class that can be used in every module
export const config = new Config();