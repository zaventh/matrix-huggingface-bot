import Markdown from 'markdown-it';
import {MatrixClient} from "matrix-bot-sdk";
import {MessageEvent, StoredConversation} from "./interfaces.js";
import {HfInferenceEndpoint, TextGenerationOutput} from "@huggingface/inference";
import {HF_MODEL_PREFIX, HF_MAX_NEW_TOKENS} from "./env.js";

const md = Markdown();

export function parseMatrixUsernamePretty(matrix_username: string): string {
    if (matrix_username.includes(":") === false || matrix_username.includes("@") === false) {
        return matrix_username;
    }
    const withoutUrl = matrix_username.split(':')[0];
    return withoutUrl.split('@')[1]
}

export function isEventAMessage(event: any): event is MessageEvent {
    return event.type === 'm.room.message'
}

export async function sendError(client: MatrixClient, text: string, roomId: string, eventId: string): Promise<void> {
    Promise.all([client.setTyping(roomId, false, 500), client.sendText(roomId, text), client.sendReadReceipt(roomId, eventId)]);
}

/**
 * Send a thread reply.
 * @param {MatrixClient} client Matrix client
 * @param {string} roomId the room ID the event being replied to resides in
 * @param {string} rootEventId the root event of the thread
 * @param {string} text the plain text to reply with
 * @param {boolean} thread reply as a thread
 * @param {boolean} rich should the plain text be rendered to html using markdown?
 */
export async function sendReply(client: MatrixClient, roomId: string, rootEventId: string, text: string, thread: boolean = false, rich: boolean = false): Promise<void> {

    const contentCommon = {
        body: text,
        msgtype: "m.text",
    }

    const contentThreadOnly = {
        "m.relates_to": {
            event_id: rootEventId,
            is_falling_back: true,
            "m.in_reply_to": {
                "event_id": rootEventId
            },
            rel_type: "m.thread"
        }
    }

    const contentTextOnly = {
        "org.matrix.msc1767.text": text,
    }

    const renderedText = md.render(text)

    const contentRichOnly = {
        format: "org.matrix.custom.html",
        formatted_body: renderedText,
        "org.matrix.msc1767.message": [
            {
                "body": text,
                "mimetype": "text/plain"
            },
            {
                "body": renderedText,
                "mimetype": "text/html"
            }
        ]
    }

    const content = rich ? {...contentCommon, ...contentRichOnly} : {...contentCommon, ...contentTextOnly};
    const finalContent = thread ? {...content, ...contentThreadOnly} : content

    await client.sendEvent(roomId, "m.room.message", finalContent);
}

export async function sendChatGPTMessage(hfEndpoint: HfInferenceEndpoint, question: string, storedConversation: StoredConversation): Promise<TextGenerationOutput> {
    const template = HF_MODEL_PREFIX.replace("${question}", question);

    return hfEndpoint.textGeneration({
        inputs: template,
        parameters: {return_full_text: false, max_new_tokens: HF_MAX_NEW_TOKENS}
    })
}

export function wrapPrompt(wrapped: string) {
    const currentDateString = new Date().toLocaleDateString('en-us', {year: 'numeric', month: 'long', day: 'numeric'},);
    return `${wrapped}\nCurrent date: ${currentDateString}<|im_sep|>\n\n`
}
