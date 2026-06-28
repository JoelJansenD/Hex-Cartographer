import { LEFT_MOUSE_BUTTON, MIDDLE_MOUSE_BUTTON } from "../../../constants/Events";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class CanvasPanningListener implements Listener {
	public events: EventHandlerMap = {
		mousedown: this.onMouseDown.bind(this),
		mousemove: this.onMouseMove.bind(this),
		mouseup: this.onMouseUp.bind(this),
	};
	private _context: ListenerContext;

	constructor(context: ListenerContext) {
		this._context = context;
	}

	private onMouseDown(e: MouseEvent) {
		if(!this.canStartPanning(e)) return;

        // Prevent middle-click autoscroll while dragging the canvas.
		e.preventDefault();

		const state = this._context.getState();
		state.isPanning = true;
		this._context.setState(state, false);
	}

	private onMouseMove(e: MouseEvent) {
		const state = this._context.getState();
		if(!state.isPanning) return;

		state.data.offX += e.movementX;
		state.data.offY += e.movementY;
		this._context.setState(state, false);
	}

	private onMouseUp(e: MouseEvent) {
		const state = this._context.getState();
		if(!state.isPanning) return;

		state.isPanning = false;
		this._context.setState(state, false);
	}

	private canStartPanning(e: MouseEvent): boolean {
		return e.button === MIDDLE_MOUSE_BUTTON
			|| (e.button === LEFT_MOUSE_BUTTON && (e.ctrlKey || e.metaKey));
	}
}
