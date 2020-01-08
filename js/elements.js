'use strict';

import {
    List, ESet, EMap
} from "./collections.js";
import {
    Box, Matrix
} from "./geometry.js";
import {
    Group, Rect, Fill, Stroke, Visibility, win, Colors, Circle, Line, AlignmentBaseline, TextAnchor, Translation, Text,
    Rotation
} from "./graphics.js";
import {
    Memento, Context, Events, makeNotCloneable, Canvas, makeSingleton, Selection, l2pBoundingBox, computeGridStep
} from "./toolkit.js";
import {
    DragSwitchOperation, DragOperation, DragMoveSelectionOperation, DragRotateSelectionOperation, DragAreaOperation,
    ifStandardDragMode, standardDrag, areaDrag, StandardDragMode
} from "./drag-and-drop.js";
import {
    SigmaElement, SigmaSupport, SigmaLayer, SigmaZindexLayer
} from "./base-element.js";
import {
    makeDraggable, makeSelectable, makeMovable, makeRotatable, makeClickable, makeFramed, makeSingleImaged,
    makeMultiImaged, makeClipImaged, makeShaped, makeDeletable, Decoration, makeElevable
} from "./core-mixins.js";
import {
    makeContainer, makeSupport, makePart, makeLayersWithContainers, makeLayered, makeContainerASandBox,
    makeContainerASupport, makePartsOwner
} from "./container-mixins.js";
import {
    TextMenuOption, TextToggleMenuOption, makeMenuOwner, ToolToggleCommand
} from "./tools.js";
import {
    makePositioningContainer
} from "./physics.js";
import {
    makeStrokeUpdatable
} from "./standard-mixins.js";
import {
    defineMethod, extendMethod, proposeMethod, defineGetProperty
} from "./misc.js";
import {
    Bubble, PlainArrow
} from "./svgtools.js";

Context.itemDrag = new DragSwitchOperation()
    .add(()=>true, DragRotateSelectionOperation.instance)
    .add(()=>true, DragMoveSelectionOperation.instance);

/**
 * Base class for elements that materialize the "content" of something. For example the content of a box. Essentially,
 * it is a "support" (other elements may dropped on) with a shape (a background visual) and is not independant (part of
 * another element, cannot be moved by itself).
 */
export class AbstractSigmaContent extends SigmaSupport {

    constructor(owner, width, height, ...args) {
        super(width, height, ...args);
        //this._initPart(owner);
    }

    _acceptDrop(element) {
        if (this._orientation !== undefined) {
            if (!element.rotate) return false;
            element.rotate(this._orientation);
        }
        let box = element.l2lbbox(this);
        return box.width<=this.width && box.height<=this.height;
    }

    _memento() {
        let memento = super._memento();
        memento._orientation = this._orientation;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._orientation = memento._orientation;
        return this;
    }

    add(element) {
        super.add(element);
        this._observe(element);
    }

    remove(element) {
        this._forget(element);
        super.remove(element);
    }

    _notified(source, type, value) {
        if (type===Events.GEOMETRY || type===Events.ROTATED || type===Events.DROPPED) {
            this._adjustElement(source);
        }
    }

    get orientation() {
        return this._orientation;
    }

    set orientation(orientation) {
        Memento.register(this);
        this._setOrientation(orientation);
    }

    _setOrientation(orientation) {
        this._orientation = orientation;
        for (let element of this.children) {
            if (element.rotate) {
                element.rotate(this._orientation);
                this._adjustElement(element);
            }
        }
    }

    _adjustElement(element) {
        let box = element.l2lbbox(this);
        if (box.x<this.left) box.x=this.left;
        if (box.x+box.width>this.right) box.x=this.right-box.width;
        if (box.y<this.top) box.y=this.top;
        if (box.y+box.height>this.bottom) box.y=this.bottom-box.height;
        element.move(box.x+box.width/2, box.y+box.height/2);
    }
}
makePart(AbstractSigmaContent);

export class AbstractSigmaCover extends SigmaElement {

    constructor(owner, width, height, ...args) {
        super(width, height);
        //this._initPart(owner);
        this._hidden = false;
        this.initShape(width, height,...args);
    }

    _memento() {
        let memento = super._memento();
        memento._hidden = this._hidden;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._setHidden(memento._hidden);
        return this;
    }

    _acceptDrop(element) {
        return true;
    }

    _setHidden(hidden) {
        this._hidden = hidden;
        if (this._hidden) {
            this._root.visibility = Visibility.HIDDEN;
        }
        else {
            this._root.visibility = null;
        }
    }

    get hidden() {
        return this._hidden;
    }

    hide() {
        Memento.register(this);
        this._setHidden(true);
        return this;
    }

    show() {
        Memento.register(this);
        this._setHidden(false);
        return this;
    }
}
makeDraggable(AbstractSigmaCover);
makePart(AbstractSigmaCover);
makeContainer(AbstractSigmaCover);

export class AbstractSigmaBox extends SigmaElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height,...args);
        this._dragOperation(function() {return Context.itemDrag;});
        this._boxContent = this.initBoxContent(width, height,...args);
        this._boxCover = this.initBoxCover(width, height,...args);
        this._addChild(this._boxContent);
        this._addChild(this._boxCover);
        this.addMenuOption(new TextToggleMenuOption("Hide cover", "Show cover",
            function() {
                Memento.instance.open();
                this._boxCover.hide();
            },
            function() {
                Memento.instance.open();
                this._boxCover.show();
            },
            function() {return this._boxCover.hidden;}));
    }

    get orientation() {
        return this._boxContent.orientation;
    }

    set orientation(orientation) {
        this._boxContent.orientation = orientation;
    }

    _acceptDrop() {
        return false;
    }

    _memento() {
        let memento = super._memento();
        memento._boxContent = this._boxContent;
        memento._boxCover = this._boxCover;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (this._boxContent != memento._boxContent) {
            this._replace(this._boxContent, memento._boxContent);
        }
        if (this._boxCover != memento._boxCover) {
            this._replace(this._boxCover, memento._boxCover);
        }
    }

}
makeSelectable(AbstractSigmaBox);
makeMovable(AbstractSigmaBox);
makeRotatable(AbstractSigmaBox);
makeContainer(AbstractSigmaBox);
makeDraggable(AbstractSigmaBox);
makeMenuOwner(AbstractSigmaBox);

export class SigmaContent extends AbstractSigmaContent {

    constructor(owner, width, height, strokeColor, backgroundColor) {
        super(owner, width, height, strokeColor, backgroundColor);
    }

    initShape(width, height, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }
}
makeFramed(SigmaContent);

export class SigmaCover extends AbstractSigmaCover {

    constructor(owner, width, height, strokeColor, backgroundColor) {
        super(owner, width, height, strokeColor, backgroundColor);
    }

    initShape(width, height, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }
}
makeFramed(SigmaCover);

export class SigmaBox extends AbstractSigmaBox {

    constructor(width, height, margin, strokeColor, backgroundColor) {
        super(width, height, margin, strokeColor, backgroundColor);
    }

    initShape(width, height, margin, strokeColor, backgroundColor) {
        return this._initFrame(width, height, strokeColor, backgroundColor);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundColor) {
        return new SigmaContent(this, width-margin/2, height-margin/2, strokeColor, backgroundColor);
    }

    initBoxCover(width, height, margin, strokeColor, backgroundColor) {
        return new SigmaCover(this, width, height, strokeColor, backgroundColor);
    }

}
makeFramed(SigmaBox);

export class SigmaImageContent extends AbstractSigmaContent {

    constructor(owner, width, height, strokeColor, backgroundURL) {
        super(owner, width, height, strokeColor, backgroundURL);
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }
}
makeSingleImaged(SigmaImageContent);

export class SigmaImageCover extends AbstractSigmaCover {

    constructor(owner, width, height, strokeColor, backgroundURL) {
        super(owner, width, height, strokeColor, backgroundURL);
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }
}
makeSingleImaged(SigmaImageCover);

export class SigmaImageBox extends AbstractSigmaBox {

    constructor(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        super(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL);
    }

    initShape(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return this._initImage(width, height, strokeColor, backgroundURL, sideURL);
    }

    initBoxContent(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return new SigmaImageContent(this, width-margin/2, height-margin/2, strokeColor, sideURL);
    }

    initBoxCover(width, height, margin, strokeColor, backgroundURL, sideURL, coverURL) {
        return new SigmaImageCover(this, width, height, strokeColor, coverURL);
    }

}
makeSingleImaged(SigmaImageBox);

export class AbstractSigmaCounter extends SigmaElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
        this._dragOperation(function() {return Context.itemDrag;});
        this._clickHandler(function () {
            return ()=>this.imageIndex = this.imageIndex+1;
        });
    }
}
makeSelectable(AbstractSigmaCounter);
makeMovable(AbstractSigmaCounter);
makeRotatable(AbstractSigmaCounter);
makeDraggable(AbstractSigmaCounter);
makeClickable(AbstractSigmaCounter);
makeMenuOwner(AbstractSigmaCounter);
makeSupport(AbstractSigmaCounter);
makePositioningContainer( AbstractSigmaCounter, {
    predicate: element => element instanceof SigmaCounter,
    positionsBuilder: function () {
        return [{x: 0, y: 0}]
    }
});

export class SigmaCounter extends AbstractSigmaCounter {

    constructor(width, height, strokeColor, ...backgroundURLs) {
        super(width, height, strokeColor, ...backgroundURLs)
    }

    initShape(width, height, strokeColor, ...backgroundURLs) {
        return this._initImages(width, height, strokeColor, ...backgroundURLs);
    }

}
makeMultiImaged(SigmaCounter);
makeLayered(SigmaCounter, {layer: "content"});

export class AbstractSigmaDie extends SigmaElement {

    constructor(width, height, ...args) {
        super(width, height);
        this.initShape(width, height, ...args);
        this._dragOperation(function() {return DragMoveSelectionOperation.instance;});
        this._clickHandler(function () {
            return ()=> {
                for (let t = 0; t < 10; t++) {
                    win.setTimeout(() => {
                        let index = Math.floor(Math.random() * this.faceCount);
                        this.imageIndex = index;
                    }, t * 100);
                }
            }
        });
    }

    get faceCount() {
        return this._faceCount;
    }
}
makeSelectable(AbstractSigmaDie);
makeMovable(AbstractSigmaDie);
makeDraggable(AbstractSigmaDie);
makeClickable(AbstractSigmaDie);
makeMenuOwner(AbstractSigmaDie);
makeSupport(AbstractSigmaDie);

export class SigmaDie extends AbstractSigmaDie {

    constructor(width, height, strokeColor, imageURL, ...clipped) {
        super(width, height, strokeColor, imageURL, ...clipped);
        this._faceCount = clipped.length;
    }

    initShape(width, height, strokeColor, imageURL, ...clipped) {
        return this._initImages(width, height, strokeColor, imageURL, ...clipped);
    }

}
makeClipImaged(SigmaDie);

export class AbstractSigmaMap extends SigmaElement {

    constructor(width, height, ...args) {
        super(width, height);
        this._root.add(this._initRotatable() // TODO problem
            .add(this.initShape(width, height, ...args))
        );
        this._dragOperation(function() {return Context.itemDrag;});
        this._build();
    }

    _build() {
    }

}
makeSelectable(AbstractSigmaMap);
makeMovable(AbstractSigmaMap);
makeRotatable(AbstractSigmaMap);
makeDraggable(AbstractSigmaMap);
makeMenuOwner(AbstractSigmaMap);

export class SigmaMap extends AbstractSigmaMap {

    constructor(width, height, strokeColor, backgroundURL) {
        super(width, height, strokeColor, backgroundURL)
    }

    initShape(width, height, strokeColor, backgroundURL) {
        return this._initImage(width, height, strokeColor, backgroundURL);
    }

}
makeSingleImaged(SigmaMap);

export class DragHandleOperation extends DragOperation {

    constructor() {
        super();
    }

    accept(element, x, y, event) {
        return (!Context.isReadOnly() && element.movable && super.accept(element, x, y, event));
    }

    doDragStart(handle, x, y, event) {
        Memento.instance.open();
        Memento.register(handle);
        let invertedMatrix = handle.global.invert();
        this.dragX = invertedMatrix.x(x, y);
        this.dragY = invertedMatrix.y(x, y);
        handle.parent._fire(DragHandleOperation.events.START_DRAG_HANDLE, handle);
    }

    doDragMove(handle, x, y, event) {
        let invertedMatrix = handle.parent.global.invert();
        let dX = invertedMatrix.x(x, y) - this.dragX;
        let dY = invertedMatrix.y(x, y) - this.dragY;
        handle._setLocation(dX, dY);
        handle.parent._receiveMoveHandle && handle.parent._receiveMoveHandle(handle);
        handle.parent._fire(DragHandleOperation.events.DRAG_HANDLE, handle);
    }

    doDrop(handle, x, y, event) {
        handle.parent._receiveDropHandle && handle.parent._receiveDropHandle(handle);
        handle._droppedIn(handle.parent);
        handle.parent._fire(DragHandleOperation.events.DROP_HANDLE, handle);

    }
}
makeNotCloneable(DragHandleOperation);
DragHandleOperation.events = {
    START_DRAG_HANDLE: "start-drag-handle",
    DRAG_HANDLE: "drag-handle",
    DROP_HANDLE: "drop-handle"
};
DragHandleOperation.instance = new DragHandleOperation();

export class SigmaHandle extends SigmaElement {

    constructor(color = SigmaHandle.COLOR, direction) {
        let zoom = Canvas.instance.zoom;
        super(0, 0);
        this._direction = direction;
        this.initShape(SigmaHandle.SIZE/zoom, SigmaHandle.SIZE/zoom, color, zoom);
        this._dragOperation(function() {return DragHandleOperation.instance;});
        this._observe(Canvas.instance);
    }

    get direction() {
        return this._direction;
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({
                x:-SigmaHandle.SIZE/zoom/2, y:-SigmaHandle.SIZE/zoom/2,
                width:SigmaHandle.SIZE/zoom, height:SigmaHandle.SIZE/zoom, stroke_width:1/zoom
            });
        }
    }

    initShape(width, height, strokeColor, zoom) {
        let shape = new Rect(-width/2, -height/2, width, height)
            .attrs({stroke:strokeColor, fill_opacity:0.01, stroke_width:1/zoom});
        return this._initShape(shape);
    }

    _droppedIn() {}

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }
}
makeMovable(SigmaHandle);
makeShaped(SigmaHandle);
makeDraggable(SigmaHandle);
SigmaHandle.SIZE = 8;
SigmaHandle.COLOR = Colors.RED;
SigmaHandle.TOP = 0;
SigmaHandle.RIGHT_TOP = 1;
SigmaHandle.RIGHT = 2;
SigmaHandle.RIGHT_BOTTOM = 3;
SigmaHandle.BOTTOM = 4;
SigmaHandle.LEFT_BOTTOM = 5;
SigmaHandle.LEFT = 6;
SigmaHandle.LEFT_TOP = 7;
SigmaHandle.ALL = new ESet([
    SigmaHandle.TOP, SigmaHandle.RIGHT_TOP, SigmaHandle.RIGHT, SigmaHandle.RIGHT_BOTTOM,
    SigmaHandle.BOTTOM, SigmaHandle.LEFT_BOTTOM, SigmaHandle.LEFT, SigmaHandle.LEFT_TOP
]);

export function makeResizeable(superClass, spec=SigmaHandle.ALL, computeStep = null) {

    defineMethod(superClass,
        function _initResize(color) {
            this._handles = new List();
            this._leftTopHandle = this._createHandle(color, SigmaHandle.LEFT_TOP);
            this._topHandle = this._createHandle(color, SigmaHandle.TOP);
            this._rightTopHandle = this._createHandle(color, SigmaHandle.RIGHT_TOP);
            this._rightHandle = this._createHandle(color, SigmaHandle.RIGHT);
            this._rightBottomHandle = this._createHandle(color, SigmaHandle.RIGHT_BOTTOM);
            this._bottomHandle = this._createHandle(color, SigmaHandle.BOTTOM);
            this._leftBottomHandle = this._createHandle(color, SigmaHandle.LEFT_BOTTOM);
            this._leftHandle = this._createHandle(color, SigmaHandle.LEFT);
        }
    );

    defineMethod(superClass,
        function _putHandles() {
            for (let handle of this._handles) {
                if (spec.has(handle.direction)) {
                    this._root.add(handle._root);
                    handle._parent = this;
                }
            }
            this._placeHandles();
        }
    );

    defineMethod(superClass,
        function putHandles() {
            for (let handle of this._handles) {
                Memento.register(handle);
            }
            this._putHandles();
        }
    );

    defineMethod(superClass,
        function _removeHandles() {
            for (let handle of this._handles) {
                if (spec.has(handle.direction)) {
                    this._root.remove(handle._root);
                    handle._parent = null;
                }
            }
        }
    );

    defineMethod(superClass,
        function removeHandles() {
            for (let handle of this._handles) {
                Memento.register(handle);
            }
            this._removeHandles();
        }
    );

    defineMethod(superClass,
        function _placeHandles() {
            this._leftTopHandle._setLocation(-this.width/2, -this.height/2);
            this._topHandle._setLocation(0, -this.height/2);
            this._rightTopHandle._setLocation(this.width/2, -this.height/2);
            this._rightHandle._setLocation(this.width/2, 0);
            this._rightBottomHandle._setLocation(this.width/2, this.height/2);
            this._bottomHandle._setLocation(0, this.height/2);
            this._leftBottomHandle._setLocation(-this.width/2, this.height/2);
            this._leftHandle._setLocation(-this.width/2, 0);
        }
    );

    defineMethod(superClass,
        function placeHandles() {
            for (let handle of this._handles) {
                Memento.register(handle);
            }
            this._placeHandles();
        }
    );

    defineMethod(superClass,
        function _createHandle(color, direction) {
            let handle = new SigmaHandle(color, direction);
            this._handles.add(handle);
            return handle;
        }
    );

    extendMethod(superClass, $resize=>
        function resize(width, height, direction) {
            let minWidth = this.minWidth;
            let minHeight = this.minHeight;
            if (minWidth!==undefined && width<minWidth) width = minWidth;
            if (minHeight!==undefined && height<minHeight) height = minHeight;
            $resize && $resize.call(this, width, height, direction);
            this.setSize(width, height);
            return this;
        }
    );

    /**
     * Defines in the bounds, the resizeable item cannot exceed. The defaulting value is the geometry of the item
     * parent.
     */
    proposeMethod(superClass,
        function bounds() {
            return {
                left: -this.parent.width / 2-this.lx, right: this.parent.width / 2-this.lx,
                top: -this.parent.height / 2-this.ly, bottom: this.parent.height / 2-this.ly
            }
        }
    );

    /**
     * Process the "drop" of one of the resizeable item handles. This method has three missions:
     * <ul>
     *     <li> Ensure the item cannot go outside the allowed bounds.
     *     <li> Ensure that handles are not permuted ("left" handles go to right and vice versa, or "top" handles go to
     *     bottom and vice versa). If handles are permuted, this method reorganize the handles accordingly.
     *     <li> Update the geometry (size and position) of the resizeable item (and update handles positions).
     * </ul>
     * @param element resizeable item
     * @private
     */
    defineMethod(superClass,
        function _receiveMoveHandle(handle) {

            /**
             * Ensure that the element to resize is inside the allowed bounds. If not, reduce its geometry
             * accordingly to bound constraints.
             * @param element resizeable item to rebound
             * @param bounds the allowed bounds
             */
            function rebound(element, bounds) {
                let lx = element.lx;
                let ly = element.ly;
                if (lx<bounds.left) lx = bounds.left;
                if (lx>bounds.right) lx = bounds.right;
                if (ly<bounds.top) ly = bounds.top;
                if (ly>bounds.bottom) ly = bounds.bottom;
                if (lx!==element.lx || ly!==element.ly) {
                    Memento.register(element);
                    element._setLocation(lx, ly);
                }
            }

            function updateHandlesVisibility() {
                for (let handle of this._handles) {
                    if (spec.has(handle.direction) && !handle._parent) {
                        this._root.add(handle._root);
                        handle._parent = this;
                    }
                    else if (!spec.has(handle.direction) && handle._parent) {
                        this._root.remove(handle._root);
                        handle._parent = null;
                    }
                }
            }

            if (handle instanceof SigmaHandle) {
                rebound(handle, this.bounds());
                this._movedHandle = handle;
                let width = this.width;
                let height = this.height;
                let lx = this.lx;
                let ly = this.ly;
                let step = computeStep ? computeStep(handle).step : null;
                // Permutation management
                if (this.resizeLeft) {
                    width = -handle.lx+this.width/2;
                    if (step) width = Math.round(width/step)*step;
                    lx += (this.width-width)/2;
                }
                else if (this.resizeRight) {
                    width = handle.lx+this.width/2;
                    if (step) width = Math.round(width/step)*step;
                    lx += (width-this.width)/2;
                }
                if (this.resizeTop) {
                    height = -handle.ly+this.height/2;
                    if (step) height = Math.round(height/step)*step;
                    ly += (this.height-height)/2;
                }
                else if (this.resizeBottom) {
                    height = handle.ly+this.height/2;
                    if (step) height = Math.round(height/step)*step;
                    ly += (height-this.height)/2;
                }
                if (width<0) {
                    width = -width;
                    let hdl = this._leftTopHandle; this._leftTopHandle = this._rightTopHandle; this._rightTopHandle = hdl;
                    hdl = this._leftHandle; this._leftHandle = this._rightHandle; this._rightHandle = hdl;
                    hdl = this._leftBottomHandle; this._leftBottomHandle = this._rightBottomHandle; this._rightBottomHandle = hdl;
                }
                if (height<0) {
                    height = -height;
                    let hdl = this._leftTopHandle; this._leftTopHandle = this._leftBottomHandle; this._leftBottomHandle = hdl;
                    hdl = this._topHandle; this._topHandle = this._bottomHandle; this._bottomHandle = hdl;
                    hdl = this._rightTopHandle; this._rightTopHandle = this._rightBottomHandle; this._rightBottomHandle = hdl;
                }
                updateHandlesVisibility.call(this);
                // Geometry update
                Memento.register(this);
                this.resize(width, height, handle.direction);
                // Adjust position parameter in case of min width/height limits reached.
                if (this.resizeLeft) {
                    lx += (width-this.width)/2;
                }
                else if (this.resizeRight) {
                    lx += (this.width-width)/2;
                }
                if (this.resizeTop) {
                    ly += (height-this.height)/2;
                }
                else if (this.resizeBottom) {
                    ly += (this.height-height)/2;
                }
                this.setLocation(lx, ly);
                this.placeHandles();
            }
        }
    );

    defineMethod(superClass,
        function _receiveDropHandle(handle) {
            delete this._movedHandle;
        }
    );

    defineGetProperty(superClass,
        function resizeLeft() {
            return this._movedHandle && this._movedHandle===this._leftTopHandle ||
                this._movedHandle===this._leftHandle || this._movedHandle===this._leftBottomHandle;
        }
    );

    defineGetProperty(superClass,
        function resizeRight() {
            return this._movedHandle && this._movedHandle===this._rightTopHandle ||
                this._movedHandle===this._rightHandle || this._movedHandle===this._rightBottomHandle;
        }
    );

    defineGetProperty(superClass,
        function resizeTop() {
            return this._movedHandle && this._movedHandle===this._leftTopHandle ||
                this._movedHandle===this._topHandle || this._movedHandle===this._rightTopHandle;
        }
    );

    defineGetProperty(superClass,
        function resizeBottom() {
            return this._movedHandle && this._movedHandle===this._leftBottomHandle ||
                this._movedHandle===this._bottomHandle || this._movedHandle===this._rightBottomHandle;
        }
    );

}

export function makeResizeableContent(superClass) {

    defineGetProperty(superClass,
        function minWidth() {
            let bbox = l2pBoundingBox(this.children);
            return bbox ? bbox.width : 0;
        }
    );

    defineGetProperty(superClass,
        function minHeight() {
            let bbox = l2pBoundingBox(this.children);
            return bbox ? bbox.height : 0;
        }
    );

    defineMethod(superClass,
        function resize(width, height, direction) {
            let dx = 0;
            let dy = 0;
            if (direction === SigmaHandle.LEFT_TOP ||
                direction === SigmaHandle.LEFT ||
                direction === SigmaHandle.LEFT_BOTTOM) dx = width - this.width;
            else if (direction === SigmaHandle.RIGHT_TOP ||
                direction === SigmaHandle.RIGHT ||
                direction === SigmaHandle.RIGHT_BOTTOM) dx = this.width - width;
            if (direction === SigmaHandle.TOP ||
                direction === SigmaHandle.LEFT_TOP ||
                direction === SigmaHandle.RIGHT_TOP) dy = height - this.height;
            else if (direction === SigmaHandle.BOTTOM ||
                direction === SigmaHandle.LEFT_BOTTOM ||
                direction === SigmaHandle.RIGHT_BOTTOM) dy = this.height - height;
            let positions = new EMap();
            for (let element of this.children) {
                let lx = element.lx;
                let elemWidth = element.width;
                if (lx-elemWidth/2+dx/2<-width/2) dx=-width-lx*2+elemWidth;
                else if (lx+elemWidth/2+dx/2>width/2) dx=width-lx*2-elemWidth;
                let ly = element.ly;
                let elemHeight = element.height;
                if (ly-elemHeight/2+dy/2<-height/2) dy=-height-ly*2+elemHeight;
                else if (ly+elemHeight/2+dy/2>height/2) dy=height-ly*2-elemHeight;
                positions.set(element, {x:lx, y:ly});
            }
            for (let element of this.children) {
                let position = positions.get(element);
                element.move(position.x + dx/2, position.y + dy/2);
            }
        }
    );

}

export class SizerDecoration extends Decoration {

    constructor(rulesPhysic) {
        super();
        //assert(rulesPhysic._getStep);
        this._rulers = new Group();
        Canvas.instance.addObserver(this);
    }

    _init() {
        this.refresh();
    }

    _createRuler(handle) {

        function computeX(inc, step) {
            let width = this._element.width*Context.scale;
            let graduationValue = inc*step.scale+width;
            return {value:Math.round(graduationValue), label:Math.round(graduationValue)/step.unitFactor};
        }

        function computeY(inc, step) {
            let height = this._element.height*Context.scale;
            let graduationValue = inc*step.scale+height;
            return {value:Math.round(graduationValue), label:Math.round(graduationValue)/step.unitFactor};
        }

        function modulo(value, diviser) {
            if (value<0) value=-value;
            return value%diviser <0.001;
        }

        function drawVerticalGraduation(inc, step, direction) {
            let graduationSize = 10/zoom;
            let graduation = computeX.call(this, inc, step);
            let x = inc * step.step*direction;
            if (modulo(graduation.value, step.ref) || (step.case === 1 && modulo(graduation.value, step.ref))) {
                ruler.add(new Line(x, -graduationSize * 2, x, +graduationSize * 2));
                let text = new Text(x, 0, graduation.label).attrs({
                    fill: Colors.RED, text_anchor: TextAnchor.MIDDLE, font_size: 12 / zoom
                });
                if (step.case === 3 && ((graduation.value / step.ref) % 2) > 0.001) {
                    text.attrs({y: graduationSize * 2.1, alignment_baseline: AlignmentBaseline.BEFORE_EDGE});
                }
                else {
                    text.attrs({y: -graduationSize * 2.1, alignment_baseline: AlignmentBaseline.AFTER_EDGE});
                }
                ruler.add(text);
            }
            else {
                ruler.add(new Line(x, -graduationSize, x, +graduationSize));
            }
        }

        function drawHorizontalGraduation(inc, step, direction) {
            let graduationSize = 10/zoom;
            let graduation = computeY.call(this, inc, step);
            let y = inc * step.step*direction;
            if (modulo(graduation.value, step.ref)) {
                ruler.add(new Line(-graduationSize * 2, y, graduationSize * 2, y));
                let text = new Text(graduationSize * 2.1, y, graduation.label).attrs({
                    fill: Colors.RED, font_size: 12 / zoom,
                    text_anchor: TextAnchor.START, alignment_baseline: AlignmentBaseline.MIDDLE
                });
                ruler.add(text);
            }
            else {
                ruler.add(new Line(-graduationSize, y, graduationSize, y));
            }
        }

        function drawHorizontalAxis(zoom, step, ruler, direction) {
            let horizontalSize = step.step*10;
            ruler.add(new Line(-horizontalSize, 0, horizontalSize, 0));
            ruler.add(new Text(-horizontalSize*1.05, 0, computeX.call(this, 0, step).label).attrs({
                fill:Colors.RED, font_size: 16/zoom,
                text_anchor:TextAnchor.END, alignment_baseline :AlignmentBaseline.MIDDLE
            }));
            ruler.add(new Text(horizontalSize*1.05, 0, step.unitLabel).attrs({
                fill:Colors.RED, font_size: 12/zoom,
                text_anchor:TextAnchor.START, alignment_baseline :AlignmentBaseline.MIDDLE
            }));
            for (let inc = 1; inc*step.step<=horizontalSize; inc++) {
                drawVerticalGraduation.call(this, inc, step, direction);
                drawVerticalGraduation.call(this, -inc, step, direction);
            }
        }

        function drawVerticalAxis(zoom, step, ruler, direction) {
            let verticalSize = step.step*10;
            ruler.add(new Line(0, -verticalSize, 0, verticalSize));
            ruler.add(new Text(0, verticalSize*1.05, computeY.call(this, 0, step).label).attrs({
                fill:Colors.RED, font_size: 16/zoom,
                text_anchor:TextAnchor.MIDDLE, alignment_baseline :AlignmentBaseline.BEFORE_EDGE
            }));
            ruler.add(new Text(0, -verticalSize*1.05, step.unitLabel).attrs({
                fill:Colors.RED, font_size: 12/zoom,
                text_anchor:TextAnchor.MIDDLE, alignment_baseline :AlignmentBaseline.AFTER_EDGE
            }));
            for (let inc = 1; inc*step.step<=verticalSize; inc++) {
                drawHorizontalGraduation.call(this, inc, step, direction);
                drawHorizontalGraduation.call(this, -inc, step, direction);
            }
        }

        let zoom = Canvas.instance.zoom;
        let step = computeGridStep();
        let ruler = new Translation().attrs({fill:Colors.RED, stroke_width:1/zoom, stroke:Colors.RED, z_index:2000});
        if (this._element.resizeLeft) drawHorizontalAxis.call(this, zoom, step, ruler, -1);
        if (this._element.resizeRight) drawHorizontalAxis.call(this, zoom, step, ruler, 1);
        if (this._element.resizeTop) drawVerticalAxis.call(this, zoom, step, ruler, -1);
        if (this._element.resizeBottom) drawVerticalAxis.call(this, zoom, step, ruler, 1);
        ruler.set(handle.lx, handle.ly);
        return ruler;
    }

    _setElement(element) {
        super._setElement(element);
        element._addObserver(this);
    }

    refresh() {
        this._rulers.clear();
        if (this._element._movedHandle) {
            this._rulers.add(this._createRuler(this._element._movedHandle));
        }
    }

    _notified(source, event, value, elements) {
        if (source===this._element) {
            if (event===DragHandleOperation.events.START_DRAG_HANDLE) {
                this._shown = true;
                this._root.add(this._rulers);
                this.refresh();
            }
            else if (event===DragHandleOperation.events.DRAG_HANDLE) {
                this.refresh();
            }
            else if (event===DragHandleOperation.events.DROP_HANDLE) {
                this._shown = false;
                this._root.remove(this._rulers);
            }
        }
        else if (source===Canvas.instance && event===Events.ZOOM) {
            if (this._shown) {
                this.refresh();
            }
        }
    }

    clone(duplicata) {
        return new SizerDecoration();
    }

}


export class SigmaFrame extends SigmaElement {

    constructor(width, height) {
        super(width, height);
        this.initShape(width, height, SigmaFrame.COLOR);
        this._initResize();
        this._putHandles();
        this._observe(Canvas.instance);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({stroke_width:1/zoom});
        }
    }

    _setSize(width, height) {
        super._setSize(width, height);
        this.shape.attrs({x:-width/2, y:-height/2, width:width, height:height});
    }

    initShape(width, height, strokeColor) {
        let shape = new Rect(-width/2, -height/2, width, height)
            .attrs({stroke: strokeColor, fill:Fill.NONE, stroke_width: 1});
        return this._initShape(shape);
    }

    get box() {
        return new Box(this.lx-this.width/2, this.ly-this.height/2, this.width, this.height);
    }

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }
}
makeShaped(SigmaFrame);
makeResizeable(SigmaFrame);
makeLayered(SigmaFrame, {layer: "configuration"});

export class SigmaTarget extends SigmaElement {

    constructor(size, strokeColor) {
        super(size, size);
        this.initShape(size, strokeColor);
        this._dragOperation(function() {return DragMoveSelectionOperation.instance;});
        this._observe(Canvas.instance);
        this.addMenuOption(new TextMenuOption("Edit Target",
            function () {
                this.edit();
            }));
    }

    edit() {
        Canvas.instance.openModal(
            editTarget,
            {
                x: this.lx,
                y: this.ly,
                strokeColor: this.strokeColor
            },
            data => {
                Memento.instance.open();
                this.update(data);
            });
    }

    update(data) {
        Memento.register(this);
        this.move(data.x, data.y);
        this._initStroke(data);
    }

    _notified(source, event, data) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.shape.attrs({stroke_width:this._strokeWidth/zoom});
        }
    }

    initShape(size, strokeColor) {
        let shape = new Group()
            .add(new Line(-size/2, 0, size/2, 0))
            .add(new Line(0, -size/2, 0, size/2))
            .add(new Circle(0, 0, size/4).attrs({fill_opacity:0.001}));
        this._initShape(shape);
        this._initStroke({strokeColor:strokeColor});
        return this._shape;
    }

    _cloned(copy, duplicata) {
        super._cloned();
        copy._observe(Canvas.instance);
    }

}

makeShaped(SigmaTarget);
makeSelectable(SigmaTarget);
makeMovable(SigmaTarget);
makeDraggable(SigmaTarget);
makeMenuOwner(SigmaTarget);
makeLayered(SigmaTarget, {layer:"configuration"});
makeStrokeUpdatable(SigmaTarget);

SigmaFrame.COLOR = Colors.RED;

export function makeConfigurableMap(superClass, predicate, positionsFct) {

    let ContentLayer = makePositioningContainer(class ContentLayer extends SigmaZindexLayer {}, {
        predicate,
        positionsBuilder: function (element) {
            return positionsFct.call(this.host, element);
        }
    });

    makeLayersWithContainers(superClass, {
        layersBuilder:()=>{
            return {
                configuration:new SigmaLayer(),
                content:new ContentLayer(),
                top:new SigmaLayer()
            };
        }
    });
    makeContainerASupport(superClass);
    makeContainerASandBox(superClass);

    let build = superClass.prototype._build;
    superClass.prototype._build = function () {
        build && build.call(this);
        this._contextMenu();
        this.configFrame = new SigmaFrame(100, 50);
        this.add(this.configFrame);
    };

    superClass.prototype._contextMenu = function() {
        this.addMenuOption(new TextToggleMenuOption("Hide Configuration", "Show Configuration",
            function () {
                this.hideConfiguration();
            },
            function () {
                this.showConfiguration();
            },
            function() { return !this.configurationShown; }));
        this.addMenuOption(new TextMenuOption("Generate Hex Targets",
            function () {
                this.callForHexTargetsGeneration();
            }));
        this.addMenuOption(new TextMenuOption("Generate Square Targets",
            function () {
                this.callForSquareTargetsGeneration();
            }));
    };

    superClass.prototype.callForHexTargetsGeneration = function () {
        Canvas.instance.openModal(
            generateHexTargets,
            {
                colCount: 10,
                rowCount: 10,
                type: 1
            },
            data => {
                Memento.instance.open();
                this.generateHexTargets(this.configFrame.box, data);
            });
    };

    superClass.prototype.callForSquareTargetsGeneration = function () {
        Canvas.instance.openModal(
            generateSquareTargets,
            {
                colCount: 10,
                rowCount: 10
            },
            data => {
                Memento.instance.open();
                this.generateSquareTargets(this.configFrame.box, data);
            });
    };

    superClass.prototype.generateHexTargets = function(bounds, data) {
        data.strokeColor=data.strokeColor||Colors.RED;
        if (data.type===1 || data.type===2) {
            let colSliceWidth = bounds.width/(data.colCount*3+1);
            let rowHeight = bounds.height/data.rowCount;
            let margin = data.type===1 ? 0 : rowHeight/2;
            for (let x = colSliceWidth * 2; x < bounds.width; x += colSliceWidth*3) {
                for (let y = margin + rowHeight / 2; y < bounds.height; y += rowHeight) {
                    this.add(new SigmaTarget(16, data.strokeColor).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : rowHeight/2;
            }
        }
        else if (data.type===3 || data.type===4) {
            let rowSliceHeight = bounds.height/(data.rowCount*3+1);
            let colWidth = bounds.width/data.colCount;
            let margin = data.type===3 ? 0 : colWidth/2;
            for (let y = rowSliceHeight * 2; y < bounds.height; y += rowSliceHeight*3) {
                for (let x = margin + colWidth / 2; x < bounds.width; x += colWidth) {
                    this.add(new SigmaTarget(16, data.strokeColor).move(x + bounds.x, y + bounds.y));
                }
                margin = margin ? 0 : colWidth/2;
            }
        }
    };

    superClass.prototype.generateSquareTargets = function(bounds, data) {
        data.strokeColor=data.strokeColor||Colors.RED;
        let colWidth = bounds.width/data.colCount;
        let rowHeight = bounds.height/data.rowCount;
        for (let x = colWidth/2; x<bounds.width; x+=colWidth) {
            for (let y = rowHeight/2; y<bounds.height; y+=rowHeight) {
                this.add(new SigmaTarget(16, data.strokeColor).move(x+bounds.x, y+bounds.y));
            }
        }
    };

    superClass.prototype.showConfiguration = function() {
        this.showLayer("configuration");
    };

    superClass.prototype.hideConfiguration = function() {
        this.hideLayer("configuration");
    };

    if (!superClass.prototype.hasOwnProperty("configurationShown")) {
        Object.defineProperty(superClass.prototype, "configurationShown", {
            configurable:true,
            get() {
                return this.hidden("configuration");
            }
        });
    }

    let getLayer = superClass.prototype._getLayer;
    superClass.prototype._getLayer = function(element) {
        if (element.isSandBox) {
            return "top";
        }
        else return getLayer.call(this, element);
    }
}

export class DragPrintAreaOperation extends DragAreaOperation {

    constructor() {
        super();
    }

    setBackgroundParameters(area, zoom) {
        area.attrs({
            fill: Colors.GREEN,
            stroke: Stroke.NONE,
            fill_opacity: 0.1,
            stroke_width : 1/zoom
        });
    }

    setFrameParameters(area, zoom) {
        area.attrs({
            fill: Fill.NONE,
            stroke: Colors.GREEN,
            stroke_opacity: 0.5,
            stroke_width : 1/zoom
        });
    }

    _doSelection(event, area) {
        let width = area.width;
        let height = area.height;
        let x = area.x + area.width/2;
        let y = area.y + area.height/2;
        if (width > SigmaPrintArea.MIN_SIZE &&
            height > SigmaPrintArea.MIN_SIZE) {
            Canvas.instance._fire(SigmaPrintArea.events.NEW_AREA, {x, y, width, height});
        }
    }

}
makeSingleton(DragPrintAreaOperation);

export class SigmaPrintArea extends SigmaElement {

    constructor(width, height) {
        super(width, height);
        this._initFrame(width, height, Colors.GREEN, Colors.GREEN, {
            fill_opacity: 0.1,
            stroke_opacity: 0.5,
        });
        this._initResize(Colors.GREEN);
        this._dragOperation(()=>DragMoveSelectionOperation.instance);
        this._createContextMenu();
    }

    select() {
        this.putHandles();
    }

    unselect() {
        this.removeHandles();
    }

    get selectionMark() {
        return null;
    }

    _createContextMenu() {}

}
makeContainer(SigmaPrintArea);
makeFramed(SigmaPrintArea);
makeMenuOwner(SigmaPrintArea);
makeResizeable(SigmaPrintArea);
makeSelectable(SigmaPrintArea);
makeDraggable(SigmaPrintArea);
makeMovable(SigmaPrintArea);
makeDeletable(SigmaPrintArea);
SigmaPrintArea.MIN_SIZE = 10;
SigmaPrintArea.events = {
    NEW_AREA : "new-area"
};

export function ifPrintRequested() {
    return ifStandardDragMode(StandardDragMode.PRINT);
}

Canvas.prototype.enablePrint = function() {
    StandardDragMode.PRINT = "print";
    standardDrag.addFirst(ifPrintRequested, DragPrintAreaOperation.instance);
    areaDrag.addFirst(ifPrintRequested, DragPrintAreaOperation.instance);
};

export function pdfModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/pdf_on.svg", "./images/icons/pdf_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.PRINT;
            Canvas.instance._fire(StandardDragMode.events.SWITCH_MODE, StandardDragMode.PRINT);
        }, () => StandardDragMode.mode === StandardDragMode.PRINT)
    );
}

export class SigmaTrigger extends SigmaElement {

    constructor(width, height, shaper, action) {
        super(width, height);
        let shape = shaper.call(this);
        this._initShape(shape);
        this._animageShape(shape);
        this._setElevation(SigmaExpansion.ELEVATION);
        this._clickHandler(action);
    }

    _animageShape(shape) {
        shape.onDrag(
            ()=>{console.log("start");shape.matrix = Matrix.scale(0.8, 0.8, 0, 0)},
            ()=>{},
            ()=>{console.log("stop");shape.matrix = Matrix.scale(1, 1, 0, 0)}
        );
    }

    _cloned(copy, duplicata) {
        super._cloned(copy, duplicata);
        this._animageShape(copy.shape);
    }

}
SigmaTrigger.STD_WIDTH = 12;
SigmaTrigger.STD_HEIGHT = 12;
makeShaped(SigmaTrigger);
makePart(SigmaTrigger);
makeClickable(SigmaTrigger);
makeElevable(SigmaTrigger);

export class SigmaExpansion extends SigmaElement {

    constructor(width, height, spikeHeight) {
        function closerShape() {
            let closer = new Group().attrs({stroke:Colors.BLACK, stroke_width:2, stroke_linecap:Stroke.lineCap.ROUND});
            closer.add(new Rect(-this.width/2, -this.height/2, this.width, this.height).attrs({opacity:0.001}));
            closer.add(new Line(-this.width/2, -this.height/2, this.width/2, this.height/2));
            closer.add(new Line(-this.width/2, this.height/2, this.width/2, -this.height/2));
            return closer;
        }

        super(width, height);
        this._spikeHeight = spikeHeight;
        this._initShape(this._buildExpansionShape());
        this._setElevation(SigmaExpansion.ELEVATION);
        this._closer = new SigmaTrigger(SigmaTrigger.STD_WIDTH/2, SigmaTrigger.STD_HEIGHT/2, closerShape,
            function() {
                return ()=>this.parent.hide();
            });
        this._closer.matrix = Matrix.translate(this.width/2-SigmaTrigger.STD_WIDTH/2, -this.height/2+SigmaTrigger.STD_WIDTH/2);
        this._addPart(this._closer);
    }

    _buildExpansionShape() {
        return new Bubble(-this.width/2, -this.height/2, this.width, this.height, 0, this.height/2+this._spikeHeight, 20, 5)
            .attrs({fill:Colors.WHITE, stroke:Colors.BLACK, filter:Canvas.instance.shadowFilter});
    }

    get spikeHeight() {
        return this._spikeHeight;
    }

    show() {
        super.show();
        if (this.parent._expansionShown) {
            this.parent._expansionShown(this);
        }
        return this;
    }

    hide() {
        super.hide();
        if (this.parent._expansionHidden) {
            this.parent._expansionHidden(this);
        }
        return this;
    }

}
SigmaExpansion.ELEVATION = 2;
SigmaExpansion.MARGIN_FACTOR = 1.4;
SigmaExpansion.SPIKE_HEIGHT = 20;
makeShaped(SigmaExpansion);
makePart(SigmaExpansion);
makePartsOwner(SigmaExpansion);
makeElevable(SigmaExpansion);

export function makeExpansionOwner(superClass) {

    makePartsOwner(superClass);

    extendMethod(superClass, $improve=>
        function _improve(...args) {
            function triggerShape() {
                let arrow = new PlainArrow(this.width/2, this.height, this.width, this.height/2, 0.25)
                    .attrs({fill:Colors.PINK, stroke:Colors.CRIMSON, stroke_width:0.25, filter:Canvas.instance.highlightFilter});
                return new Group().add(
                    new Rotation(180, 0, this.height/2).add(
                        new Translation(0, this.height/2).add(arrow)
                    )
                ).attrs({filter:Canvas.instance.highlightFilter});
            }

            $improve.call(this, ...args);
            let expansionWidth = this.width*SigmaExpansion.MARGIN_FACTOR;
            let expansionHeight = this.height*SigmaExpansion.MARGIN_FACTOR;
            this._expander = new SigmaTrigger(SigmaTrigger.STD_WIDTH, SigmaTrigger.STD_HEIGHT, triggerShape,
                function() {
                    return ()=>{
                        this.parent._expansion.show();
                    }
                });
            this._expander.matrix = Matrix.translate(0, -this.height/2+this._expander.height/6);
            this._addPart(this._expander);
            this._expander.hide();
            this._expansion = new SigmaExpansion(expansionWidth, expansionHeight, SigmaExpansion.SPIKE_HEIGHT);
            this._expansion.matrix = Matrix.translate(0, -this.height/2-expansionHeight/2-this._expansion.spikeHeight*0.9);
            this._addPart(this._expansion);
            this._expansion.hide();
        }
    );

    defineMethod(superClass,
        function _expansionShown(expansion) {
            this._expander.hide();
        }
    );

    defineMethod(superClass,
        function _expansionHidden(expansion) {
            if (Selection.instance.selected(this)) {
                this._expander.show();
            }
        }
    );

    extendMethod(superClass, $select=>
        function select() {
            $select && $select.call(this);
            if (!this._expansion.visible) {
                this._expander.show();
            }
        }
    );

    extendMethod(superClass, $unselect=>
        function unselect() {
            $unselect && $unselect.call(this);
            this._expander.hide();
        }
    );

    extendMethod(superClass, $cloned=>
        function _cloned(copy, duplicata) {
            $cloned && $cloned.call(this, copy, duplicata);
            copy._expander.hide();
            copy._expansion.hide();
        }
    );

}