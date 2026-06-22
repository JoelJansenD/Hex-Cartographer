export default interface IEventHandler {
    canHandleEvent(event: Event): boolean;
    handleEvent(event: Event): void;
}