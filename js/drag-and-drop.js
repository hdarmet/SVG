
import {
    Context, Canvas, Events, getCanvasLayer, makeNotCloneable, makeObservable, makeSingleton, Memento, sortByDistance,
    Selection, getExtension, Cloning, BaseLayer
} from "./toolkit.js";
import {
    always, assert, evaluate
} from "./misc.js";
import {
    computeAngle, computePosition, win, Buttons, Rect, Colors, Fill
} from "./graphics.js";
import {
    ESet, List
} from "./collections.js";

export class DragOperation {

    constructor() {
    }

    _accept(element, x, y, event) {
        return this.accept(element, Canvas.instance.canvasX(x), Canvas.instance.canvasY(y), event);
    }

    _onDragStart(element, x, y, event) {
        return this.onDragStart(element, Canvas.instance.canvasX(x), Canvas.instance.canvasY(y), event);
    }

    _onDragMove(element, x, y, event) {
        return this.onDragMove(element, Canvas.instance.canvasX(x), Canvas.instance.canvasY(y), event);
    }

    _onDrop(element, x, y, event) {
        this.onDrop(element, Canvas.instance.canvasX(x), Canvas.instance.canvasY(y), event);
    }

    accept(element, x, y, event) {
        return true;
    }

    onDragStart(element, x, y, event) {
        this.start = { x, y, event, moved: false };
    }

    onDragMove(element, x, y, event) {
        if (!this.start.moved) {
            evaluate("doDragStart", () => {
                this.doDragStart(element, this.start.x, this.start.y, this.start.event);
            });
        }
        this.start.moved = true;
        evaluate("doDragMove", () => {
            this.doDragMove(element, x, y, event);
        });
    }

    onDrop(element, x, y, event) {
        if (this.start && this.start.moved) {
            evaluate("doDragDrop", () => {
                this.doDrop(element, x, y, event);
            });
        }
        delete this.start;
    }

    doDragStart(element, x, y, event) {
        this._fire(Events.DRAG_START, element);
    }

    doDragMove(element, x, y, event) {
        this._fire(Events.DRAG_MOVE, element);
    }

    doDrop(element, x, y, event) {
        this._fire(Events.DRAG_DROP, element);
    }
}
makeObservable(DragOperation);

export class DragElementOperation extends DragOperation {

    constructor() {
        super();
    }

    dropCancelled(element) {
        return element._drag.cancelled || element._drag.invalid;
    }

    cancelDrop(element) {
        element._drag.cancelled = true;
        element._cancelDrop && element._cancelDrop(this);
    }
}

/**
 * Move (not rotate) selected elements by drag and drop.
 */
export class DragMoveSelectionOperation extends DragElementOperation {

    constructor() {
        super();
    }

    /**
     * Accept drag/drop if element is movable.
     * @param element element to be dragged and dropped
     * @param x mouse position
     * @param y mouse position
     * @param event mouve event
     * @returns {boolean|*} true if drag/drop accepted
     */
    accept(element, x, y, event) {
        return (!Context.isReadOnly() && element.movable && super.accept(element, x, y, event));
    }

    /**
     * Defines the set of elements to be dragged. This set is made with relevant selected element (eventually extended :
     * including possible companion elements attached to selected element), but excluding the elements that are already
     * "naturally" dragged because they belong to another (ancestor) dragged element.
     * <p> Note that an element may refuse the drag operation by implementing accordingly the _acceptDrag
     * method.
     * @returns {Set}
     */
    dragSet(element) {
        /**
         * Check if an ancestor of an element is already selected
         * @param parent parent of the checked element
         * @param dragSet elements already selected
         * @returns {boolean} true if an ancestor ot the current element is already selected
         */
        function inSelection(parent, dragSet) {
            while (parent != null) {
                if (dragSet.has(parent)) {
                    return true;
                }
                parent = parent.parent;
            }
            return false;
        }
        let canvasLayer = element.canvasLayer;
        let dragSet = getExtension([element, ...Selection.instance.selection(element=>element.canvasLayer === canvasLayer)]);
        for (let element of [...dragSet]) {
            if (!element.movable || element._acceptDrag && !element._acceptDrag()) {
                dragSet.delete(element);
            }
        }
        for (let element of [...dragSet]) {
            if (inSelection(element.parent, dragSet)) {
                dragSet.delete(element);
            }
        }
        return dragSet;
    }

    doDragStart(element, x, y, event) {
        Memento.instance.open();
        if (!Selection.instance.selected(element.selectable)) {
            Selection.instance.adjustSelection(element, event);
        }
        Canvas.instance.clearGlass();
        this._dragSet = this.dragSet(element);
        for (let selectedElement of this._dragSet.values()) {
            Memento.register(selectedElement);
            let zoom = selectedElement.global.scalex;
            let gx = selectedElement.gx, gy = selectedElement.gy;
            selectedElement._drag = {
                // Memento to specifically revert that element if drop is cancelled for it (but not for the entire
                // selection.
                origin: selectedElement._memento(),
                // Delta from mouse position and element position
                dragX: (x-gx)/zoom,
                dragY: (y-gy)/zoom,
                // Original position of the element (when drag started). Never change.
                originX: gx,
                originY: gy,
                // Last position occupied by the element during the drag and drop process. Change for every mouse mouve
                // event.
                lastX: gx,
                lastY: gy,
                // Last valid position occupied by the element
                validX: gx,
                validY: gy,
                cloning: Cloning.IGNORE
            };
            let support = selectedElement.parent;
            selectedElement._draggedFrom(support, this._dragSet);
            // IMPORTANT ! Puts element on Glass AFTER eventual updates made by _draggedFrom
            Canvas.instance.putElementOnGlass(selectedElement, support, x, y);
            selectedElement._fire(Events.DRAG_START);
        }
        this._drag = {
            lastX : x,
            lastY : y,
            cloning: Cloning.IGNORE
        };
        Selection.instance.unselectAll();
        Canvas.instance._fire(DragMoveSelectionOperation.DRAG_MOVE_START, new ESet(this._dragSet));
    }

    /**
     * Sort selection so the most "advanced" selected element is processed first. An element is advanced if it is ahead
     * on the direction of the move.
     * @param dx offset on x axis of the drag move
     * @param dy offset on y axis of the drag move
     * @returns {List|*} the dagged elements (sorted)
     */
    sortedSelection(collection, dx, dy) {
        const FAR_AWAY = 10000;
        let index = 0, px = 0, py = 0;
        if (dx > 0) {
            index += 1;
            px = FAR_AWAY;
        }
        if (dx < 0) {
            index += 2;
            px = -FAR_AWAY;
        }
        if (dy > 0) {
            index += 3;
            py = FAR_AWAY;
        }
        if (dy < 0) {
            index += 6;
            py = -FAR_AWAY;
        }
        let result = new List(...collection);
        sortByDistance(result, px, py);
        return result;
    }

    _doHover(dx, dy) {
        for (let support of Canvas.instance.glassSupports) {
            if (support.hover) {
                support.hover(this.sortedSelection(Canvas.instance.getHoveredElements(support), dx, dy));
            }
        }
    }

    /**
     * Move an element still in the glass.
     * <p> The main problem solved here is the fact that an element can "switch" support. Each time an element hovers
     * another one (not dragged), it have to change support.
     * <p> Targets and supports are the same objects : before becoming a support, an element on the Sigma is a target
     * (target to be support :) ).
     * <p> Dragged element may react by implementing the _hoverOn method.
     * @param element element to drag
     * @param x mouse coordinate on X
     * @param y mouse coordinate on Y
     * @param event mouse event
     */
    doDragMove(element, x, y, event) {
        let dx = x - this._drag.lastX;
        let dy = y - this._drag.lastY;
        // get initial supports and move elements on glass without changing support.
        for (let selectedElement of this._dragSet) {
            Canvas.instance.moveElementOnGlass(selectedElement, null, x, y);
        }
        // get targets (using final positions of dragged elements)
        let targets = this.getTargets(this._dragSet);
        // Possible change of support...
        for (let selectedElement of this._dragSet) {
            let target = targets.get(selectedElement);
            // No target at all : element is outside viewport
            if (!target) {
                Canvas.instance.moveElementOnGlass(selectedElement, null,
                    selectedElement._drag.lastX, selectedElement._drag.lastY);
            } else /* support changed */ if (target.effective!==selectedElement.parent) {
                Canvas.instance.moveElementOnGlass(selectedElement, target.effective, x, y);
                selectedElement._drag.lastX = selectedElement.gx;
                selectedElement._drag.lastY = selectedElement.gy;
            }
        }
        for (let selectedElement of this._dragSet) {
            let target = targets.get(selectedElement);
            selectedElement._hoverOn(target.effective, this._dragSet, target.initial);
            selectedElement._fire(Events.DRAG_MOVE);
        }
        this._drag.lastX = x;
        this._drag.lastY = y;
        this._doHover(dx, dy);
        Canvas.instance._fire(DragMoveSelectionOperation.DRAG_MOVE_MOVE, this._dragSet);
        for (let selectedElement of this._dragSet) {
            selectedElement._drag.validX = selectedElement.gx;
            selectedElement._drag.validY = selectedElement.gy;
        }
    }

    /**
     * Find targets function.
     * Its a VERY optimized version (so it's a little bit complex).
     * <p> First, it finds all targets at once for a set of element in order to avoid "management" operations (like
     * hiding/showing the glass.
     * <p> Second, it contains two "passes". The first very efficient, to find targets for elements which center are on
     * the visible part of the canvas. The second pass is necessary to find targets "outside" the visible part of the
     * canvas, due to limitations of the getElementFromPoint DOM feature (i.e. the point must be visible to be
     * correctly processed). The second pass is much, much less efficient (x10 at least).
     * <p> Positions are computed before glass layer is hidden in order to get targets when elements are on glass
     * (dragMove)
     * @param elements set of elements on the glass. Note that a target record is an object containing two refences:
     * <ul>
     *     <li> the "effective" target : the one selected after all processing.
     *     <li> the "initial" target : the one the is pointed by the mouse.
     * </ul>
     */
    getTargets(elements) {

        /**
         * Adjust target identification, using the target found under mouse position.
         * <ul>
         *     <li>dragged element may "choose" another target (if getDropTarget is defined for this element)</li>
         * </ul>
         * @param element element dragged
         * @param target target found under mouse position.
         * @returns {*} the definitive target
         */
        function getTarget(element, target) {
            assert(target != null);
            if (target && target._dropTarget) {
                target = target._dropTarget(element);
            }
            if (element.getDropTarget) {
                return element.getDropTarget(target);
            }
            else {
                return target;
            }
        }

        let targets = new Map();
        let inside = new Map();
        // Keep positions of dragged elements on glass
        for (let element of elements) {
            let gx = element.gx;
            let gy = element.gy;
            inside.set(element, {gx, gy});
        }
        // Remove glass (global positions of elements cannot be computed from here)
        Canvas.instance.hideGlass();
        let outside = new Map();
        // Look for targets using previously kept positions
        // First case : position is on visible part of viewport
        for (let element of elements) {
            let {gx, gy} = inside.get(element);
            let target = Canvas.instance.getElementFromPoint(gx, gy);
            if (!target || !target.owner) {
                outside.set(element, {gx, gy});
            }
            else {
                targets.set(element, {initial:target.owner, effective:getTarget(element, target.owner)});
            }
        }
        // For those elements which positions are not on the visible area we have to move viewport position so the
        // element position become visible
        for (let element of outside.keys()) {
            let {gx, gy} = outside.get(element);
            Canvas.instance._adjustContent(-gx, -gy);
            let target = Canvas.instance.getElementFromPoint(0, 0);
            if (target && target.owner) {
                targets.set(element, {initial:target.owner, effective:getTarget(element, target.owner)});
            }
        }
        // Revert viewport and glass
        if (outside.size) Canvas.instance._adjustContent(0, 0);
        Canvas.instance.showGlass();
        return targets;
    }

    /**
     * Drop procedure.
     * <p>Drop protocol quite complex to fit to (I hope) every situation.
     * <p>For each selected element:
     * <ul><li> find a target.
     * </li><li> if one is found, ask the target for a substitute (target._dropTarget())
     * </li><li> if no target (after possible substitution), drop is marked as cancelled
     * </li><li> ask the (final) target if it accept the drop (target._acceptTarget(element))
     * </li><li> ask the selectedElement if it accept to be dropped on that target (element._acceptDrop(target))
     * </li><li> if target or element refuse drop, drop is marked as cancelled.
     * </li><li> if drop is NOT cancelled, element is dropped on target at the location given by the mouse.
     * </li></ul>
     * <p>From now, it is NOT possible to cancel drop. Verrry important, okay ?
     * <p>BUT, protocol is not finished !
     * <p>First case : drop is accepted :
     * <ul><li> target._receiveDrop(element, dragSet, initialTarget) is invoked
     * </li><li> target emits "receive-drop" event.
     * </li><li> element._dropped(target) is invoked.
     * </li><li> element emits "dropped" event.
     * </li></ul>
     * <p>Else : drop is NOT accepted :
     * <ul><li> parent._revertDrop(element) is invoked (parent is the element that owned the element before de drag and drop op)
     * </li><li> parent emits "revert-drop" event.
     * </li><li> element._revertDroppedIn(parent) is invoked.
     * </li><li> element emits "revert-dropped" event.
     * </li></ul>
     * <p>IMPORTANT : At any moment, an element may cancel its own drop it it calls its cancelDrop method. If this method
     * is invoked "too late" (after the acceptation phase), the cancelling is ignored.
     * <p>IMPORTANT : _XXX methods may NOT be defined. In this case,
     * - _XXX method is a predicate, if is defaulted to "true" (accept op) : e._XXX() => true
     * - _XXX method is an element finder, it is defaulted to the element itself e._XXX() => e
     * - _XXX is a procedure, it is defaulted to no op (do nothing).
     * @param element the element to be dropped
     */
    doDrop(element, x, y, event) {

        // Place element on targeted locations (but not on target for the moment).
        function placeDroppedElements(dragSet, targets) {
            for (let selectedElement of dragSet) {
                let target = targets.get(selectedElement);
                // Can be cancelled before processed due to another element action
                if (!this.dropCancelled(selectedElement)) {
                    if (target && target.effective && getCanvasLayer(target.effective._root) instanceof BaseLayer) {
                        let { x, y } = computePosition(selectedElement._root, target.effective._root);
                        selectedElement.setLocation(x, y);
                        selectedElement._drag.target = target.effective;
                    } else {
                        this.cancelDrop(selectedElement);
                    }
                }
            }
        }

        // Check for drop acceptation and execute requested drop cancellation.
        function checkDropAcceptance(dragSet, targets) {
            for (let selectedElement of dragSet) {
                let target = targets.get(selectedElement);
                // Can be cancelled before processed due to another element action
                if (!this.dropCancelled(selectedElement)) {
                    if (target && getCanvasLayer(target.effective._root) instanceof BaseLayer) {
                        // Ask target if it "accepts" the drop
                        if ((!target.effective._acceptDrop ||
                                !target.effective._acceptDrop(selectedElement, this._dragSet, target.initial)) ||
                            // Ask dropped element if it "accepts" the drop.
                            selectedElement._acceptDropped &&
                            !selectedElement._acceptDropped(target.effective, this._dragSet, target.initial))
                        {
                            this.cancelDrop(selectedElement);
                        }
                    }
                    else {
                        this.cancelDrop(selectedElement);
                    }
                }
            }
        }

        // Execute drop (or execute drop cancellation).
        function executeDrop(dragSet, targets) {
            let dropped = new ESet();
            for (let selectedElement of dragSet) {
                let target = targets.get(selectedElement);
                Canvas.instance.removeElementFromGlass(selectedElement);
                if (!this.dropCancelled(selectedElement)) {
                    // ... when drop succeeded
                    dropped.add(selectedElement);
                    // if dropped element can rotate, adjust angle to cancel "target" orientation
                    if (selectedElement.rotate) {
                        let angle = computeAngle(selectedElement._hinge, selectedElement._drag.target.content);
                        selectedElement.rotate(angle);
                    }
                    assert(selectedElement._drag.target._executeDrop);
                    selectedElement._drag.target._executeDrop(selectedElement, dragSet, target.initial);
                }
                else {
                    // ... when drop failed
                    // Do it BEFORE element is reinserted in the DOM tree !!
                    selectedElement._revert(selectedElement._drag.origin);
                    // Reinsert element in DOM tree
                    assert(selectedElement._drag.origin._parent._unexecuteDrop);
                    selectedElement._drag.origin._parent._unexecuteDrop(selectedElement);
                    // Do it AFTER element is reinserted in the DOM tree !!
                    selectedElement._recover && selectedElement._recover(selectedElement._drag.origin);
                }
                delete selectedElement._drag;
            }
            return dropped;
        }

        // Call final elements callbacks and emit drop events
        function finalizeAndFireEvents(dragSet, dropped, targets) {
            for (let selectedElement of dragSet) {
                let target = targets.get(selectedElement);
                if (dropped.has(selectedElement)) {
                    let effectiveTarget = selectedElement.parent;
                    assert(effectiveTarget._receiveDrop);
                    effectiveTarget._receiveDrop(selectedElement, this._dragSet, target.initial);
                    effectiveTarget._fire(Events.RECEIVE_DROP, selectedElement);
                    selectedElement._droppedIn(effectiveTarget, this._dragSet, target.initial);
                    selectedElement._fire(Events.DROPPED, effectiveTarget);
                }
                else {
                    let parent = selectedElement.parent;
                    if (parent) {
                        assert(parent._revertDrop);
                        parent._revertDrop(selectedElement);
                        parent._fire(Events.REVERT_DROP, selectedElement);
                    }
                    selectedElement._revertDroppedIn(parent);
                    selectedElement._fire(Events.REVERT_DROPPED, parent);
                }
            }
            Canvas.instance._fire(DragMoveSelectionOperation.DRAG_MOVE_DROP, new ESet(dropped.keys()));
        }

        let dx = x - this._drag.lastX;
        let dy = y - this._drag.lastY;
        let targets = this.getTargets(this._dragSet);
        let dragSet = [...this._dragSet];
        placeDroppedElements.call(this, dragSet, targets);
        checkDropAcceptance.call(this, dragSet, targets);
        // Starting from here, drop decision is done : accepted or cancelled
        let dropped = executeDrop.call(this, dragSet, targets);
        finalizeAndFireEvents.call(this, dragSet, dropped, targets);
        if (dropped.size===0) {
            Memento.instance.cancel();
        }
        this._doHover(dx, dy);
    }
}

DragMoveSelectionOperation.DRAG_MOVE_START = "drag-move-start";
DragMoveSelectionOperation.DRAG_MOVE_MOVE = "drag-move-move";
DragMoveSelectionOperation.DRAG_MOVE_DROP = "drag-move-drop";
makeNotCloneable(DragMoveSelectionOperation);
makeSingleton(DragMoveSelectionOperation);

export class DragRotateSelectionOperation extends DragElementOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        function rotationAreaSize(element) {
            return Math.max(Math.min(element.width*0.05, element.height*0.05), 10);
        }
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        if (!element.rotatable) return false;
        let imatrix = element.global.invert();
        let dragX = imatrix.x(x, y);
        let dragY = imatrix.y(x, y);
        let areaSize = rotationAreaSize(element);
        return (element.width/2-dragX<areaSize || element.width/2+dragX<areaSize) &&
            (element.height/2-dragY<areaSize || element.height/2+dragY<areaSize);
    }

    doDragStart(element, x, y, event) {
        Memento.instance.open();
        if (!Selection.instance.selected(element)) {
            Selection.instance.selectOnly(element);
        }
        element._drag = {
            matrix : element.global.invert()
        };
        let dragX = element._drag.matrix.x(x, y);
        let dragY = element._drag.matrix.y(x, y);
        element._drag.angle = Math.atan2(-dragX, dragY);
        for (let selectedElement of Selection.instance.selection()) {
            if (selectedElement.rotatable) {
                Memento.register(selectedElement);
                if (!selectedElement._drag) {
                    selectedElement._drag = {};
                }
                selectedElement._drag.origin = selectedElement._memento();
                selectedElement._drag.startAngle = selectedElement.angle;
            }
        }
    }

    doDragMove(element, x, y, event) {
        let lx = element._drag.matrix.x(x, y);
        let ly = element._drag.matrix.y(x, y);
        let angle = Math.atan2(-lx, ly);
        for (let selectedElement of Selection.instance.selection()) {
            if (selectedElement.rotatable) {
                selectedElement.rotate(selectedElement._drag.startAngle + deg(angle - element._drag.angle));
            }
        }
    }

    doDrop(element, x, y, event) {
        for (let selectedElement of Selection.instance.selection()) {
            if (selectedElement.rotatable) {
                if (!this.dropCancelled(selectedElement)) {
                    if ((selectedElement.parent._acceptRotation && !selectedElement.parent._acceptRotation(selectedElement)) ||
                        selectedElement._acceptRotated && !selectedElement._acceptRotated(selectedElement.parent)) {
                        this.cancelDrop(selectedElement);
                    }
                }
            }
        }
        let dropped = new ESet();
        for (let selectedElement of Selection.instance.selection()) {
            if (selectedElement.rotatable) {
                if (!this.dropCancelled(selectedElement)) {
                    dropped.add(selectedElement);
                }
                else {
                    selectedElement._revert(selectedElement._drag.origin);
                    selectedElement._recover && selectedElement._recover(selectedElement._drag.origin);
                }
                delete selectedElement._drag.origin;
            }
        }
        element._drag = null;
        if (dropped.size>0) {
            for (let selectedElement of Selection.instance.selection()) {
                if (selectedElement.rotatable) {
                    if (dropped.has(selectedElement)) {
                        let parent = selectedElement.parent;
                        parent._receiveRotation && target._receiveRotation(selectedElement);
                        parent._fire(Events.RECEIVE_ROTATION, selectedElement);
                        selectedElement._rotated && !selectedElement._rotated(parent);
                        selectedElement._fire(Events.ROTATED, parent);
                    }
                    else {
                        let parent = selectedElement.parent;
                        parent._revertRotation && selectedElement.parent._revertRotation(selectedElement);
                        parent._fire(Events.REVERT_ROTATION, selectedElement);
                        selectedElement._revertRotated && !selectedElement._revertRotated(parent);
                        selectedElement._fire(Events.REVERT_ROTATED, parent);
                    }
                }
            }
            this._fire(Events.DRAG_ROTATED, new ESet(dropped.keys()));
        }
        else {
            Memento.instance.cancel();
        }
    }
}
makeNotCloneable(DragRotateSelectionOperation);
makeSingleton(DragRotateSelectionOperation);

export class DragAreaOperation extends DragOperation {

    constructor() {
        super();
    }

    doDragStart(element, x, y, event) {
        Canvas.instance.addObserver(this);
        this._start = Canvas.instance.getPointOnGlass(x, y);
        let zoom = Canvas.instance.zoom;
        this._selectBackground = new Rect(this._start.x, this._start.y, 1, 1);
        this.setBackgroundParameters(this._selectBackground, zoom);
        Canvas.instance.putArtifactOnGlass(this._selectBackground);
        this._selectArea = new Rect(this._start.x, this._start.y, 1, 1);
        this.setFrameParameters(this._selectArea, zoom);
        Canvas.instance.putArtifactOnGlass(this._selectArea);
        this.doDragMove(element, x, y, event);
    }

    _notified(source, type, ...values) {
        if (source === Canvas.instance && type === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.setBackgroundParameters(this._selectBackground, zoom);
            this.setFrameParameters(this._selectArea, zoom);
        }
    }

    doDragMove(element, x, y, event) {
        let local = Canvas.instance.getPointOnGlass(x, y);
        let rw = local.x - this._start.x;
        let rh = local.y - this._start.y;
        let rx = this._start.x;
        let ry = this._start.y;
        if (rw < 0) {
            rw = -rw;
            rx = rx - rw;
        }
        if (rh < 0) {
            rh = -rh;
            ry = ry - rh;
        }
        this._selectBackground.attrs({ x: rx, y: ry, width: rw, height: rh });
        this._selectArea.attrs({ x: rx, y: ry, width: rw, height: rh });
    }

    doDrop(element, x, y, event) {
        this._doSelection(event, this._selectArea);
        win.setTimeout(()=>{
            Canvas.instance.removeArtifactFromGlass(this._selectBackground);
            Canvas.instance.removeArtifactFromGlass(this._selectArea);
        }, 1);
        Canvas.instance.removeObserver(this);
    }

}
makeNotCloneable(DragAreaOperation);

export class DragSelectAreaOperation extends DragAreaOperation {

    constructor() {
        super();
    }

    setBackgroundParameters(area, zoom) {
        area.attrs({
            fill: Fill.NONE,
            stroke: Colors.CRIMSON,
            stroke_opacity: 0.01,
            stroke_width : 2/zoom
        });
    }

    setFrameParameters(area, zoom) {
        area.attrs({
            fill: Fill.NONE,
            stroke: Colors.CRIMSON,
            stroke_opacity: 0.5,
            stroke_width : 2/zoom,
            stroke_dasharray : [5/zoom, 5/zoom]
        });
    }

    _doSelection(event, area) {
        function _inside(x, y, area) {
            return area.left <= x && area.right >= x && area.top <= y && area.bottom >= y;
        }
        function _isSelected(area, element) {
            let x0 = element.global.x(element.left, element.top);
            let y0 = element.global.y(element.left, element.top);
            let x1 = element.global.x(element.left, element.bottom);
            let y1 = element.global.y(element.left, element.bottom);
            let x2 = element.global.x(element.right, element.top);
            let y2 = element.global.y(element.right, element.top);
            let x3 = element.global.x(element.right, element.bottom);
            let y3 = element.global.y(element.right, element.bottom);
            return (
                _inside(x0, y0, area) ||
                _inside(x1, y1, area) ||
                _inside(x2, y2, area) ||
                _inside(x3, y3, area)
            );
        }
        function _doSelection(area, element) {
            let selement = element.selectable;
            if (selement && _isSelected(area, selement)) {
                Selection.instance.select(selement);
            } else {
                if (element.parts) {
                    for (let part of element.parts) {
                        _doSelection(area, part);
                    }
                }
                if (element.children) {
                    for (let child of element.children) {
                        _doSelection(area, child);
                    }
                }
            }
        }

        let selectArea = {
            left: area.globalMatrix.x(area.x, 0),
            top: area.globalMatrix.y(0, area.y),
            right: area.globalMatrix.x(area.x+area.width, 0),
            bottom: area.globalMatrix.y(0, area.y+area.height)
        };
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            Selection.instance.unselectAll();
        }
        for (let child of Canvas.instance.baseChildren) {
            _doSelection(area, child);
        }
    }

}
makeSingleton(DragSelectAreaOperation);

export class DragScrollOperation extends DragOperation {

    constructor() {
        super();
    }

    doDragStart(element, x, y, event) {
        let invert = Canvas.instance.baseGlobalMatrix.invert();
        this._drag = {
            x: invert.x(x, y),
            y: invert.y(x, y)
        };
        this.doDragMove(element, x, y, event);
    }

    doDragMove(element, x, y, event) {
        let invert = Canvas.instance.baseGlobalMatrix.invert();
        let localX = invert.x(x, y);
        let localY = invert.y(x, y);
        Canvas.instance.scrollTo(
            this._drag.x - localX, this._drag.y - localY
        );
    }
}
makeNotCloneable(DragScrollOperation);
makeSingleton(DragScrollOperation);

export class DragSwitchOperation extends DragOperation {
    constructor() {
        super();
        this._operations = new List();
    }

    addFirst(predicate, operation) {
        this._operations.addFirst({predicate, operation});
        return this;
    }

    add(predicate, operation) {
        this._operations.add({predicate, operation});
        return this;
    }

    accept(element, x, y, event) {
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        for (let record of this._operations) {
            if (record.predicate(element, x, y, event) && record.operation.accept(element, x, y, event)) {
                this._currentOperation = record.operation;
                return true;
            }
        }
        return false;
    }

    onDragStart(element, x, y, event) {
        this._currentOperation && this._currentOperation.onDragStart(element, x, y, event);
    }

    onDragMove(element, x, y, event) {
        this._currentOperation && this._currentOperation.onDragMove(element, x, y, event);
    }

    onDrop(element, x, y, event) {
        this._currentOperation && this._currentOperation.onDrop(element, x, y, event);
    }
}
makeNotCloneable(DragSwitchOperation);

export class ParentDragOperation extends DragOperation {
    constructor() {
        super();
    }

    accept(element, x, y, event) {
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        return element.parent != null && element.parent.__dragOp
            ? element.parent.__dragOp.accept(element.parent, x, y, event)
            : false;
    }

    onDragStart(element, x, y, event) {
        if (element.parent.__dragOp) {
            element.parent.__dragOp.onDragStart(element.parent, x, y, event);
        }
    }

    onDragMove(element, x, y, event) {
        if (element.parent.__dragOp) {
            element.parent.__dragOp.onDragMove(element.parent, x, y, event);
        }
    }

    onDrop(element, x, y, event) {
        if (element.parent.__dragOp) {
            element.parent.__dragOp.onDrop(element.parent, x, y, event);
        }
    }
}
makeNotCloneable(ParentDragOperation);
makeSingleton(ParentDragOperation);

export function ifWheelButton() {
    return event.button === Buttons.WHEEL_BUTTON;
}

export function ifRightButton() {
    return event.button === Buttons.RIGHT_BUTTON;
}

export const StandardDragMode = {
    SCROLL : "scroll",
    SELECT_AREA : "select-area",
    ELEMENT_DRAG : "element-drag",
    events: {
        SWITCH_MODE : "switch-mode"
    }
};
Object.defineProperty(StandardDragMode, "mode", {
    get() {
        return Context.dragMode ? Context.dragMode : StandardDragMode.ELEMENT_DRAG;
    },
    set(mode) {
        Context.dragMode = mode;
    }
});

export function ifStandardDragMode(mode) {
    return StandardDragMode.mode === mode;
}

export function ifScrollRequested() {
    return ifStandardDragMode(StandardDragMode.SCROLL) ||
        ifStandardDragMode(StandardDragMode.ELEMENT_DRAG) && ifWheelButton();
}

export function ifSelectAreaRequested() {
    return ifStandardDragMode(StandardDragMode.SELECT_AREA) ||
        ifStandardDragMode(StandardDragMode.ELEMENT_DRAG) && ifRightButton();
}

export function ifElementDragRequested() {
    return ifStandardDragMode(StandardDragMode.ELEMENT_DRAG);
}

export let standardDrag = new DragSwitchOperation()
    .add(ifScrollRequested, DragScrollOperation.instance)
    .add(ifSelectAreaRequested, DragSelectAreaOperation.instance)
    .add(ifElementDragRequested, new DragMoveSelectionOperation());

export let areaDrag = new DragSwitchOperation()
    .add(ifScrollRequested, DragScrollOperation.instance)
    .add(always, DragSelectAreaOperation.instance);

