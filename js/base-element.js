'use strict';

import {
    createUUID, same, assert
} from "./misc.js";
import {
    ESet
} from "./collections.js";
import {
    Box2D, getBox, Matrix2D, Point2D
} from "./geometry.js";
import {
    Group, l2l, l2m, Rect, Translation, Visibility, SVGEvents
} from "./graphics.js";
import {
    Cloning, Context, Selection, CopyPaste, Events, getCanvasLayer, makeNotCloneable, makeObservable,
    Memento, Canvas, CloneableObject
} from "./toolkit.js";
import {
    areaDrag
} from "./drag-and-drop.js";
import {
    makeClickable, makeDraggable, makeShaped
} from "./core-mixins.js";
import {
    makeContainer, makeSupport, makeZindexContainer, makePartsOwner
} from "./container-mixins.js";

export class SigmaElement {

    constructor(width, height, ...args) {
        this._width = width;
        this._height = height;
        assert(this._width!==undefined&&this._height!==undefined);
        this._id = createUUID();
        this._createStructure();
        this._init(...args);
        this._improve(...args);
        this._finish(...args);
    }

    _init(...args) {}
    _improve(...args) {}
    _finish(...args) {}

    _enterCanvas() {
    }

    _exitCanvas() {
    }

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
        //this._root.on(SVGEvents.SVG_IN, event=>this._enterCanvas());
        //this._root.on(SVGEvents.SVG_OUT, event=>this._exitCanvas());
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

    _setLocation(point) {
        this._matrix = Matrix2D.translate(point.x, point.y);
        return this;
    }

    setLocation(point) {
        if (!point.same(this.lloc)) {
            Memento.register(this);
            this._setLocation(point);
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
        return new Box2D(this.left, this.top, this.right-this.left, this.bottom-this.top);
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
        let v = [this.left, this.right],
            h = [this.top, this.bottom];
        let left, right, top, bottom;
        for (let x of v) {
            for (let y of h) {
                let {x:lx, y:ly, z:lz} = matrix.point(new Point2D(x, y));
                if (left===undefined || left>lx) left = lx;
                if (right===undefined || right<lx) right = lx;
                if (top===undefined || top>ly) top = ly;
                if (bottom===undefined || bottom<ly) bottom = ly;
            }
        }
        return new Box2D(left, top, right-left, bottom-top);
    }

    get localGeometry() { return this._geometry(this.matrix); }
    get globalGeometry() { return this._geometry(this.global); }
    get lx() { return this.matrix.x(0, 0); }
    get ly() { return this.matrix.y(0, 0); }
    get lloc() { return new Point2D(this.lx, this.ly)}
    get gx() { return this.global.x(0, 0); }
    get gy() { return this.global.y(0, 0); }
    get gloc() { return new Point2D(this.gx, this.gy)}
    get clx() { return this.canvasLayerMatrix.x(0, 0); }
    get cly() { return this.canvasLayerMatrix.y(0, 0); }

    relativeGeometry(matrix) {
        let relative = this.relative(matrix);
        return this._geometry(this.relative);
    }

    _setParent(parent) {
        this._parent = parent;
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

    detach() {
        let parent = this.parent;
        if (parent) {
            assert(parent.detachChild);
            parent.detachChild(this);
        }
        return this;
    }

    accept(visitor) {
        visitor.action.call(this, visitor.context);
        return this;
    }

    visit(context, action) {
        new Visitor([this], context, action);
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
        //copy._root.on(SVGEvents.SVG_IN, event=>copy._enterCanvas());
        //copy._root.on(SVGEvents.SVG_OUT, event=>copy._exitCanvas());
        return copy;
    }

    _cloned(copy, duplicata) {
        this._cloneObservers(duplicata);
    }

    _draggedFrom(support, dragSet, initialTarget) {
    }

    _hoverOn(support) {
        Selection.instance.select(this);
    }

    _droppedIn(support, dragSet, initialTarget) {
    }

    _revertDroppedIn(parent) {
    }

    _receiveDrop(dragged, dragSet, initialTarget) {
    }

    _getElementOnPoint(lpoint) {
        if (lpoint.x>-this.width/2 && lpoint.x<this.width/2 && lpoint.y>-this.height/2 && lpoint.y<this.height/2) {
            return this;
        }
        else {
            return null;
        }
    }

    getElementOnPoint(point) {
        let lpoint = this.local.invert().point(point);
        return this._getElementOnPoint(lpoint);
    }

}
makeObservable(SigmaElement, Cloning.NONE);

export class SigmaArea extends SigmaElement {

    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
    }

    _improve(backgroundColor) {
        let background = new Rect(-this.width/2, -this.height/2, this.width, this.height);
        background.fill = backgroundColor;
        this._initShape(background);
        this._setSize(this.width, this.height);
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
makeShaped(SigmaArea);
makeContainer(SigmaArea);
makeDraggable(SigmaArea);
makeClickable(SigmaArea);
makeNotCloneable(SigmaArea);

export class SigmaTable extends SigmaArea {

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
                this.addChild(copy);
            }
        }
    }

    get support() {
        return Canvas.instance.baseLayer;
    }
}
makePartsOwner(SigmaTable);

/**
 * Abstract class for element that (generally) are part of another element and define the "content" of this element:
 * the area where other first class elements can be dropped on.
 * <p> Note that a support is a valid drop target (it must have a reachable "shape" like a rect or an image).
 */
export class SigmaSupport extends SigmaElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
    }

}
makeSupport(SigmaSupport);
makeDraggable(SigmaSupport);

/**
 * Base class for layers. Layers are part elements that materialize slices in a "stack" of invisible supports elements.
 * Generally the "stack" is the content of a first class element.
 * <p> Note that a layer is not a support : it has no shape and cannot be a reachable target of a drop operation (a
 * simple "g" cannot be targeted). "Dropped" element are given by parent element to the layer.
 */
export class SigmaBaseLayer extends SigmaElement {

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
export class SigmaLayer extends SigmaBaseLayer {

    constructor() {
        super();
    }

}
makeContainer(SigmaLayer);

/**
 * Class for layers that use the z-index strategy to place the dropped elements.
 */
export class SigmaZindexLayer extends SigmaBaseLayer {

    constructor() {
        super();
    }

}
makeZindexContainer(SigmaZindexLayer);

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
