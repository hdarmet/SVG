'use strict';

import {win, doc,
    evaluate, deg,
    MouseEvents, KeyboardEvents, Buttons, List, Matrix,
    Svg, Rect, Group, Translation, Rotation,
    Fill, Colors, Visibility,
    localOffset, globalOffset, computePosition, computeAngle,
    l2l
} from "./svgbase.js";
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
    DISPLACE : "displace",
    DISPLACED : "displaced",
    SELECT : "select",
    UNSELECT : "unselect",
    ZOOM : "zoom",
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
        if (!this._observers) {
            this._observers = new Set();
        }
        this._observers.add(observer);
    };

    superClass.prototype.removeObserver = function(observer) {
        Memento.register(this);
        this._observers.delete(observer);
        if (this._observers.size===0) {
            delete this._observers;
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

export function makeMoveable(superClass) {

    superClass.prototype.move = function(x, y) {
        Memento.register(this);
        this._setPosition(x, y);
        return this;
    };

    if (!superClass.prototype.hasOwnProperty("moveable")) {
        Object.defineProperty(superClass.prototype, "moveable", {
            configurable:true,
            get() {
                return true;
            }
        });
    }

}

export function makeRotatable(superClass) {

    superClass.prototype._initRotatable = function(angle = 0) {
        this._hinge = new Rotation(angle, 0, 0);
        return this._hinge;
    };

    Object.defineProperty(superClass.prototype, "angle", {
        configurable:true,
        get() {
            return this._hinge.angle;
        }
    });

    Object.defineProperty(superClass.prototype, "local", {
        configurable:true,
        get() {
            return this._hinge.matrix.multLeft(this._root.matrix);
        }
    });

    Object.defineProperty(superClass.prototype, "global", {
        configurable:true,
        get() {
            return this._hinge.globalMatrix;
        }
    });

    if (!superClass.prototype.hasOwnProperty("rotatable")) {
        configurable:true,
        Object.defineProperty(superClass.prototype, "rotatable", {
            configurable:true,
            get() {
                return true;
            }
        });
    }

    superClass.prototype.rotate = function(angle) {
        Memento.register(this);
        this._hinge.angle = angle;
        return this;
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento.angle = this._hinge.angle;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._hinge.angle = memento.angle;
            return this;
        };
    }

}

export function makeSelectable(superClass) {

    Object.defineProperty(superClass.prototype, "selectFrame", {
        configurable:true,
        get() {
            return this._selectFrame===undefined ? this._shape : this._selectFrame;
        },
        set(frame) {
            this._selectFrame = frame;
        }
    });

    if (!superClass.prototype.hasOwnProperty("selectable")) {
        Object.defineProperty(superClass.prototype, "selectable", {
            configurable:true,
            get() {
                return this;
            }
        });
    }

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._selectFrame = this._selectFrame;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._selectFrame = memento._selectFrame;
            return this;
        };
    }

}

export class BoardElement {

    constructor() {
        this._createStructure();
    }

    _notified(source, type) {}

    _createStructure() {
        this._root = new Translation();
        this._root.that = this;
        this._root._id = "root";
        this._root._owner = this;
    }

    _memento() {
        let memento = {};
        memento.parent = this.parent;
        memento.rootMatrix = this._root.matrix.clone();
        return memento;
    }

    _revert(memento) {
        this._root.matrix = memento.rootMatrix;
        return this;
    }

    _observe(observable) {
        observable.addObserver(this);
        return this;
    }

    _forget(observable) {
        observable.removeObserver(this);
        return this;
    }

    _setPosition(x, y) {
        this._root.matrix = Matrix.translate(x, y);
        return this;
    }

    get x() {return 0;}
    get y() {return 0;}
    get width() {return 0;}
    get height() {return 0;}
    get left() {return this.x - this.width/2;}
    get right() {return this.x + this.width/2;}
    get top() {return this.y - this.height/2;}
    get bottom() {return this.y + this.height/2;}

    get translation() { return this._root.matrix; }
    set translation(matrix) {this._root.matrix = matrix;}
    get local() { return this.translation; }
    get global() { return this._root.globalMatrix; }

    get lbbox() {
        return new Box(this.left, this.top, this.right-this.left, this.bottom-this.top);
    }
    l2mbbox(targetMatrix) {
        let result = l2l(this.global, targetMatrix,
            this.left, this.top, this.right, this.top,
            this.left, this.bottom, this.right, this.bottom);
        return getBox(result);
    }
    l2lbbox(target) {
        return this.l2mbbox(target.global);
    }

    relative(matrix) {
        return this._root.globalMatrix.invert().add(matrix);
    }

    _geometry(matrix) {
        let left = this.left, right = this.right, top = this.top, bottom = this.bottom;
        let x1 = matrix.x(left, top);
        let y1 = matrix.y(left, top);
        let x2 = matrix.x(right, bottom);
        let y2 = matrix.y(right, bottom);
        return {
            x:matrix.dx, y:matrix.dy,
            left:x1>x2?x2:x1, right:x1>x2?x1:x2,
            top:y1>y2?y2:y1, bottom:y1>y2?y1:y2
        };
    }

    get localGeometry() { return this._geometry(this.translation); }
    get globalGeometry() { return this._geometry(this.global); }
    get lx() { return this.translation.x(0, 0); }
    get ly() { return this.translation.y(0, 0); }
    get gx() { return this.global.x(0, 0); }
    get gy() { return this.global.y(0, 0); }

    relativeGeometry(matrix) {
        let relative = this.relative(matrix);
        return this._geometry(this.relative);
    }

    get parent() {
        return this._parent;
    }

    visible() {
        let visible = this._root.visibility;
        return !visible || visible === Visibility.VISIBLE;
    }

    show() {
        this._root.visibility = Visibility.VISIBLE;
    }

    hide() {
        this._root.visibility = Visibility.HIDDEN;
    }

    _registerParent() {
        Memento.register(this.parent);
    }

    attach(parent) {
        this.detach();
        parent && parent.add(this);
        return this;
    }

    detach() {
        let parent = this.parent;
        parent && parent.remove(this);
        return this;
    }

    get canvasLayer() {
        return getCanvasLayer(this._root);
    }

    _acceptDrop(element) {
        return false;
    }

    clone(duplicata) {
        let root = false;
        if (!duplicata) {
            root = true;
            duplicata = new Map();
        }
        let copy = this._clone(duplicata);
        if (root) {
            for (let entry of duplicata.entries()) {
                let [that, thatCopy] = entry;
                if (that._link) {
                    that._link(thatCopy, duplicata);
                }
            }
        }
        return copy;
    }

    _clone(duplicata) {
        let copy = CopyPaste.clone(this, duplicata);
        copy._root._owner = copy;
        return copy;
    }

    _link(copy, duplicata) {}
}
makeObservable(BoardElement);

export function makeShaped(superClass) {

    superClass.prototype._initShape = function(svgElement) {
        this._shape = new Group();
        if (svgElement) {
            this._shape.add(svgElement);
        }
        return this._shape;
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._shape = this._shape.memento();
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._shape.revert(memento._shape);
            return this;
        };
    }

    Object.defineProperty(superClass.prototype, "shape", {
        configurable:true,
        get: function () {
            return this._shape.child;
        },
        set : function(shape) {
            Memento.register(this);
            this._shape.child = shape;
        }
    });

    if (!superClass.prototype.hasOwnProperty("width")) {
        Object.defineProperty(superClass.prototype, "width", {
            configurable:true,
            get: function () {
                return this.shape.width;
            },
            set: function (width) {
                Memento.register(this);
                this.shape.width = width;
            }
        });
    }

    if (!superClass.prototype.hasOwnProperty("height")) {
        configurable:true,
        Object.defineProperty(superClass.prototype, "height", {
            configurable:true,
            get: function () {
                return this.shape.height;
            },
            set: function (height) {
                Memento.register(this);
                this.shape.height = height;
            }
        });
    }
}

export function makeContainer(superClass) {

    superClass.prototype._initContent = function() {
        this._content = new Group();
        return this._content;
    };

    superClass.prototype._add = function(element) {
        if (!this._children) {
            this._children = new List();
        }
        this._children.add(element);
        this._content.add(element._root);
        element._parent = this;
    };

    superClass.prototype.add = function(element) {
        if (element.parent!==this) {
            if (element.parent) {
                element.parent.remove(element);
            }
            Memento.register(this);
            Memento.register(element);
            this._add(element);
            this._fire(Events.ADD, element);
            element._fire(Events.ATTACH, this);
        }
        return this;
    };

    superClass.prototype._insert = function(previous, element) {
        if (this._children) {
            this._children.insert(previous, element);
            this._content.insert(previous._root, element._root);
            element._parent = this;
        }
    };

    superClass.prototype.insert = function(previous, element) {
        if (previous.parent===this) {
            let added = false;
            if (element.parent && element.parent!==this) {
                element.parent.remove(element);
                added = true;
            }
            Memento.register(this);
            Memento.register(element);
            this._insert(previous, element);
            if (added) {
                this._fire(Events.ADD, element);
                element._fire(Events.ATTACH, this);
            }
            else {
                this._fire(Events.DISPLACE, element);
                element._fire(Events.DISPLACED, this);
            }
        }
        return this;
    };

    superClass.prototype._replace = function(previous, element) {
        if (!this._children) {
            this._children = new List();
        }
        this._children.replace(previous, element);
        this._content.replace(previous._root, element._root);
        previous._parent = null;
        element._parent = this;
    };

    superClass.prototype.replace = function(previous, element) {
        if (previous.parent===this) {
            let added = false;
            if (element.parent && element.parent!==this) {
                element.parent.remove(element);
                added = true;
            }
            Memento.register(this);
            Memento.register(previous);
            Memento.register(element);
            this._replace(previous, element);
            this._fire(Events.REMOVE, previous);
            previous._fire(Events.DETACH, this);
            if (added) {
                this._fire(Events.ADD, element);
                element._fire(Events.ATTACH, this);
            }
            else {
                this._fire(Events.DISPLACE, element);
                element._fire(Events.DISPLACED, this);
            }
        }
        return this;
    };

    superClass.prototype._remove = function(element) {
        if (this._children) {
            this._children.remove(element);
            this._content.remove(element._root);
            element._parent = null;
            if (this._children.length===0) {
                delete this._children;
            }
        }
    };

    superClass.prototype.remove = function(element) {
        if (element.parent===this) {
            Memento.register(this);
            Memento.register(element);
            this._remove(element);
            this._fire(Events.REMOVE, element);
            element._fire(Events.DETACH, this);
        }
        return this;
    };

    Object.defineProperty(superClass.prototype, "children", {
        configurable:true,
        get: function () {
            return this._children ? new List(...this._children) : new List();
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            if (this._children) {
                memento._children = new List(...this._children);
            }
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._content.clear();
            if (memento._children) {
                this._children = new List(...memento._children);
                for (let child of this._children) {
                    this._content.add(child._root);
                }
            }
            else {
                delete this._children;
            }
            return this;
        };
    }

    return superClass;
}

export class BoardArea extends BoardElement {

    constructor(width, height, backgroundColor) {
        super();
        let background = new Rect(-width/2, -height/2, width, height);
        background.fill = backgroundColor;
        this._root
            .add(this._initShape(background))
            .add(this._initContent());
        this._setSize(width, height);
        this._dragOperation(Context.scrollOrSelectAreaDrag);
    }

    get color() {
        return this.shape.fill;
    }

    _dropTarget() {
        return this;
    }

    _setSize(width, height) {
        this.shape.attrs({
            width: width,
            height: height,
            x: -width / 2,
            y: -height / 2
        });
    }

    setSize(width, height) {
        Memento.register(this);
        this._setSize(width, height);
        this._fire(Events.GEOMETRY);
    }

    _acceptDrop() {
        return true;
    }
}
makeShaped(BoardArea);
makeContainer(BoardArea);
makeDraggable(BoardArea);

export class BoardTable extends BoardArea {

    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
        Context.copyPaste.addObserver(this);
    }

    _setSize(width, height) {
        super._setSize(width, height);
        Context.canvas.setBaseSize(width, height);
    }

    _notified(source, type, value) {
        super._notified(source, type, value);
        if (type === CopyPaste.events.PASTE_MODEL) {
            for (let copy of value) {
                this.add(copy);
            }
        }
    }

}

export function makeDraggable(superClass) {

    Object.defineProperty(superClass.prototype, "dragOperation", {
        configurable:true,
        get: function () {
            return this._dragOp;
        },
        set: function(operation) {
            Memento.register(this);
            this._dragOperation(operation);
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function() {
            let memento = superMemento.call(this);
            memento._dragOp = this._dragOp;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function(memento) {
            superRevert.call(this, memento);
            this._dragOperation(memento._dragOp);
        }
    }

    superClass.prototype._dragOperation = function(operation) {
        this._dragOp = operation;
        if (operation) {
            let accepted = false;
            let dragStart = event=> {
                accepted = operation._accept(this, event.pageX, event.pageY, event);
                if (accepted) {
                    operation._onDragStart(this, event.pageX, event.pageY, event);
                }
            };
            let dragMove = event=> {
                if (accepted) {
                    operation._onDragMove(this, event.pageX, event.pageY, event);
                }
            };
            let dragDrop = event=> {
                if (accepted) {
                    operation._onDrop(this, event.pageX, event.pageY, event);
                }
            };
            this._root.onDrag(dragStart, dragMove, dragDrop);
        }
        else {
            this._root.offDrag();
        }
    };

    superClass.prototype.cancelDrop = function() {
        this._origin && (this._origin.cancelled = true);
    };

    superClass.prototype.dropCancelled = function() {
        return this._origin && this._origin.cancelled;
    };

    let superLink = superClass.prototype._link;
    if (superLink) {
        superClass.prototype._link = function(copy, duplicata) {
            superLink.call(this, copy, duplicata);
            if (this._dragOp) {
                copy._dragOperation(this._dragOp);
            }
        }
    }

    return superClass;
}

export function makeClickable(superClass) {

    Object.defineProperty(superClass.prototype, "clickHandler", {
        configurable:true,
        get: function () {
            return this._clickHdl;
        },
        set: function(handler) {
            Memento.register(this);
            this._clickHandler(handler);
        }
    });

    Object.defineProperty(superClass.prototype, "doubleClickHandler", {
        configurable:true,
        get: function () {
            return this._doubleClickHdl;
        },
        set: function(handler) {
            Memento.register(this);
            this._doubleClickHandler(handler);
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function() {
            let memento = superMemento.call(this);
            memento._clickHdl = this._clickHdl;
            memento._doubleClickHdl = this._doubleClickHdl;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function(memento) {
            superRevert.call(this, memento);
            this._clickHandler(memento._clickHdl);
            this._doubleClickHandler(memento._doubleClickHdl);
        }
    }

    superClass.prototype._clickHandler = function(handler) {
        this._clickHdl = handler;
        if (this._clickHdlImpl) {
            this._root.off(Events.CLICK, this._clickHdlImpl);
        }
        this._clickHdlImpl = event => {
            Context.selection.adjustSelection(this, event, true);
            handler && handler.call(this, event);
        };
        this._root.on(MouseEvents.CLICK, this._clickHdlImpl);
    };

    superClass.prototype._doubleClickHandler = function(handler) {
        this._doubleClickHdl = handler;
        if (this._doubleClickHdlImpl) {
            this._root.off(Events.DOUBLE_CLICK, this._doubleClickHdlImpl);
        }
        this._doubleClickHdlImpl = event => {
            Context.selection.adjustSelection(this, event, true);
            handler && handler.call(this, event);
        };
        this._root.on(MouseEvents.DOUBLE_CLICK, this._doubleClickHdlImpl);
    };

    let superLink = superClass.prototype._link;
    if (superLink) {
        superClass.prototype._link = function(copy, duplicata) {
            superLink.call(this, copy, duplicata);
            if (this._clickHdl) {
                copy._clickHandler(this._clickHdl);
            }
            if (this._doubleClickHdl) {
                copy._doubleClickHandler(this._doubleClickHdl);
            }
        }
    }

    return superClass;
}

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

export class DragMoveOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        return (!Context.readOnly && element.moveable && super.accept(element, x, y, event));
    }

    extendsSelection(selection) {
        return new Set(selection);
    }

    dragSet() {
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
            if (inSelection(element.parent, dragSet)) {
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
        Context.canvas.prepareGlassForDragStart();
        this._dragSet = this.dragSet();
        for (let selectedElement of this._dragSet.values()) {
            Memento.register(selectedElement);
            selectedElement._origin = selectedElement._memento();
            Context.canvas.putElementOnGlass(selectedElement, x, y);
            selectedElement._drag = {
                lastX: x,
                lastY: y
            };
            selectedElement._fire(Events.DRAG_START);
        }
        this._drag = {
            lastX : x,
            lastY : y
        };
        this._fire(Events.DRAG_START, new Set(this._dragSet));
    }

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

    doDragMove(element, x, y, event) {
        Context.canvas.prepareGlassForDragMove();
        let sortedSelection = this.sortedSelection(x - this._drag.lastX, y - this._drag.lastY);
        for (let selectedElement of sortedSelection) {
            selectedElement._drag.lastX = selectedElement.gx;
            selectedElement._drag.lastY = selectedElement.gy;
            Context.canvas.moveElementOnGlass(selectedElement, x, y);
            selectedElement._fire(Events.DRAG_MOVE);
        }
        this._drag.lastX = x;
        this._drag.lastY = y;
        this._fire(Events.DRAG_MOVE, sortedSelection);
    }

    getTarget(element) {
        let gx = element.gx;
        let gy = element.gy;
        Context.canvas.hideGlass();
        let target = Context.canvas.getElementFromPoint(gx, gy);
        if (!target || !target._owner) {
            Context.canvas._adjustContent(-gx, -gy);
            target = Context.canvas.getElementFromPoint(0, 0);
            Context.canvas._adjustContent(0, 0);
        }
        Context.canvas.showGlass();
        while (target) {
            if (target._owner) return target._owner;
            target = target.parent;
        }
        return null;
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
        for (let selectedElement of [...this._dragSet]) {
            if (!selectedElement._dropCancelled) {
                let target = this.getTarget(selectedElement);
                if (target && target._dropTarget) {
                    target = target._dropTarget();
                }
                if (target && getCanvasLayer(target._root) instanceof BaseLayer) {
                    let { x, y } = computePosition(selectedElement._root, target._root);
                    selectedElement.move(x, y);
                    if (selectedElement.rotate) {
                        let angle = computeAngle(selectedElement._hinge, target._root);
                        selectedElement.rotate(angle);
                    }
                    if ((target._acceptDrop && !target._acceptDrop(selectedElement)) ||
                        selectedElement._acceptDropped && !selectedElement._acceptDropped(target)) {
                        selectedElement.cancelDrop();
                    }
                    else {
                        selectedElement._origin.target = target;
                    }
                } else {
                    selectedElement.cancelDrop();
                }
            }
        }
        let dropped = new Set();
        for (let selectedElement of [...this._dragSet]) {
            if (!selectedElement.dropCancelled()) {
                dropped.add(selectedElement);
                selectedElement.attach(selectedElement._origin.target);
            }
            else {
                selectedElement._revert(selectedElement._origin);
                selectedElement._recover && selectedElement._recover(selectedElement._origin);
                selectedElement.attach(selectedElement._origin.parent);
            }
            delete selectedElement._origin;
        }
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
    }

}
Context.moveDrag = new DragMoveOperation();


class DragRotateOperation extends DragOperation {

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
            Memento.register(selectedElement);
            selectedElement._origin = selectedElement._memento();
            if (!selectedElement._drag) {
                selectedElement._drag = {};
            }
            selectedElement._drag.startAngle = selectedElement.angle;
        }
    }

    doDragMove(element, x, y, event) {
        let lx = element._drag.matrix.x(x, y);
        let ly = element._drag.matrix.y(x, y);
        let angle = Math.atan2(-lx, ly);
        for (let selectedElement of Context.selection.selection()) {
            selectedElement.rotate(selectedElement._drag.startAngle + deg(angle - element._drag.angle));
        }
    }

    doDrop(element, x, y, event) {
        for (let selectedElement of Context.selection.selection()) {
            if (!selectedElement._dropCancelled) {
                if ((selectedElement.parent._acceptRotation && !selectedElement.parent._acceptRotation(selectedElement)) ||
                    selectedElement._acceptRotated && !selectedElement._acceptRotated(selectedElement.parent)) {
                    selectedElement.cancelDrop();
                }
            }
        }
        let dropped = new Set();
        for (let selectedElement of Context.selection.selection()) {
            if (!selectedElement.dropCancelled()) {
                dropped.add(selectedElement);
            }
            else {
                selectedElement._revert(selectedElement._origin);
                selectedElement._recover && selectedElement._recover(selectedElement._origin);
            }
            delete selectedElement._origin;
        }
        if (dropped.size>0) {
            for (let selectedElement of Context.selection.selection()) {
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
            this._fire(Events.DRAG_ROTATED, new Set(dropped.keys()));
        }
        else {
            Context.memento.cancel();
        }
    }
}
Context.rotateDrag = new DragRotateOperation();

export class DragSelectAreaOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        return super.accept(element, x, y, event) && element instanceof BoardArea;
    }

    doDragStart(element, x, y, event) {
        Context.canvas.resetGlass();
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
        this._selectArea.detach();
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
Context.parentDrag = new ParentDragOperation();

Context.scrollOrSelectAreaDrag = new DragSwitchOperation()
    .add(()=>true, Context.scrollDrag)
    .add(()=>true, Context.selectAreaDrag);

export class CanvasLayer {

    constructor(canvas) {
        this.canvas = canvas;
        this._root = new Group();
        this._root.that = this;
        this._root._owner = this;
        canvas.addObserver(this);
    }

    _notified(source, type, ...values) {
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
        return this.canvas.clientWidth;
    }

    get clientHeight() {
        return this.canvas.clientHeight;
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
    }

    scrollTo(x, y) {
        let matrix = this._root.matrix.translate(-x, -y);
        this._adjustGeometry(matrix);
    }

    zoomIn(x, y) {
        let zoom = Matrix.scale(BaseLayer.ZOOM_STEP, BaseLayer.ZOOM_STEP, x, y);
        let newMatrix = this._root.matrix.multLeft(zoom);
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    zoomOut(x, y) {
        let zoom = Matrix.scale(BaseLayer.ZOOM_STEP, BaseLayer.ZOOM_STEP, x, y);
        let newMatrix = this._root.matrix.multLeft(zoom.invert());
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
        if (source===this.canvas && type===Events.GEOMETRY) {
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
        this.canvas._fire(event, ...args);
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

export class GlassLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas);
        this._canvas = canvas;
    }

    reset() {
        this._root.matrix = Matrix.identity;
    }

    prepareDragStart() {
        this._root.matrix = this._canvas._baseLayer.matrix;
        this._pedestals = new Set();
    }

    prepareDragMove() {
        this._root.matrix = this._canvas._baseLayer.matrix;
    }

    prepareToolsDrag() {
        this._root.matrix = this._canvas._toolsLayer.matrix;
    }

    putArtifact(artifact) {
        this._root.add(artifact);
    }

    putElement(element, x, y) {
        let ematrix = element.global;
        let dmatrix = ematrix.multLeft(this._canvas._baseLayer.matrix.invert());
        let pedestal = new Group(Matrix.translate(dmatrix.dx, dmatrix.dy).rotate(dmatrix.angle, 0, 0));
        this._pedestals.add(pedestal);
        this._root.add(pedestal);
        let imatrix = ematrix.invert();
        pedestal.dragX = imatrix.x(x, y);
        pedestal.dragY = imatrix.y(x, y);
        element.rotate && element.rotate(0);
        element.detach();
        pedestal.add(element._root);
    }

    moveElement(element, x, y) {
        let pedestal = element._root.parent;
        let invertedMatrix = pedestal.globalMatrix.invert();
        let dX = invertedMatrix.x(x, y) - pedestal.dragX;
        let dY = invertedMatrix.y(x, y) - pedestal.dragY;
        element.translation = Matrix.translate(dX, dY);
    }

    getPoint(x, y) {
        let imatrix = this._root.globalMatrix.invert();
        return {
            x: imatrix.x(x, y),
            y: imatrix.y(x, y)
        };
    }

}

export class ModalsLayer extends CanvasLayer {
    constructor(canvas) {
        super(canvas);
        this._curtain = new Rect(canvas.width/2, canvas.height/2, canvas.width, canvas.height)
            .attrs({fill: Colors.BLACK, opacity: 0.5}, {visibility: Visibility.HIDDEN});
        this._root.add(this._curtain);
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
        win.addEventListener(MouseEvents.CONTEXT_MENU, function(event) {
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
                    this._baseLayer.zoomOut(mousePosition.x, mousePosition.y);
                } else {
                    this._baseLayer.zoomIn(mousePosition.x, mousePosition.y);
                }
                event.preventDefault();
            }
        });
    }

    addFilter(filter) {
        this._root.addDef(filter);
        return this;
    }

    mouse2canvas(event) {return this._content.global2local(this.canvasX(event.pageX), this.canvasY(event.pageY));}
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

    putArtifactOnToolsLayer(artifact) { this._toolsLayer.putArtifact(artifact);}

    putArtifactOnGlass(artifact) { this._glassLayer.putArtifact(artifact);}
    putElementOnGlass(element, x, y) { this._glassLayer.putElement(element, x, y);}
    moveElementOnGlass(element, x, y) {this._glassLayer.moveElement(element, x, y);}
    getPointOnGlass(x, y) {return this._glassLayer.getPoint(x, y);}
    resetGlass() {this._glassLayer.reset();}
    prepareGlassForDragStart() {this._glassLayer.prepareDragStart();}
    prepareGlassForDragMove() {this._glassLayer.prepareDragMove();}
    prepareGlassForToolsDrag() {this._glassLayer.prepareToolsDrag();}
    hideGlass() {this._glassLayer.hide();}
    showGlass() {this._glassLayer.show();}
}
makeObservable(Canvas);

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
        if (elements.size > 0) {
            let { cx, cy } = center();
            for (let element of elements) {
                let copy = element.clone();
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
        for (let element of elements) {
            let copy = element.clone();
            copy._setPosition(element.lx, element.ly);
            pasted.add(copy);
        }
        return pasted;
    }

    pasteModel() {
        let pasted = this.duplicateForPaste(this._models);
        Context.selection.selectOnly(...pasted);
        this._fire(CopyPaste.events.PASTE_MODEL, pasted);
    }

    get pastable() {
        return this._models.length > 0;
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

        if (source.clone) {
            return source.clone(duplicata, false);
        }
        else if (source instanceof List) {
            let result = new List();
            duplicata.set(source, result);
            for (let record of source) {
                result.add(cloneRecord(record, duplicata));
            }
            return result;
        }
        else if (source instanceof Array) {
            let result = [];
            duplicata.set(source, result);
            for (let record of source) {
                result.push(cloneRecord(record, duplicata));
            }
            return result;
        }
        else if (source instanceof Set) {
            let result = new Set();
            duplicata.set(source, result);
            for (let record of source) {
                result.add(cloneRecord(record, duplicata));
            }
            return result;
        }
        else if (source instanceof Map) {
            let result = new Map();
            duplicata.set(source, result);
            for (let entry of source.entries()) {
                result.set(cloneRecord(entry[0], duplicata), cloneRecord(entry[1], duplicata));
            }
            return result;
        }
        else {
            return CopyPaste.clone(source, duplicata);
        }
    }

    let copy = duplicata.get(source);
    if (copy) return copy;
    copy = {};
    duplicata.set(source, copy);
    copy.__proto__ = source.__proto__;
    for (let property in source) {
        if (source.hasOwnProperty(property)) {
            if (source[property] && typeof(source[property])==='object') {
                copy[property] = cloneObject(source[property], duplicata);
            }
            else {
                copy[property] = source[property];
            }
        }
    }
    return copy;
};
makeObservable(CopyPaste);

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
        doc.addEventListener("keyup", event => {
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
            this._undoTrx.length > 1 ||
            (this._current() && this._current().keys().length > 0)
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
                current.set(element, element._memento());
                this._fire(Memento.events.KEEP, element);
            }
            return this;
        }
    }

    undo() {
        if (!Context.readOnly) {
            let current = this._undoTrx.pop();
            if (current.size === 0) {
                current = this._undoTrx.pop();
            }
            if (current) {
                this.opened = false;
                let redo = new Map();
                for (let element of current.keys()) {
                    redo.set(element, element._memento());
                }
                for (let element of current.keys()) {
                    element._revert(current.get(element));
                }
                for (let element of current.keys()) {
                    element._recover && element._recover(current.get(element));
                }
                this.opened = true;
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
                let undo = new Map();
                for (let element of current.keys()) {
                    undo.set(element, element._memento());
                }
                for (let element of current.keys()) {
                    element._revert(current.get(element));
                }
                for (let element of current.keys()) {
                    element._recover && element._recover(current.get(element));
                }
                if (this._current().size === 0) {
                    this._undoTrx.pop();
                }
                this.opened = true;
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
            this._selection.delete(selectable);
            selectable.unselect && selectable.unselect();
            selectable.selectFrame && (selectable.selectFrame.filter = null);
            this._fire(Events.UNSELECT, selectable);
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

