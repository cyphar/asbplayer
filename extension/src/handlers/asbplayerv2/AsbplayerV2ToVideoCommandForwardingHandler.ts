import { AsbPlayerToVideoCommandV2, Command, ExtensionToVideoCommand, Message } from "@project/common";

export default class AsbplayerToVideoCommandForwardingHandler {

    constructor() {
    }

    get sender() {
        return 'asbplayerv2';
    }

    get command() {
        return null;
    }

    handle(command: Command<Message>, sender: chrome.runtime.MessageSender) {
        const asbplayerToVideoCommand = command as AsbPlayerToVideoCommandV2<Message>;
        
        if (asbplayerToVideoCommand.tabId) {
            const extensionToVideoCommand: ExtensionToVideoCommand<Message> = {
                sender: 'asbplayer-extension-to-video',
                message: asbplayerToVideoCommand.message,
                src: asbplayerToVideoCommand.src
            };
            chrome.tabs.sendMessage(asbplayerToVideoCommand.tabId, extensionToVideoCommand);
        }

        return false;
    }
}