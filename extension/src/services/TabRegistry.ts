import Settings from "./Settings";

interface AsbplayerTabInfo {
    tab: chrome.tabs.Tab,
    id: string,
    timestamp: number
}

interface VideoElementInfo {
    tab: chrome.tabs.Tab,
    src: string,
    timestamp: number
}

export default class TabRegistry {

    asbplayers: {[key: number]: AsbplayerTabInfo};
    videoElements: {[key: string]: VideoElementInfo};
    
    private readonly settings: Settings;

    constructor(settings: Settings) {
        this.asbplayers = {};
        this.videoElements = {};
        this.settings = settings;
        setInterval(() => this.publish(), 1000);
    }

    async publish() {
        return new Promise((resolve, reject) => {
            const expired = Date.now() - 5000;

            for (const tabId in this.asbplayers) {
                const info = this.asbplayers[tabId];

                if (info.timestamp < expired) {
                    delete this.asbplayers[tabId];
                }
            }

            const activeTabs = [];

            for (const id in this.videoElements) {
                const info = this.videoElements[id];

                if (info.timestamp < expired) {
                    delete this.videoElements[id];
                } else {
                    activeTabs.push({
                        id: info.tab.id,
                        title: info.tab.title,
                        src: info.src
                    });
                }
            }

            chrome.tabs.query({}, (allTabs) => {
                if (!allTabs) {
                    // Chrome doesn't allow tabs to be queried when the user is dragging tabs
                    resolve(null);
                    return;
                }

                for (let t of allTabs) {
                    chrome.tabs.sendMessage(t.id, {
                        sender: 'asbplayer-extension-to-player',
                        message: {
                            command: 'tabs',
                            tabs: activeTabs
                        }
                    });
                }

                resolve(null);
            });
        });
    }

    async findAsbplayerTab(currentTab: chrome.tabs.Tab): Promise<number> {
        let chosenTabId = null;
        const now = Date.now();
        let min = null;

        for (const tabId in this.asbplayers) {
            const info = this.asbplayers[tabId];
            const elapsed = now - info.timestamp;

            if (min === null || elapsed < min) {
                min = elapsed;
                chosenTabId = tabId;
            }
        }

        if (chosenTabId) {
            return chosenTabId;
        }

        return new Promise(async (resolve, reject) => {
            chrome.tabs.create(
                {
                    active: false,
                    selected: false,
                    url: (await this.settings.get(['asbplayerUrl'])).asbplayerUrl,
                    index: currentTab.index + 1
                },
                (tab) => this._anyAsbplayerTab(resolve, reject, 0, 5)
            );
        });
    }

    private _anyAsbplayerTab(resolve: (value: number) => void, reject: (reason?: any) => void, attempt: number, maxAttempts: number): void {
        if (attempt >= maxAttempts) {
            reject(new Error("Could not find or create an asbplayer tab"));
            return;
        }

        for (const tabId in this.asbplayers) {
            resolve(Number(tabId));
            return;
        }

        setTimeout(() => this._anyAsbplayerTab(resolve, reject, attempt + 1, maxAttempts), 1000);
    }
}