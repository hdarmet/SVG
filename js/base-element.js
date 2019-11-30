'use strict';

import {
    createUUID, same
} from "./misc.js";
import {
    ESet
} from "./collections.js";
import {
    Box, getBox, Matrix
} from "./geometry.js";
import {
    Group, l2l, l2m, Rect, Translation, Visibility
} from "./graphics.js";
import {
    areaDrag, Cloning, Context, CopyPaste, Events, getCanvasLayer, makeNotCloneable, makeObservable, Memento, Canvas
} from "./toolkit.js";
import {
    makeClickable, makeContainer, makeDraggable, makePartsOwner, makeShaped, makeSupport,
    makeZindexContainer
} from "./core-mixins.js";

export class BoardElement {

    constructor(width, height, ...args) {
        this._width = width;
        this._height = height;
        console.assert(this._width!==undefined&&this._height!==undefined);
        this._id = createUUID();
        this._createStructure();
        this._init(...args);
        this._improve(...args);
        this._finish(...args);
    }

    _init(...args) {}
    _improve(...args) {}
    _finish(...args) {}

    _dropTarget(element) {
        return this;
    }

    finalize() {
        Memento.register(this);
        if (this._observables) {
            for (let observable of this._observables) {
                observable.removeObserver(this);
            }
        }
        if (this._observers) {
            for (let observer of this._observers) {
                this.removeObserver(observer);
            }
        }
    }

    _notified(source, type) {}

    _createStructure() {
        this._root = new Translation();
        this._root._id = "root";
        this._root._owner = this;
        this._tray = new Group();
        this._root.add(this._tray);
        this._parent = null;
    }

    duplicate(duplicata) {
        let copy = duplicata.get(this);
        if (!copy) {
            copy = this.clone(duplicata);
            duplicata.set(this, copy);
        }
        return copy;
    }

    _memento() {
        let memento = {};
        memento._parent = this._parent;
        memento._width = this._width;
        memento._height = this._height;
        if (this._observables) {
            memento._observables = [...this._observables];
        }
        memento.rootMatrix = this._root.matrix.clone();
        return memento;
    }

    _revert(memento) {
        this._parent = memento._parent;
        this._width = memento._width;
        this._height = memento._height;
        if (memento._observables) {
            this._observables = new ESet(memento._observables);
            for (let observable of this._observables) {
                observable._addObserver(this);
            }
        }
        this._root.matrix = memento.rootMatrix;
        return this;
    }

    _recover(memento) {
    }

    _observe(observable) {
        if (!this._observables) {
            this._observables = new ESet();
        }
        this._observables.add(observable);
        observable.addObserver(this);
        return this;
    }

    _forget(observable) {
        if (this._observables) {
            this._observables.delete(observable);
            if (!this._observables.size) {
                this._observables = null;
            }
        }
        observable.removeObserver(this);
        return this;
    }

    _setLocation(x, y) {
        this._matrix = Matrix.translate(x, y);
        return this;
    }

    setLocation(x, y) {
        if (!same(x, this.lx) || !same(y, this.ly)) {
            Memento.register(this);
            this._setLocation(x, y);
            this._fire(Events.GEOMETRY, this.lx, this.ly, this.width, this.height);
            return true;
        }
        return false;
    }

    _setSize(width, height) {
        this._width = width;
        this._height = height;
        return this;
    }

    setSize(width, height) {
        if (!same(width, this.width) || !same(height, this.height)) {
            Memento.register(this);
            this._setSize(width, height);
            this._fire(Events.GEOMETRY, this.lx, this.ly, this.width, this.height);
            return true;
        }
        return false;
    }

    get x() {return 0;}
    get y() {return 0;}
    get width() {return this._width;}
    get height() {return this._height;}
    get left() {return this.x - this.width/2;}
    get right() {return this.x + this.width/2;}
    get top() {return this.y - this.height/2;}
    get bottom() {return this.y + this.height/2;}

    get matrix() { return this._root.matrix; }
    set _matrix(matrix) {
        this._root.matrix = matrix;
    }
    set matrix(matrix) {
        Memento.register(this);
        this._matrix = matrix;
    }
    get local() { return this.matrix; }
    get global() { return this._root.globalMatrix; }
    get diff() { return this.global.mult(this.local.invert()) }

    get lbbox() {
        return new Box(this.left, this.top, this.right-this.left, this.bottom-this.top);
    }
    l2pbbox() {
        let result = l2m(this.matrix,
            this.left, this.top, this.right, this.top,
            this.left, this.bottom, this.right, this.bottom);
        return getBox(result);
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
        left = x1>x2?x2:x1;
        right = x1>x2?x1:x2;
        top = y1>y2?y2:y1;
        bottom = y1>y2?y1:y2;
        return new Box(left, top, right-left, bottom-top);
    }

    get localGeometry() { return this._geometry(this.matrix); }
    get globalGeometry() { return this._geometry(this.global); }
    get lx() { return this.matrix.x(0, 0); }
    get ly() { return this.matrix.y(0, 0); }
    get gx() { return this.global.x(0, 0); }
    get gy() { return this.global.y(0, 0); }
    get clx() { return this.canvasLayerMatrix.x(0, 0); }
    get cly() { return this.canvasLayerMatrix.y(0, 0); }
    get location() { return {x:this.lx, y:this.ly} }
    get position() { return {x:this.gx, y:this.gy} }

    relativeGeometry(matrix) {
        let relative = this.relative(matrix);
        return this._geometry(this.relative);
    }

    get parent() {
        return this._parent;
    }

    get support() {
        let parent = this.parent;
        return parent ? parent : Canvas.instance.getGlassSupport(this);
    }

    hover(elements) {
        this._fire(Events.HOVER, elements);
    }

    get visible() {
        let visible = this._root.visibility;
        return !visible;
    }

    show() {
        this._root.visibility = null;
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

    accept(visitor) {
        visitor.action.call(this, visitor.context);
        return this;
    }

    get canvasLayer() {
        return getCanvasLayer(this._root);
    }

    get canvasLayerMatrix() {
        let layer = this.canvasLayer;
        return this.global.mult(layer.globalMatrix.invert());
    }

    clone(duplicata) {
        return this._cloning(duplicata);
    }

    /**
     * Effective implementation of element cloning.
     * @param duplicata map of clones (referred by 'element cloned'->'clone')
     * @private
     */
    _cloning(duplicata) {
        let copy = CopyPaste.clone(this, duplicata);
        copy._root._owner = copy;
        copy._id = createUUID();
        return copy;
    }

    _cloned(copy, duplicata) {
        this._cloneObservers(duplicata);
    }

    _draggedFrom(dragged, dragSet) {
    }

    _droppedIn(dragged, dragSet) {
    }

    _revertDroppedIn(parent) {
    }
}
makeObservable(BoardElement, Cloning.NONE);

export class BoardArea extends BoardElement {

    constructor(width, height, backgroundColor) {
        super(width, height);
        let background = new Rect(-width/2, -height/2, width, height);
        background.fill = backgroundColor;
        this._initShape(background);
        this._setSize(width, height);
        this._dragOperation(function() {return areaDrag;});
        this._clickHandler(null);
    }

    get color() {
        return this.shape.fill;
    }

    _setSize(width, height) {
        super._setSize(width, height);
        this.shape.attrs({
            width: width,
            height: height,
            x: -width / 2,
            y: -height / 2
        });
    }

    _acceptDrop() {
        return true;
    }
}
makeShaped(BoardArea);
makeContainer(BoardArea);
makeDraggable(BoardArea);
makeClickable(BoardArea);
makeNotCloneable(BoardArea);

export class BoardTable extends BoardArea {

    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
        this._observe(CopyPaste.instance);
    }

    _setSize(width, height) {
        super._setSize(width, height);
        Canvas.instance.setBaseSize(width, height);
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
makePartsOwner(BoardTable);

/**
 * Abstract class for element that (generally) are part of another element and define the "content" of this element:
 * the area where other first class elements can be dropped on.
 * <p> Note that a support is a valid drop target (it must have a reachable "shape" like a rect or an image).
 */
export class BoardSupport extends BoardElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
    }

}
makeSupport(BoardSupport);
makeDraggable(BoardSupport);

/**
 * Base class for layers. Layers are part elements that materialize slices in a "stack" of invisible supports elements.
 * Generally the "stack" is the content of a first class element.
 * <p> Note that a layer is not a support : it has no shape and cannot be a reachable target of a drop operation (a
 * simple "g" cannot be targeted). "Dropped" element are given by parent element to the layer.
 */
export class BoardBaseLayer extends BoardElement {

    constructor() {
        super(0, 0);
    }

    get width() {
        return this.parent.width;
    }

    get height() {
        return this.parent.height;
    }

    _acceptDrop(element) {
        return true;
    }
}

/**
 * Class for simple layers (the layer is a basic container)
 */
export class BoardLayer extends BoardBaseLayer {

    constructor() {
        super();
    }

}
makeContainer(BoardLayer);

/**
 * Class for layers that use the z-index strategy to place the dropped elements.
 */
export class BoardZindexLayer extends BoardBaseLayer {

    constructor() {
        super();
    }

}
makeZindexContainer(BoardZindexLayer);

export class Visitor {

    constructor(elements, context, action) {
        this._visited = new ESet();
        this._context = context;
        this._action = action;
        for (let element of elements) {
            this.visit(element);
        }
    }

    get context() {
        return this._context;
    }

    get action() {
        return this._action;
    }

    visit(element) {
        if (!this._visited.has(element)) {
            this._visited.add(element);
            element.accept(this);
        }
    }

}
