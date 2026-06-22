import IEventHandler from "./event-handler";

const eventHandlers: IEventHandler[] = [];

export default function resolveEventHandler(event: Event): IEventHandler | null {
    for(const handler of eventHandlers) {
        if(handler.canHandleEvent(event)) {
            return handler;
        }
    }

    return null;
}