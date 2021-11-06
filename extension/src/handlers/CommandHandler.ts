import { Command, Message } from '@project/common';

export interface CommandHandler {

    sender: string,
    command: string,
    handle: (command: Command<Message>, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean
}
