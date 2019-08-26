'use strict';

import {
    evaluate
} from "./misc.js";
import {
    List
} from "./collections.js";
import {
    Matrix, deg
} from "./geometry.js";
import {win, doc,
    MouseEvents, KeyboardEvents, Buttons,
    Svg, Rect, Group, Translation, Fill, Colors, Visibility,
    localOffset, globalOffset, computePosition, computeAngle
} from "./graphics.js";
import {
    defineShadow
} from "./svgtools.js";

export const Context = {
    canvas : null,
    selectPredicate : null,
    memento : null,
    selection : null,
    readOnly : 0,
    freezed : 0
};

export const Events = {
    ADD : "add",
    REMOVE : "remove",
    ATTACH : "attach",
    DETACH : "detach",
    DELETED : "deleted",
    DISPLACE : "displace",
    DISPLACED : "displaced",
    SELECT : "select",
    UNSELECT : "unselect",
    ZOOM : "zoom",
    SCROLL : "scroll",
    RESIZE : "resize",
    GEOMETRY : "geometry",
    DRAG_START : "drag-start",
    DRAG_MOVE : "drag-move",
    DRAG_DROP : "drag-drop",
    DRAG_ROTATED : "drag-rotated",
    RECEIVE_DROP : "receive-drop",
    DROPPED : "dropped",
    REVERT_DROP : "revert-drop",
    REVERT_DROPPED : "revert-dropped",
    RECEIVE_ROTATION : "receive-rotation",
    ROTATED : "rotated",
    REVERT_ROTATION : "revert-rotation",
    REVERT_ROTATED : "revert-rotated",
    SCROLL_END : "scroll-end"
};

export function sortByDistance(elements, gx, gy) {

    elements.sort(function(elem1, elem2) {
        function distance(elem, x, y) {
            let egx = elem.gx;
            let egy = elem.gy;
            let distance = (egx - x) * (egx - x) + (egy - y) * (egy - y);
            return distance;
        }
        return distance(elem1, gx, gy) - distance(elem2, gx, gy);
    });

}

export class Box {

    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left() {
        return this.x;
    }

    get top() {
        return this.y;
    }

    get right() {
        return this.x+this.width;
    }

    get bottom() {
        return this.y+this.height;
    }

    get cx() {
        return this.x+this.width/2;
    }

    get cy() {
        return this.y+this.height/2;
    }

    add(box) {
        let left = Math.min(this.left, box.left);
        let top = Math.min(this.top, box.top);
        let right = Math.min(this.right, box.right);
        let bottom = Math.min(this.bottom, box.bottom);
        return new Box(left, top, right-left, bottom-top);
    }

    collides(box) {
        return (
            box.left < this.right &&
            box.right > this.left &&
            box.top < this.bottom &&
            box.bottom > this.top
        );
    }

}

export function getBox(points) {
    let left = points[0];
    let right = points[0];
    let top = points[1];
    let bottom = points[1];
    for (let index=2; index<points.length; index+=2) {
        if (points[index]<left) left=points[index];
        else if (points[index]>right) right=points[index];
        if (points[index+1]<top) top=points[index+1];
        else if (points[index+1]>bottom) bottom=points[index+1];
    }
    return new Box(left, top, right-left, bottom-top);
}

export function boundingBox(elements, targetMatrix) {
    let result = null;
    for (let element of elements) {
        let box = element.l2mbbox(targetMatrix);
        result===null ? result = box : result.add(box);
    }
    return result;
}

export function getCanvasLayer(artifact) {
    let parent = artifact.parent;
    while (parent != null) {
        if (parent._owner && parent._owner instanceof CanvasLayer) {
            return parent._owner;
        }
        parent = parent.parent;
    }
    return null;
}

export function makeObservable(superClass) {

    superClass.prototype.addObserver = function(observer) {
        Memento.register(this);
        this._addObserver(observer);
    };

    superClass.prototype.removeObserver = function(observer) {
        Memento.register(this);
        this._removeObserver(observer);
    };

    superClass.prototype._addObserver = function(observer) {
        if (!this._observers) {
            this._observers = new Set();
        }
        this._observers.add(observer);
    };

    superClass.prototype._removeObserver = function(observer) {
        if (this._observers) {
            this._observers.delete(observer);
            if (this._observers.size === 0) {
                delete this._observers;
            }
        }
    };

    superClass.prototype._fire = function(event, ...values) {
        if (this._observers) {
            for (let observer of this._observers) {
                observer._notified(this, event, ...values);
            }
        }
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            if (this._observers) {
                memento._observers = new Set(this._observers);
            }
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            if (memento._observers) {
                this._observers = new Set(memento._observers);
            }
            else {
                delete this._observers;
            }
            return this;
        };
    }

    return superClass;
}

export function makeCloneable(superClass) {

    Object.defineProperty(superClass.prototype, "cloneable", {
        configurable: true,
        enumerable: false,
        get: function () {
            return true;
        }
    });

}

export function CloneableObject() {}
makeCloneable(CloneableObject);

export function makeNotCloneable(superClass) {

    Object.defineProperty(superClass.prototype, "notCloneable", {
        configurable: true,
        enumerable: false,
        get: function () {
            return true;
        }
    });

}

export function NotCloneableObject() {}
makeNotCloneable(NotCloneableObject);

export class DragOperation {

    constructor() {
    }

    _accept(element, x, y, event) {
        return this.accept(element, Context.canvas.canvasX(x), Context.canvas.canvasY(y), event);
    }

    _onDragStart(element, x, y, event) {
        return this.onDragStart(element, Context.canvas.canvasX(x), Context.canvas.canvasY(y), event);
    }

    _onDragMove(element, x, y, event) {
        return this.onDragMove(element, Context.canvas.canvasX(x), Context.canvas.canvasY(y), event);
    }

    _onDrop(element, x, y, event) {
        this.onDrop(element, Context.canvas.canvasX(x), Context.canvas.canvasY(y), event);
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
        if (this.start.moved) {
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

/**
 * Move (not rotate) selected elements by drag and drop.
 */
export class DragMoveSelectionOperation extends DragOperation {

    constructor() {
        super();
    }

    /**
     * Accept drag/drop if element is moveable.
     * @param element element to be dragged and dropped
     * @param x mouse position
     * @param y mouse position
     * @param event mouve event
     * @returns {boolean|*} true if drag/drop accepted
     */
    accept(element, x, y, event) {
        return (!Context.readOnly && element.moveable && super.accept(element, x, y, event));
    }

    /**
     * For future exention...
     * @param selection
     * @returns {Set}
     */
    extendsSelection(selection) {
        return new Set(selection);
    }

    /**
     * Defines the set of elements to be dragged. This set is made with relevant selected element (eventually extended :
     * including possible companion elements attached to selected element), but excluding the elements that are already
     * "naturally" dragged because they belong to another (ancestor) dragged element.
     * <p> Note that an element may refuse the drag operation by implementing accordingly the _acceptDrag
     * method.
     * @returns {Set}
     */
    dragSet() {
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
        let dragSet = this.extendsSelection(Context.selection.selection(element=>true));
        for (let element of [...dragSet]) {
            if (!element.moveable ||
                element._acceptDrag && !element._acceptDrag() ||
                inSelection(element.parent, dragSet)) {
                dragSet.delete(element);
            }
        }
        return dragSet;
    }

    doDragStart(element, x, y, event) {
        Context.memento.open();
        this._dragSorted = new List();
        if (!Context.selection.selected(element)) {
            Context.selection.adjustSelection(element, event);
        }
        Context.canvas.clearGlass();
        this._dragSet = this.dragSet();
        for (let selectedElement of this._dragSet.values()) {
            Memento.register(selectedElement);
            selectedElement._drag = {
                origin: selectedElement._memento(),
                dragX: x-selectedElement.gx,
                dragY: y-selectedElement.gy,
                originX: x,
                originY: y,
                lastX: x,
                lastY: y
            };
            let support = selectedElement.parent;
            Context.canvas.putElementOnGlass(selectedElement, support, x, y);
            selectedElement._draggedFrom && selectedElement._draggedFrom(support, this._dragSet);
            selectedElement._fire(Events.DRAG_START);
        }
        this._drag = {
            lastX : x,
            lastY : y
        };
        this._fire(Events.DRAG_START, new Set(this._dragSet));
    }

    /**
     * Sort selection so the most "advanced" selected element is processed first. An element is advanced if it is ahead
     * on the direction of the move.
     * @param dx offset on x axis of the drag move
     * @param dy offset on y axis of the drag move
     * @returns {List|*} the dagged elements (sorted)
     */
    sortedSelection(dx, dy) {
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
        let result = this._dragSorted && this._dragSorted[index];
        if (!result) {
            result = [...this._dragSet];
            sortByDistance(result, px, py);
            this._dragSorted[index] = result;
        }
        return result;
    }

    _doHover() {
        for (let support of Context.canvas.glassSupports) {
            if (support.hover) {
                support.hover(Context.canvas.getHoveredElements(support));
            }
        }
    }

    /**
     * Move an element still in the glass.
     * <p> The main problem solved here is the fact that an element can "switch" support. Each time an element hovers
     * another one (not dragged), it have to change support.
     * <p> targets and supports are the same objects : before becoming a support, an element on the board is a target
     * (target to be support :) ).
     * @param element element to drag
     * @param x mouse coordinate on X
     * @param y mouse coordinate on Y
     * @param event mouse event
     */
    doDragMove(element, x, y, event) {
        let sortedSelection = this.sortedSelection(x - this._drag.lastX, y - this._drag.lastY);
        // get initial supports and move elements on glass without changing support.
        for (let selectedElement of sortedSelection) {
            selectedElement._drag.lastX = selectedElement.lx;
            selectedElement._drag.lastY = selectedElement.ly;
            Context.canvas.moveElementOnGlass(selectedElement, null, x, y);
        }
        // get targets (using final positions of dragged elements)
        let targets = this.getTargets(this._dragSet);
        // Possible change of support...
        for (let selectedElement of sortedSelection) {
            let target = targets.get(selectedElement);
            // No target at all : element is outside viewport
            if (!target) {
                Context.canvas.moveElementOnGlass(selectedElement, null,
                    selectedElement._drag.lastX, selectedElement._drag.lastY);
            } else // Support has changed
                if (target!==selectedElement.parent) {
                Context.canvas.moveElementOnGlass(selectedElement, target, x, y);
            }
            selectedElement._fire(Events.DRAG_MOVE);
        }
        this._drag.lastX = x;
        this._drag.lastY = y;
        this._fire(Events.DRAG_MOVE, sortedSelection);
        this._doHover();
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
     * @param elements set of elements on the glass
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
            console.assert(target != null);
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
        Context.canvas.hideGlass();
        let outside = new Map();
        // Look for targets using previously kept positions
        // First case : position is on visible part of viewport
        for (let element of elements) {
            let {gx, gy} = inside.get(element);
            let target = Context.canvas.getElementFromPoint(gx, gy);
            if (!target || !target.owner) {
                outside.set(element, {gx, gy});
            }
            else {
                targets.set(element, getTarget(element, target.owner));
            }
        }
        // For those elements which positions are not on the visible area we have to move viewport position so the
        // element position become visible
        for (let element of outside.keys()) {
            let {gx, gy} = outside.get(element);
            Context.canvas._adjustContent(-gx, -gy);
            let target = Context.canvas.getElementFromPoint(0, 0);
            if (target) targets.set(element, getTarget(element, target.owner));
        }
        // Revert viewport and glass
        if (outside.size) Context.canvas._adjustContent(0, 0);
        Context.canvas.showGlass();
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
     * <ul><li> target._receiveDrop(element) is invoked
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
     * <p>IMPORTANT : In ALL cases, the element.attach(parent) is invoked to put element into target or to revert to
     * previous parent. So even in case of cancelDrop, attach (and associated events...) are activated.
     * @param element the element to be dropped
     */
    doDrop(element, x, y, event) {
        let targets = this.getTargets(this._dragSet);
        // Check for drop acceptation and execute requested drop cancellation.
        for (let selectedElement of [...this._dragSet]) {
            let target = targets.get(selectedElement);
            // Can be cancelled before processed due to another element action
            if (!selectedElement._dropCancelled) {
                if (target && target._dropTarget) {
                    target = target._dropTarget();
                }
                if (target && target.content && getCanvasLayer(target._root) instanceof BaseLayer) {
                    let { x, y } = computePosition(selectedElement._root, target.content);
                    selectedElement.move(x, y);
                    // Ask target if it "accepts" the drop
                    if ((target._acceptDrop && !target._acceptDrop(selectedElement)) ||
                        // Ask dropped element if it "accepts" the drop.
                        selectedElement._acceptDropped && !selectedElement._acceptDropped(target)) {
                        selectedElement.cancelDrop();
                    }
                    else {
                        selectedElement._drag.target = target;
                    }
                } else {
                    selectedElement.cancelDrop();
                }
            }
        }
        // Starting from here, drop decision is done : accepted or cancelled
        // Execute drop (or execute drop cancellation).
        let dropped = new Set();
        for (let selectedElement of [...this._dragSet]) {
            Context.canvas.removeElementFromGlass(selectedElement);
            if (!selectedElement.dropCancelled()) {
                // ... when drop succeeded
                dropped.add(selectedElement);
                // if dropped element can rotate, adjust angle to cancel "target" orientation
                if (selectedElement.rotate) {
                    let angle = computeAngle(selectedElement._hinge, selectedElement._drag.target.content);
                    selectedElement.rotate(angle);
                }
                selectedElement.attach(selectedElement._drag.target);
            }
            else {
                // ... when drop failed
                selectedElement._revert(selectedElement._drag.origin);
                selectedElement._recover && selectedElement._recover(selectedElement._drag.origin);
                selectedElement._drag.origin._parent._add(selectedElement);
            }
            delete selectedElement._drag;
        }
        // Call final elements callbacks and emit drop events
        if (dropped.size!==0) {
            for (let selectedElement of [...this._dragSet]) {
                if (dropped.has(selectedElement)) {
                    let target = selectedElement.parent;
                    target._receiveDrop && target._receiveDrop(selectedElement);
                    target._fire(Events.RECEIVE_DROP, selectedElement);
                    selectedElement._droppedIn && !selectedElement._droppedIn(target);
                    selectedElement._fire(Events.DROPPED, target);
                }
                else {
                    let parent = selectedElement.parent;
                    parent._revertDrop && parent._revertDrop(selectedElement);
                    parent._fire(Events.REVERT_DROP, selectedElement);
                    selectedElement._revertDroppedIn && !selectedElement._revertDroppedIn(parent);
                    selectedElement._fire(Events.REVERT_DROPPED, parent);
                }
            }
            this._fire(Events.DRAG_DROP, new Set(dropped.keys()));
        }
        else {
            Context.memento.cancel();
        }
        this._doHover();
    }
}
makeNotCloneable(DragMoveSelectionOperation);
Context.moveSelectionDrag = new DragMoveSelectionOperation();


class DragRotateSelectionOperation extends DragOperation {

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
        Context.memento.open();
        if (!Context.selection.selected(element)) {
            Context.selection.selectOnly(element);
        }
        element._drag = {
            matrix : element.global.invert()
        };
        let dragX = element._drag.matrix.x(x, y);
        let dragY = element._drag.matrix.y(x, y);
        element._drag.angle = Math.atan2(-dragX, dragY);
        for (let selectedElement of Context.selection.selection()) {
            if (selectedElement.rotatable) {
                Memento.register(selectedElement);
                selectedElement._drag.origin = selectedElement._memento();
                if (!selectedElement._drag) {
                    selectedElement._drag = {};
                }
                selectedElement._drag.startAngle = selectedElement.angle;
            }
        }
    }

    doDragMove(element, x, y, event) {
        let lx = element._drag.matrix.x(x, y);
        let ly = element._drag.matrix.y(x, y);
        let angle = Math.atan2(-lx, ly);
        for (let selectedElement of Context.selection.selection()) {
            if (selectedElement.rotatable) {
                selectedElement.rotate(selectedElement._drag.startAngle + deg(angle - element._drag.angle));
            }
        }
    }

    doDrop(element, x, y, event) {
        element._drag = null;
        for (let selectedElement of Context.selection.selection()) {
            if (selectedElement.rotatable) {
                if (!selectedElement._dropCancelled) {
                    if ((selectedElement.parent._acceptRotation && !selectedElement.parent._acceptRotation(selectedElement)) ||
                        selectedElement._acceptRotated && !selectedElement._acceptRotated(selectedElement.parent)) {
                        selectedElement.cancelDrop();
                    }
                }
            }
        }
        let dropped = new Set();
        for (let selectedElement of Context.selection.selection()) {
            if (selectedElement.rotatable) {
                if (!selectedElement.dropCancelled()) {
                    dropped.add(selectedElement);
                }
                else {
                    selectedElement._revert(selectedElement._drag.origin);
                    selectedElement._recover && selectedElement._recover(selectedElement._drag.origin);
                }
                delete selectedElement._drag.origin;
            }
        }
        if (dropped.size>0) {
            for (let selectedElement of Context.selection.selection()) {
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
            this._fire(Events.DRAG_ROTATED, new Set(dropped.keys()));
        }
        else {
            Context.memento.cancel();
        }
    }
}
makeNotCloneable(DragRotateSelectionOperation);
Context.rotateSelectionDrag = new DragRotateSelectionOperation();

export class DragSelectAreaOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        return super.accept(element, x, y, event);
    }

    doDragStart(element, x, y, event) {
        this._start = Context.canvas.getPointOnGlass(x, y);
        this._selectArea = new Rect(this._start.x, this._start.y, 1, 1)
            .attrs({
                fill: Fill.NONE,
                stroke: Colors.CRIMSON,
                stroke_width: 2,
                stroke_opacity: 0.9,
                stroke_dasharray: [5,5]
            });
        Context.canvas.putArtifactOnGlass(this._selectArea);
        this.doDragMove(element, x, y, event);
    }

    doDragMove(element, x, y, event) {
        let local = Context.canvas.getPointOnGlass(x, y);
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
        this._selectArea.attrs({ x: rx, y: ry, width: rw, height: rh });
    }

    doDrop(element, x, y, event) {
        this._doSelection(event);
        Context.canvas.removeArtifactFromGlass(this._selectArea);
    }

    _doSelection(event) {
        let selectArea = {
            left: this._selectArea.globalMatrix.x(this._selectArea.x, 0),
            top: this._selectArea.globalMatrix.y(0, this._selectArea.y),
            right: this._selectArea.globalMatrix.x(this._selectArea.x+this._selectArea.width, 0),
            bottom: this._selectArea.globalMatrix.y(0, this._selectArea.y+this._selectArea.height)
        };
        function _inside(x, y, area) {
            return area.left <= x && area.right >= x && area.top <= y && area.bottom >= y;
        }
        function _isSelected(element) {
            let x0 = element.global.x(element.left, element.top);
            let y0 = element.global.y(element.left, element.top);
            let x1 = element.global.x(element.left, element.bottom);
            let y1 = element.global.y(element.left, element.bottom);
            let x2 = element.global.x(element.right, element.top);
            let y2 = element.global.y(element.right, element.top);
            let x3 = element.global.x(element.right, element.bottom);
            let y3 = element.global.y(element.right, element.bottom);
            return (
                _inside(x0, y0, selectArea) ||
                _inside(x1, y1, selectArea) ||
                _inside(x2, y2, selectArea) ||
                _inside(x3, y3, selectArea)
            );
        }
        function _doSelection(element) {
            let selement = element.selectable;
            if (selement && _isSelected(selement)) {
                Context.selection.select(selement);
            } else {
                if (element.children) {
                    for (let child of element.children) {
                        _doSelection(child);
                    }
                }
            }
        }
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            Context.selection.unselectAll();
        }
        for (let child of Context.canvas.baseChildren) {
            _doSelection(child);
        }
    }

}
makeNotCloneable(DragSelectAreaOperation);
Context.selectAreaDrag = new DragSelectAreaOperation();

export class DragScrollOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        return event.button === Buttons.RIGHT_BUTTON;
    }

    doDragStart(element, x, y, event) {
        let invert = Context.canvas.baseGlobalMatrix.invert();
        this._drag = {
            x: invert.x(x, y),
            y: invert.y(x, y)
        };
        this.doDragMove(element, x, y, event);
    }

    doDragMove(element, x, y, event) {
        let invert = Context.canvas.baseGlobalMatrix.invert();
        let localX = invert.x(x, y);
        let localY = invert.y(x, y);
        Context.canvas.scrollTo(
            this._drag.x - localX, this._drag.y - localY
        );
    }
}
makeNotCloneable(DragScrollOperation);
Context.scrollDrag = new DragScrollOperation();

export class DragSwitchOperation extends DragOperation {
    constructor() {
        super();
        this._operations = new List();
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
        return element.parent != null && element.parent.dragOperation
            ? element.parent.dragOperation.accept(element.parent, x, y, event)
            : false;
    }

    onDragStart(element, x, y, event) {
        if (element.parent.dragOperation) {
            element.parent.dragOperation.onDragStart(element.parent, x, y, event);
        }
    }

    onDragMove(element, x, y, event) {
        if (element.parent.dragOperation) {
            element.parent.dragOperation.onDragMove(element.parent, x, y, event);
        }
    }

    onDrop(element, x, y, event) {
        if (element.parent.dragOperation) {
            element.parent.dragOperation.onDrop(element.parent, x, y, event);
        }
    }
}
makeNotCloneable(ParentDragOperation);
Context.parentDrag = new ParentDragOperation();

Context.scrollOrSelectAreaDrag = new DragSwitchOperation()
    .add(()=>true, Context.scrollDrag)
    .add(()=>true, Context.selectAreaDrag);

export class CanvasLayer {

    constructor(canvas) {
        this._canvas = canvas;
        this._root = new Group();
        this._root.that = this;
        this._root._owner = this;
        canvas.addObserver(this);
    }

    _notified(source, type, ...values) {
    }

    get canvas() {
        return this._canvas;
    }

    hide() {
        this._root.visibility = Visibility.HIDDEN;
        return true;
    }

    show() {
        this._root.visibility = Visibility.VISIBLE;
        return true;
    }

    local2global(x, y) {
        return this._root.local2global(x, y);
    }

    global2local(x, y) {
        return this._root.global2local(x, y);
    }
}
makeNotCloneable(CanvasLayer);

export class BaseLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas);
    }

    _adjustGeometry(matrix = this._root.matrix) {
        if (this.width!==undefined && this.height!==undefined) {
            let scale = Math.max(
                this.clientWidth / this.width,
                this.clientHeight / this.height
            );
            if (scale > matrix.scalex) {
                matrix = Matrix.scale(scale, scale, 0, 0);
            }
            let invertMatrix = matrix.invert();
            let dx = invertMatrix.x(-this.clientWidth / 2, -this.clientHeight / 2);
            let dy = invertMatrix.y(-this.clientWidth / 2, -this.clientHeight / 2);
            if (dx > -this.width / 2) dx = -this.width / 2;
            if (dy > -this.height / 2) dy = -this.height / 2;
            if (dx < -this.width / 2 || dy < -this.height / 2) {
                matrix = matrix.translate(dx + this.width / 2, dy + this.height / 2);
            }
            dx = invertMatrix.x(this.clientWidth / 2, this.clientHeight / 2);
            dy = invertMatrix.y(this.clientWidth / 2, this.clientHeight / 2);
            if (dx < this.width / 2) dx = this.width / 2;
            if (dy < this.height / 2) dy = this.height / 2;
            if (dx > this.width / 2 || dy > this.height / 2) {
                matrix = matrix.translate(dx - this.width / 2, dy - this.height / 2);
            }
        }
        this._root.matrix = matrix;
    }

    get clientWidth() {
        return this._canvas.clientWidth;
    }

    get clientHeight() {
        return this._canvas.clientHeight;
    }

    get matrix() {
        return this._root.matrix;
    }

    get globalMatrix() {
        return this._root.globalMatrix;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this._adjustGeometry();
        this._fire(Events.RESIZE, width, height);
    }

    scrollTo(x, y) {
        let matrix = this._root.matrix.translate(-x, -y);
        this._adjustGeometry(matrix);
        this._fire(Events.SCROLL, x, y);
    }

    zoomIn(x, y) {
        let zoom = this.zoom*BaseLayer.ZOOM_STEP;
        if (zoom>this.maxZoom) zoom=this.maxZoom;
        let zoomMatrix = Matrix.scale(zoom/this.zoom, zoom/this.zoom, x, y);
        let newMatrix = this._root.matrix.multLeft(zoomMatrix);
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    zoomOut(x, y) {
        let zoom = this.zoom/BaseLayer.ZOOM_STEP;
        if (zoom<this.minZoom) zoom=this.minZoom;
        let zoomMatrix = Matrix.scale(this.zoom/zoom, this.zoom/zoom, x, y);
        let newMatrix = this._root.matrix.multLeft(zoomMatrix.invert());
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    zoomSet(scale, x, y) {
        let newMatrix = Matrix.scale(scale, scale, x, y);
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    get matrix() {
        return this._root.matrix.clone();
    }

    get zoom() {
        return this._root.matrix.scalex;
    }

    get minZoom() {
        return Math.max(
            this.clientWidth / this.width,
            this.clientHeight / this.height
        );
    }

    get maxZoom() {
        return BaseLayer.ZOOM_MAX;
    }

    _notified(source, type, ...values) {
        if (source===this._canvas && type===Events.GEOMETRY) {
            this._adjustGeometry();
        }
    }

    add(element) {
        if (!this._children) {
            this._children = new List();
        }
        this._children.add(element);
        this._root.add(element._root);
        element._fire(Events.ATTACH, this);
        this._fire(Events.ADD, element);
        return this;
    }

    remove(element) {
        if (this._children && this._children.contains(element)) {
            this._children.remove(element);
            this._root.remove(element._root);
            if (this._children.length===0) {
                delete this._children;
            }
            element._fire(Events.DETACH, this);
            this._fire(Events.REMOVE, element);
        }
        return this;
    }

    get children() {
        return this._children ? new List(...this._children) : new List();
    }

    _fire(event, ...args) {
        this._canvas._fire(event, ...args);
        return this;
    }
}
BaseLayer.ZOOM_STEP = 1.2;
BaseLayer.ZOOM_MAX = 50;

export class ToolsLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas);
    }

    putArtifact(artifact) {
        this._root.add(artifact);
    }

    get matrix() {
        return this._root.matrix.clone();
    }

    bbox(artifact) {
        let parent = artifact.parent;
        this._root.add(artifact);
        let bbox = artifact.bbox;
        artifact.detach();
        if (parent) {
            artifact.attach(parent);
        }
        return bbox;
    }
}

class GlassPedestal {

    constructor(glass, support) {
        this._glass = glass;
        this._support = support;
        this._root = new Group();
        this._root.matrix = support._root.globalMatrix.multLeft(this._glass._root.globalMatrix.invert());
        this._pedestals = new Map();
        this._initContent();
    }

    get support() {
        return this._support;
    }

    _initContent() {
        this._content = new Group();
        this._root.add(this._content);
    }

    has(element) {
        return !!this._pedestals.get(element);
    }

    get empty() {
        return this._pedestals.size === 0;
    }

    get elements() {
        return new List(...this._pedestals.keys());
    }

    putElement(element, x, y) {
        let ematrix = this._root.globalMatrix;
        let dmatrix = ematrix.multLeft(this._root.globalMatrix.invert());
        let pedestal = new Group(dmatrix);
        this._pedestals.set(element, pedestal);
        this.putArtifact(pedestal, element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        element.rotate && element.rotate(element.globalAngle+invertedMatrix.angle);
        if (element.parent) {
            element.detach();
        }
        pedestal.add(element._root);
        let fx = x-element._drag.dragX;
        let fy = y-element._drag.dragY;
        let dX = invertedMatrix.x(fx, fy);
        let dY = invertedMatrix.y(fx, fy);
        element._setPosition(dX, dY);
    }

    moveElement(element, x, y) {
        let pedestal = this._pedestals.get(element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        let fx = x-element._drag.dragX;
        let fy = y-element._drag.dragY;
        let dX = invertedMatrix.x(fx, fy);
        let dY = invertedMatrix.y(fx, fy);
        element._setPosition(dX, dY);
    }

    removeElement(element) {
        let pedestal = this._pedestals.get(element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        element.rotate && element.rotate(element.globalAngle/*-invertedMatrix.angle*/);
        this._pedestals.delete(element);
        this.removeArtifact(pedestal, element);
        this.putArtifact(element._root, element);
    }

    putArtifact(artifact, element) {
        this._content.add(artifact);
    }

    removeArtifact(artifact, element) {
        this._content.remove(artifact);
    }

}

export function makeMultiLayeredGlass(superClass, ...layers) {

    let defaultLayer = layers[0];

    superClass.prototype._initContent = function() {
        this._content = new Group();
        for (let layer of layers) {
            this[layer] = new Group();
            this._content.add(this[layer]);
        }
        this._root.add(this._content);
    };

    superClass.prototype.putArtifact = function(artifact, element) {
        let layer = element && element.layer ? element.layer : defaultLayer;
        if (!this[layer]) layer = defaultLayer;
        this[layer].add(artifact);
    };

    superClass.prototype.removeArtifact = function(artifact, element) {
        let layer = element && element.layer ? element.layer : defaultLayer;
        if (!this[layer]) layer = defaultLayer;
        this[layer].remove(artifact);
    };
}

export class GlassLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas);
        this._initContent();
        this._elements = new Map();
        this._pedestals = new Map();
    }

    get matrix() {
        return this._root.matrix;
    }

    set matrix(matrix) {
        this._root.matrix = matrix;
    }

    _notified(source, type, ...values) {
        if (source===this._canvas && (type===Events.ZOOM || type===Events.SCROLL || type===Events.RESIZE)) {
            this.matrix = this.canvas.baseMatrix;
        }
    }

    _initContent() {
        this._content = new Group();
        this._root.add(this._content);
    }

    _getPedestal(support) {
        if (!support.canvasLayer || !(support.canvasLayer instanceof BaseLayer)) {
            support = this._canvas._baseLayer;
        }
        let pedestal = this._pedestals.get(support);
        if (!pedestal) {
            let pedestalClass = support.glassStrategy;
            if (!pedestalClass) pedestalClass = GlassPedestal;
            pedestal = new pedestalClass(this, support);
            this._pedestals.set(support, pedestal);
            this._content.add(pedestal._root);
        }
        return pedestal;
    }

    putArtifact(artifact) {
        this._content.add(artifact);
    }

    removeArtifact(artifact) {
        this._content.remove(artifact);
    }

    clear() {
        this._pedestals.clear();
        this._elements.clear();
        this._content.clear();
    }

    putElement(element, support, x, y) {
        let supportPedestal = this._getPedestal(support);
        let elementPedestal = this._elements.get(element);
        console.assert(!elementPedestal);
        supportPedestal.putElement(element, x, y);
        this._elements.set(element, supportPedestal);
    }

    moveElement(element, support, x, y) {
        let elementPedestal = this._elements.get(element);
        let supportPedestal = support ? this._getPedestal(support) : elementPedestal;
        if (supportPedestal === elementPedestal) {
            elementPedestal.moveElement(element, x, y);
        }
        else {
            elementPedestal.removeElement(element);
            supportPedestal.putElement(element, x, y);
            this._elements.set(element, supportPedestal);
        }
    }

    removeElement(element) {
        let elementPedestal = this._elements.get(element);
        elementPedestal.removeElement(element);
        this._elements.delete(element);
    }

    get supports() {
        return new List(...this._pedestals.keys());
    }

    getHoveredElements(support) {
        let supportPedestal = this._pedestals.get(support);
        return supportPedestal ? supportPedestal.elements : new List();
    }

    getPoint(x, y) {
        let imatrix = this._root.globalMatrix.invert();
        return {
            x: imatrix.x(x, y),
            y: imatrix.y(x, y)
        };
    }

}

export function setGlassStrategy(superClass, glassStrategy) {

    Object.defineProperty(superClass.prototype, "glassStrategy", {
        configurable: true,
        enumerable: false,
        get: function () {
            return glassStrategy;
        }
    });

}

export function setLayeredGlassStrategy(superClass, ...layers) {

    let glassStrategy = class extends GlassPedestal {
        constructor(glass, support, ...args) {super(glass, support, ...args);}
    };
    makeMultiLayeredGlass(glassStrategy, ...layers);
    setGlassStrategy(superClass, glassStrategy);

}

export class ModalsLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas);
        this._curtain = new Rect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height)
            .attrs({fill: Colors.BLACK, opacity: 0.5, visibility: Visibility.HIDDEN});
        this._root.add(this._curtain);
    }

    openPopup(onOpen, data, onValidate, onCancel) {
        onOpen(
            data,
            data=>{
                onValidate && onValidate(data);
            },
            data=>{
                onCancel && onCancel(data);
            }
        )
    }

    openModal(onOpen, data, onValidate, onCancel) {
        this._modalOpened = true;
        this._curtain.visibility = Visibility.VISIBLE;
        onOpen(
            data,
            data=>{
                this._curtain.visibility = Visibility.HIDDEN;
                this._modalOpened = false;
                onValidate && onValidate(data);
            },
            data=>{
                this._curtain.visibility = Visibility.HIDDEN;
                this._modalOpened = false;
                onCancel && onCancel(data);
            }
        )
    }

    get modalOpened() {
        return this._modalOpened;
    }

}

export class Canvas {

    constructor(anchor, width, height) {
        this._anchor = doc.querySelector(anchor);
        this._root = new Svg(width, height).attach(this._anchor);
        this._root.that = this;
        this._content = new Translation(this.width/2, this.height/2);
        this._root.add(this._content);
        this._baseLayer = this.createBaseLayer();
        this._toolsLayer = this.createToolsLayer();
        this._glassLayer = this.createGlassLayer();
        this._modalsLayer = this.createModalsLayer();
        this._manageGeometryChanges();
        this._zoomOnWheel();
        this.shadowFilter = defineShadow("_shadow_", Colors.BLACK);
        this._root.addDef(this.shadowFilter);
        this._anchor.addEventListener(MouseEvents.MOUSE_UP, event=>{
            this._anchor.focus();
        });
        this._anchor.addEventListener(MouseEvents.CONTEXT_MENU, function(event) {
            event.preventDefault();
            return false;
        });
    }

    _adjustContent(x=0, y=0) {
        this._content.matrix = Matrix.translate(this.width/2+x, this.height/2+y);
    }

    createBaseLayer() {
        let layer = new BaseLayer(this);
        this.add(layer);
        return layer;
    }

    createToolsLayer() {
        let layer = new ToolsLayer(this);
        this.add(layer);
        return layer;
    }

    createGlassLayer() {
        let layer = new GlassLayer(this);
        this.add(layer);
        return layer;
    }

    createModalsLayer() {
        let layer = new ModalsLayer(this);
        this.add(layer);
        return layer;
    }

    add(layer) {
        this._content.add(layer._root);
    }

    get width() {
        return this._root.width;
    }

    set width(width) {
        this._root.width = width;
        this._adjustContent();
    }

    get height() {
        return this._root.height;
    }

    set height(height) {
        this._root.height = height;
        this._adjustContent();
    }

    get clientWidth() {
        return this._root.clientWidth;
    }

    get clientHeight() {
        return this._root.clientHeight;
    }

    canvasX(pageX) {
        return pageX + localOffset(this._root).x;
    }

    canvasY(pageY) {
        return pageY + localOffset(this._root).y;
    }

    pageX(canvasX) {
        return canvasX + globalOffset(this._root).x;
    }

    pageY(canvasY) {
        return canvasY + globalOffset(this._root).y;
    }

    getElementFromPoint(x, y) {
        return this._root.getElementFromPoint(x, y);
    }

    setSize(width, height) {
        if (width!==this.width && height!==this.height) {
            this.width = width;
            this.height = height;
            this._fire(Events.GEOMETRY, this.width, this.height, this.clientWidth, this.clientHeight);
        }
    }

    bbox(artifact) {
        return this._toolsLayer.bbox(artifact);
    }

    _manageGeometryChanges() {
        let clientWidth = this.clientWidth;
        let clientHeight = this.clientHeight;
        win.setInterval(() => {
            if (
                clientWidth !== this.clientWidth ||
                clientHeight !== this.clientHeight
            ) {
                clientWidth = this.clientWidth;
                clientHeight = this.clientHeight;
                this._fire(Events.GEOMETRY, this.width, this.height, this.clientWidth, this.clientHeight);
            }
        }, 1000);
    }

    _zoomOnWheel() {
        this._root.on(MouseEvents.WHEEL, event => {
            if (!Context.freezed) {
                let mousePosition = this.mouse2canvas(event);
                if (event.deltaY > 0) {
                    this.zoomOut(mousePosition.x, mousePosition.y);
                } else {
                    this.zoomIn(mousePosition.x, mousePosition.y);
                }
                event.preventDefault();
            }
        });
    }

    addFilter(filter) {
        this._root.addDef(filter);
        return this;
    }

    get matrix() {return this._content.matrix;}
    get globalMatrix() {return this._content.globalMatrix;}
    mouse2canvas(event) {return this._content.global2local(this.canvasX(event.pageX), this.canvasY(event.pageY));}

    // Base Layer
    setBaseSize(width, height) {this._baseLayer.setSize(width, height);}
    scrollTo(x, y) {this._baseLayer.scrollTo(x, y);}
    zoomIn(x, y) {this._baseLayer.zoomIn(x, y);}
    zoomOut(x, y) {this._baseLayer.zoomOut(x, y);}
    zoomSet(scale, x, y) {this._baseLayer.zoomSet(scale, x, y);}
    get zoom() {return this._baseLayer.zoom;}
    get minZoom() {return this._baseLayer.minZoom;}
    get maxZoom() {return this._baseLayer.maxZoom;}
    putOnBase(element) {this._baseLayer.add(element);}
    removeFromBase(element) {this._baseLayer.remove(element);}
    get baseChildren() {return this._baseLayer.children;}
    get baseMatrix() {return this._baseLayer.matrix;}
    get baseGlobalMatrix() {return this._baseLayer.globalMatrix;}

    // Tool layer
    putArtifactOnToolsLayer(artifact) { this._toolsLayer.putArtifact(artifact);}

    // Glass Layer
    putArtifactOnGlass(artifact) { this._glassLayer.putArtifact(artifact);}
    removeArtifactFromGlass(artifact) { this._glassLayer.removeArtifact(artifact);}
    putElementOnGlass(element, support, x, y) { this._glassLayer.putElement(element, support, x, y);}
    moveElementOnGlass(element, support, x, y) {this._glassLayer.moveElement(element, support, x, y);}
    removeElementFromGlass(element) {this._glassLayer.removeElement(element);}
    getPointOnGlass(x, y) {return this._glassLayer.getPoint(x, y);}
    clearGlass() {this._glassLayer.clear();}
    hideGlass() {this._glassLayer.hide();}
    showGlass() {this._glassLayer.show();}
    get glassSupports() { return this._glassLayer.supports; }
    getHoveredElements(support) { return this._glassLayer.getHoveredElements(support); }

    // Modal layer
    openPopup(onOpen, data, onValidate, onCancel) { this._modalsLayer.openPopup(onOpen, data, onValidate, onCancel); }
    openModal(onOpen, data, onValidate, onCancel) { this._modalsLayer.openModal(onOpen, data, onValidate, onCancel); }
    get modalOpened() { return this._modalsLayer.modalOpened; }
}
makeNotCloneable(Canvas);
makeObservable(Canvas);

export class MutationObservers {
    constructor() {
        this._mutations = new Map();
    }

    observe(element, action, node, config) {
        let observerInfo = this._mutations.get(element);
        if (!observerInfo) {
            observerInfo = {
                observer:new MutationObserver(action)
            };
            this._mutations.set(element, observerInfo);
        }
        observerInfo.node = node;
        observerInfo.config = config;
        observerInfo.connected = true;
        observerInfo.observer.observe(observerInfo.node, observerInfo.config);
    }

    disconnect(element) {
        let observerInfo = this._mutations.get(element);
        observerInfo.connected = false;
        observerInfo.observer.disconnect();
    }

    stop() {
        for (let observerInfo of this._mutations.values()) {
            if (observerInfo.connected) {
                observerInfo.observer.disconnect();
            }
        }
    }

    restart() {
        for (let observerInfo of this._mutations.values()) {
            if (observerInfo.connected) {
                observerInfo.observer.observe(observerInfo.node, observerInfo.config);
            }
        }
    }
}
makeNotCloneable(MutationObservers);

Context.mutationObservers = new MutationObservers();

export class CopyPaste {

    constructor() {
        this._models = new List();
        this._keyboardCommands();
    }

    _keyboardCommands() {
        doc.addEventListener(KeyboardEvents.KEY_UP, event => {
            if (!Context.freezed) {
                if (event.ctrlKey || event.metaKey) {
                    if (event.key === "c") {
                        this.copyModel(Context.selection.selection());
                    } else if (event.key === "v") {
                        this.pasteModel();
                    }
                }
            }
        });
    }

    duplicateForCopy(elements) {
        function center() {
            let left = Infinity,
                right = -Infinity,
                bottom = -Infinity,
                top = Infinity;
            for (let element of elements) {
                let { x, y } = computePosition(element._root, element.canvasLayer._root);
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
            let cx = (left + right) / 2;
            let cy = (top + bottom) / 2;
            return { cx, cy };
        }

        let result = new Set();
        let duplicata = new Map();
        if (elements.size > 0) {
            let { cx, cy } = center();
            for (let element of elements) {
                let copy = element.clone(duplicata, true);
                copy._parent = null;
                let { x, y } = computePosition(element._root, element.canvasLayer._root);
                copy._setPosition(x - cx, y - cy);
                result.add(copy);
            }
        }
        return result;
    }

    copyModel(elements) {
        if (elements.size > 0) {
            this._models = this.duplicateForCopy(elements);
            this._fire(CopyPaste.events.COPY_MODEL);
        }
    }

    duplicateForPaste(elements) {
        let pasted = new Set();
        let duplicata = new Map();
        for (let element of elements) {
            let copy = element.clone(duplicata, true);
            copy._setPosition(element.lx, element.ly);
            pasted.add(copy);
        }
        return pasted;
    }

    pasteModel() {
        let pasted = this.duplicateForPaste(this._models);
        Context.selection.selectOnly(...pasted);
        let matrix = Context.canvas.baseGlobalMatrix.invert();
        let cx = Context.canvas.clientWidth / 2;
        let cy = Context.canvas.clientHeight / 2;
        let vx = matrix.x(cx, cy);
        let vy = matrix.y(cx, cy);
        for (let copy of pasted) {
            copy.move(copy.lx + vx, copy.ly + vy);
        }
        this._fire(CopyPaste.events.PASTE_MODEL, pasted);
    }

    get pastable() {
        return this._models.size > 0;
    }
}
CopyPaste.clone = function(source, duplicata) {
    function cloneObject(source, duplicata) {

        function cloneRecord(record, duplicata) {
            if (record && typeof(record)==='object') {
                return cloneObject(record, duplicata);
            }
            else {
                return record;
            }
        }

        let copy = duplicata.get(source);
        if (copy) return copy;
        if (source.notCloneable) {
            return source;
        }
        else if (source.clone) {
            return source.clone(duplicata);
        }
        else if (source instanceof List) {
            copy = new List();
            duplicata.set(source, copy);
            if (!source.shallowCloning) {
                for (let record of source) {
                    copy.add(cloneRecord(record, duplicata));
                }
            }
        }
        else if (source instanceof Array) {
            copy = [];
            duplicata.set(source, copy);
            if (!source.shallowCloning) {
                for (let record of source) {
                    copy.push(cloneRecord(record, duplicata));
                }
            }
        }
        else if (source instanceof Set) {
            copy = new Set();
            duplicata.set(source, copy);
            if (!source.shallowCloning) {
                for (let record of source) {
                    copy.add(cloneRecord(record, duplicata));
                }
            }
        }
        else if (source instanceof Map) {
            copy = new Map();
            duplicata.set(source, copy);
            if (!source.shallowCloning) {
                for (let entry of source.entries()) {
                    copy.set(cloneRecord(entry[0], duplicata), cloneRecord(entry[1], duplicata));
                }
            }
        }
        else if (source.cloneable) {
            copy = CopyPaste.clone(source, duplicata);
        }
        else {
            throw source+" is not cloneable."
        }
        return copy;
    }

    if (source === null || source === undefined) return null;
    let copy = duplicata.get(source);
    if (copy) return copy;
    copy = {};
    duplicata.set(source, copy);
    copy.__proto__ = source.__proto__;
    while(copy.__proto__.__pass__) {
        copy.__proto__ = copy.__proto__.__proto__;
    }
    if (!source.shallowCloning) {
        for (let property in source) {
            if (source.hasOwnProperty(property)) {
                if (source[property] && typeof(source[property]) === 'object') {
                    copy[property] = cloneObject(source[property], duplicata);
                }
                else {
                    copy[property] = source[property];
                }
            }
        }
    }
    return copy;
};
makeObservable(CopyPaste);
makeNotCloneable(CopyPaste);

Context.copyPaste = new CopyPaste();

CopyPaste.events = {
    COPY_MODEL : "copy-model",
    PASTE_MODEL : "paste-model"
};

export class Memento {

    constructor() {
        this.opened = false;
        this._undoTrx = new List();
        this._undoTrx.push(new Map());
        this._redoTrx = new List();
        this._keyboardCommands();
    }

    _keyboardCommands() {
        doc.addEventListener(KeyboardEvents.KEY_UP, event => {
            if (!Context.freezed) {
                if (event.ctrlKey || event.metaKey) {
                    if (event.key === "z") {
                        this.undo();
                    } else if (event.key === "y") {
                        this.redo();
                    }
                }
            }
        });
    }

    _current() {
        return this._undoTrx.length === 0
            ? null
            : this._undoTrx[this._undoTrx.length - 1];
    }

    undoable() {
        return (
            this._undoTrx.length > 1 || (this._current() && this._current().size > 0)
        );
    }

    redoable() {
        return this._redoTrx.length > 0;
    }

    open() {
        let current = this._current();
        if (current.size !== 0) {
            this._undoTrx.push(new Map());
            this._redoTrx.length = 0;
            this._fire(Memento.events.OPEN, this._current());
        }
        return this;
    }

    keep(element) {
        if (this.opened) {
            let current = this._current();
            if (!current.has(element)) {
                current.set(element, this.__memento(element));
                this._fire(Memento.events.KEEP, element);
            }
            return this;
        }
    }

    __memento(element) {
        let memento = element._memento();
        memento._proto_ = element.__proto__;
        return memento;
    }

    __revert(element, memento) {
        element.__proto__ = memento._proto_;
        element._revert(memento);
    }

    undo() {
        if (!Context.readOnly) {
            let current = this._undoTrx.pop();
            if (current.size === 0) {
                current = this._undoTrx.pop();
            }
            if (current) {
                this.opened = false;
                Context.mutationObservers.stop();
                let redo = new Map();
                for (let element of current.keys()) {
                    redo.set(element, this.__memento(element));
                }
                for (let element of current.keys()) {
                    this.__revert(element, current.get(element));
                }
                for (let element of current.keys()) {
                    element._recover && element._recover(current.get(element));
                }
                this.opened = true;
                Context.mutationObservers.restart();
                this._redoTrx.push(redo);
                this._fire(Memento.events.UNDO);
            }
            this._undoTrx.push(new Map());
        }
        return this;
    }

    redo() {
        if (!Context.readOnly) {
            let current = this._redoTrx.pop();
            if (current) {
                this.opened = false;
                Context.mutationObservers.stop();
                let undo = new Map();
                for (let element of current.keys()) {
                    undo.set(element, this.__memento(element));
                }
                for (let element of current.keys()) {
                    this.__revert(element, current.get(element));
                }
                for (let element of current.keys()) {
                    element._recover && element._recover(current.get(element));
                }
                if (this._current().size === 0) {
                    this._undoTrx.pop();
                }
                this.opened = true;
                Context.mutationObservers.restart();
                this._undoTrx.push(undo);
                this._fire(Memento.events.REDO);
            }
        }
        return this;
    }

    cancel() {
        this._undoTrx.pop();
        this._undoTrx.push(new Map());
        this._fire(Memento.events.CANCEL);
        return this;
    }

    clear() {
        this._undoTrx.length = 0;
        this._redoTrx.length = 0;
        this._undoTrx.push(new Map());
        this._fire(Memento.events.CLEAR);
        return this;
    }
}
makeObservable(Memento);
makeNotCloneable(Memento);

Context.memento = new Memento();

Memento.events = {
    OPEN : "open",
    KEEP : "keep",
    UNDO : "undo",
    REDO : "redo",
    CANCEL : "cancel",
    CLEAR : "clear"
};

Memento.register = function(element) {
    if (element && element._memento) {
        Context.memento.keep(element);
    }
};

export class ElementGroup {
    constructor(elements) {
        this._content = new Set();
        for (let element of elements.values()) {
            this._content.add(element);
        }
    }

    get content() {
        return new List(...this._content.values());
    }

    get flatten() {
        let result = new List();
        for (let element of this._content) {
            if (element instanceof ElementGroup) {
                result.push(...element.flatten);
            } else {
                result.push(element);
            }
        }
        return result;
    }
}

Context.selectPredicate = function(element) {
    let layer = element.canvasLayer;
    return layer && layer instanceof BaseLayer;
};

export class Selection {

    constructor() {
        this._selection = new Set();
    }

    get selectFilter() {
        if (!this._selectFilter) {
            this.selectFilter = defineShadow("_select_", Colors.RED);
        }
        return this._selectFilter;
    }

    set selectFilter(filter) {
        this._selectFilter = filter;
        Context.canvas.addFilter(filter);
    }

    selected(element) {
        return this._selection.has(element);
    }

    selectOnly(...elements) {
        this.unselectAll();
        let result = false;
        for (let element of elements) {
            if (this.select(element)) {
                result = true;
            }
        }
        return result;
    }

    select(element) {
        let selectable = element.selectable;
        if (selectable) {
            this._selection.add(selectable);
            selectable.select && selectable.select();
            selectable.selectFrame && (selectable.selectFrame.filter = this.selectFilter);
            this._fire(Events.SELECT, selectable);
            return true;
        }
        return false;
    }

    unselect(element) {
        let selectable = element.selectable;
        if (selectable) {
            if (this._selection.has(selectable)) {
                this._selection.delete(selectable);
                selectable.unselect && selectable.unselect();
                selectable.selectFrame && (selectable.selectFrame.filter = null);
                this._fire(Events.UNSELECT, selectable);
            }
            return true;
        }
        return false;
    }

    unselectAll() {
        for (let element of this._selection) {
            this.unselect(element);
        }
    }

    selection(predicate=Context.selectPredicate) {
        return new Set([...this._selection].filter(predicate));
    }

    adjustSelection(element, event, unselectAllowed = false) {
        let selected = element.selectable;
        if (selected) {
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
                if (unselectAllowed && this.selected(selected)) {
                    this.unselect(selected);
                } else {
                    this.select(selected);
                }
            } else {
                this.selectOnly(selected);
            }
        }
    }

}
makeObservable(Selection);
makeNotCloneable(Selection);

export class Groups extends Selection {

    constructor() {
        super();
        this._elements = new Map();
    }

    _memento() {
        return {
            _elements: new Map(this._elements)
        };
    }

    _revert(memento) {
        this._elements = new Map(memento._elements);
        this.unselectAll();
    }

    getGroup(element) {
        return this._elements.get(element);
    }

    regroup(element) {
        Memento.register(this);
        let content = new Set();
        let elements = this.selection(element);
        for (let element of elements) {
            let group = this.getGroup(element);
            if (!group) {
                content.add(element);
            } else {
                content.add(group);
                this._elements.delete(element);
            }
        }
        let group = new ElementGroup(content);
        this._registerGroup(group);
    }

    ungroup(element) {
        Memento.register(this);
        let group = element instanceof ElementGroup ? element : this.getGroup(element);
        let done = new Set();
        if (group) {
            for (let part of group.content()) {
                this._elements.delete(part);
            }
            for (let part of group.content()) {
                if (part instanceof Group) {
                    if (!done.has(part)) {
                        this._registerGroup(part);
                        done.add(part);
                    }
                }
            }
        }
    }

    _registerGroup(group) {
        for (let element of group.flatten) {
            this._elements.set(element, group);
        }
    }

    select(element) {
        let group = this.getGroup(element);
        if (group) {
            for (let part of group.flatten) {
                super.select(part);
            }
        } else {
            super.select(element);
        }
    }

    unselect(element) {
        let group = this.group(element);
        if (group) {
            for (let part of group.elements()) {
                super.unselect(part);
            }
        } else {
            super.unselect(element);
        }
    }

    groupSelection(predicate=Context.selectPredicate()) {
        let result = new Set();
        for (let element of this.selection(predicate)) {
            let group = this._elements.get(element);
            if (!group) {
                result.add(element);
            } else {
                result.add(group);
            }
        }
        return [...result.values()];
    }

    groupable(element, predicate=Context.selectPredicate()) {
        let group = null;
        let elements = this.selection(predicate);
        elements.add(element);
        let count = 0;
        for (let element of elements) {
            let egroup = this.getGroup(element);
            if (!egroup || !group || group !== egroup) {
                count++;
            }
            group = egroup;
        }
        return count > 1;
    }

    ungroupable(element, predicate=Context.selectPredicate()) {
        let group = null;
        let elements = this.selection(predicate);
        elements.add(element);
        for (let element of elements) {
            let egroup = this.getGroup(element);
            if (!egroup || (group && group !== egroup)) {
                return false;
            }
            group = egroup;
        }
        return !!group;
    }
}
makeNotCloneable(Groups);

