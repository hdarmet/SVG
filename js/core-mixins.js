import {
    ClippedRasterImage, Fill, Group, MouseEvents, RasterImage, Rect, Rotation, SvgRasterImage, Visibility
} from "./graphics.js";
import {
    Cloning, Events, Memento, Selection
} from "./toolkit.js";
import {
    ESet, List
} from "./collections.js";
import {
    createUUID, assert, defineMethod, proposeGetProperty, extendMethod, defineProperty, defineGetProperty,
    replaceGetProperty, replaceProperty
} from "./misc.js";

export function makeDeletable(superClass) {

    defineMethod(superClass,
        function delete_() {
            this.detach();
            this.finalize();
            this._fire(Events.DELETED, this);
        }
    );

    proposeGetProperty(superClass,
        function deletable() {
            return !this.lock;
        }
    );
}

export function makeMovable(superClass) {

    defineMethod(superClass,
        function move(x, y) {
            let result = this.setLocation(x, y);
            this._fire(Events.MOVED, {x, y});
            if (this.parent && this.parent._shift) {
                this.parent._shift(this, x, y);
                if (this.parent._fire) {
                    this.parent._fire(Events.MOVE, this);
                }
            }
            return result;
        }
    );

    defineMethod(superClass,
        function gmove(x, y) {
            let invertDiff = this.diff.invert();
            let lx = invertDiff.x(x, y);
            let ly = invertDiff.y(x, y);
            return this.move(lx, ly);
        }
    );

    proposeGetProperty(superClass,
        function movable() {
            return !this.lock;
        }
    );

}

export function makeRotatable(superClass) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._initRotatable();
        }
    );

    defineMethod(superClass,
        function _initRotatable(angle = 0) {
            this._hinge = new Rotation(angle, 0, 0);
            let parent = this._tray.parent;
            this._hinge.add(this._tray);
            parent.add(this._hinge);
            return this._hinge;
        }
    );

    defineGetProperty(superClass,
        function angle() {
            return this._hinge.angle;
        }
    );

    defineGetProperty(superClass,
        function globalAngle() {
            return this._hinge.globalMatrix.angle;
        }
    );

    defineGetProperty(superClass,
        function local() {
            return this._hinge.matrix.multLeft(this._root.matrix);
        }
    );

    defineGetProperty(superClass,
        function global() {
            return this._hinge.globalMatrix;
        }
    );

    proposeGetProperty(superClass,
        function rotatable() {
            return !this.lock;
        }
    );

    defineMethod(superClass,
        function _setAngle(angle) {
            this._hinge.angle = angle;
        }
    );

    defineMethod(superClass,
        function setAngle(angle) {
            Memento.register(this);
            this._setAngle(angle);
            return this;
        }
    );

    defineMethod(superClass,
        function rotate(angle) {
            this.setAngle(angle);
            this._fire(Events.ROTATED, angle);
            return this;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento.angle = this._hinge.angle;
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._hinge.angle = memento.angle;
            return this;
        }
    );

}

export function makeSelectable(superClass) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            if (!this._clickHdlImpl) {
                this._clickHdlImpl = function (event) {
                    Selection.instance.adjustSelection(this, event, true);
                    event.stopPropagation();
                }.bind(this);
                this._root.on(MouseEvents.CLICK, this._clickHdlImpl);
            }
        }
    );

    defineProperty(superClass,
        function selectFrame() {
            return this._selectFrame === undefined ? this._root : this._selectFrame;
        },
        function selectFrame(frame) {
            this._selectFrame = frame;
        },
    );

    replaceGetProperty(superClass,
        function selectable() {
            return this;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento._selectFrame = this._selectFrame;
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._selectFrame = memento._selectFrame;
            return this;
        }
    );

    extendMethod(superClass, $cloned=>
        function _cloned(copy, duplicata) {
            $cloned && $cloned.call(this, copy, duplicata);
            if (!copy._clickHdl) {
                copy._clickHdlImpl = function (event) {
                    Selection.instance.adjustSelection(this, event, true);
                    event.stopPropagation();
                }.bind(copy);
                copy._root.on(MouseEvents.CLICK, copy._clickHdlImpl);
            }
            copy.selectFrame.filter = null;
        }
    );

}

export function makeShaped(superClass) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._shape = this._buildShapeStructure();
            this._addShapeToTray();
        }
    );

    if (!superClass.prototype._buildShapeStructure) {

        defineMethod(superClass,
            function _buildShapeStructure() {
                return new Group();
            }
        );

        replaceGetProperty(superClass,
            function _shapeContent() {
                return this._shape;
            }
        );

    }

    defineMethod(superClass,
        function _addShapeToTray() {
            let next = this._partsSupport || this._decorationsSupport || this._content || this._floatingContent;
            next ? this._tray.insert(next, this._shape) : this._tray.add(this._shape);
        }
    );

    defineMethod(superClass,
        function _initShape(svgElement) {
            this._shapeContent.add(svgElement);
            return this;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento._shape = this._shape.memento();
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._shape.revert(memento._shape);
            return this;
        }
    );

    replaceProperty(superClass,
        function shape() {
            return this._shapeContent.child;
        },
        function shape(shape) {
            Memento.register(this);
            this._shapeContent.child = shape;
        }
    );

    proposeGetProperty(superClass,
        function hasShape() {
            return true;
        }
    );
}

export class Decoration {

    constructor() {
        this._id = createUUID();
        this._root = new Group();
    }

    get element() {
        return this._element;
    }

    _setElement(element) {
        this._element = element;
        if (element) {
            this._init();
        }
        else {
            this._root.clear();
            this._finalize && this._finalize();
        }
    }

}

export function makeDecorationsOwner(superClass) {

    assert(!superClass.prototype._initDecorations);

    let init = superClass.prototype._init;
    superClass.prototype._init = function (...args) {
        init.call(this, ...args);
        this._initDecorations();
        this._addDecorationsToTray()
    };

    superClass.prototype._addDecorationsToTray = function () {
        let next = this._content || this._floatingContent;
        next ? this._tray.insert(next, this._decorationsSupport) : this._tray.add(this._decorationsSupport);
    };

    superClass.prototype._initDecorations = function () {
        this._decorationsSupport = new Group();
        this._decorationsSupport.cloning = Cloning.NONE;
        return this._decorationsSupport;
    };

    superClass.prototype._addDecoration = function (decoration) {
        if (!this._decorations) {
            this._decorations = new List();
            this._decorations.cloning = Cloning.NONE;
        }
        this._decorationsSupport.add(decoration._root);
        this._decorations.add(decoration);
        decoration._setElement(this);
    };

    superClass.prototype.addDecoration = function (decoration) {
        assert(!decoration.element);
        Memento.register(this);
        Memento.register(decoration);
        this._addDecoration(decoration);
        this._fire(Events.ADD_DECORATION, decoration);
        return this;
    };

    superClass.prototype._removeDecoration = function (decoration) {
        if (this._decorations) {
            // IMPORTANT : DOM update before this._children update !
            this._decorationsSupport.remove(decoration._root);
            this._decorations.remove(decoration);
            decoration._setElement(null);
            if (this._decorations.size === 0) {
                delete this._decorations;
            }
        }
    };

    superClass.prototype.removeDecoration = function (decoration) {
        assert(decoration.element === this);
        Memento.register(this);
        Memento.register(decoration);
        this._removeDecoration(decoration);
        this._fire(Events.REMOVE_DECORATION, decoration);
        return this;
    };

    superClass.prototype._clearDecorations = function () {
        if (this._decorations) {
            this._decorationsSupport.clear();
            for (let decoration of this._decorations) {
                decoration._setElement(null);
            }
            delete this._decorations;
        }
    };

    superClass.prototype.clearDecorations = function () {
        if (this._decorations) {
            Memento.register(this);
            let decorations = this._decorations;
            for (let decoration of decorations) {
                Memento.register(decoration);
            }
            this._clearDecorations();
            for (let decoration of decorations) {
                this._fire(Events.REMOVE_DECORATION, decoration);
            }
        }
        return this;
    };

    superClass.prototype.containsDecoration = function (decoration) {
        return this._decorations && this._decorations.contains(decoration);
    };

    Object.defineProperty(superClass.prototype, "decorations", {
        configurable: true,
        get: function () {
            return this._decorations ? new List(...this._decorations) : new List();
        }
    });

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._decorations) {
            memento._decorations = new List(...this._decorations);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        this._decorationsSupport.clear();
        if (memento._decorations) {
            this._decorations = new List(...memento._decorations);
            this._decorations.cloning = Cloning.NONE;
            for (let decoration of this._decorations) {
                this._decorationsSupport.add(decoration._root);
            }
        }
        else {
            delete this._decorations;
        }
        return this;
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned.call(this, copy, duplicata);
        for (let decoration of this.decorations) {
            let decorationCopy = duplicata.get(decoration);
            if (!decorationCopy) {
                decorationCopy = decoration.clone(duplicata);
            }
            copy._addDecoration(decorationCopy);
        }
        return copy;
    };

    superClass.prototype.showDecorations = function () {
        this._decorationsSupport.visibility = null;
        return this;
    };

    superClass.prototype.hideDecorations = function () {
        this._decorationsSupport.visibility = Visibility.HIDDEN;
        return this;
    };

    Object.defineProperty(superClass.prototype, "hasDecorations", {
        configurable: true,
        get() {
            return true;
        }
    });

    return superClass;
}

/**
 * Allows an element to be draggable : this means that a drag and drop operation may be assigned to this element.
 * Not more : this does NOT mean that the element may be moved ! All depends on the drop operation itself.
 * <p> Only one DnD handler may be set on an element. If one try to set again the DnD handler, the
 * last one replaces the former. If no handler is set, no DnD operation is invoked in case of mouse down/move/up events.
 * <p> IMPORTANT : The handler is a function that produces the event handler, not the event handler itself. So, you can
 * use arrow methods to define it :) !
 * <pre><code>
 *     elem.dragOperation = function() {
 *          return function() { return MyDragOperation.instance; }
 *     };
 * </code></pre>
 * <p> Setting an handler is undoable. To avoid the actions of undo/redo facility, one must use the "internal" method:
 * _dragOperation. This is METHOD, not property !!
 * <pre><code>
 *     elem._dragOperation(function() {
 *          return function() { return MyDragOperation.instance; }
 *     });
 * </code></pre>
 * To remove an already set handler, give <code>null</code> or <code>undefined</code> as new handler builder (not a
 * function that returns null).
 * @param superClass element class to enhance.
 * @returns {*}
 */
export function makeDraggable(superClass) {

    Object.defineProperty(superClass.prototype, "dragOperation", {
        configurable: true,
        get: function () {
            return this._dragOp;
        },
        set: function (operation) {
            Memento.register(this);
            this._dragOperation(operation);
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._dragOp = this._dragOp;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._dragOperation(memento._dragOp);
        }
    }

    superClass.prototype._dragOperation = function (operation) {
        this._dragOp = operation;
        if (operation) {
            let accepted = false;
            this.__dragOp = operation.call(this);
            let dragStart = event => {
                accepted = this.__dragOp._accept(this, event.pageX, event.pageY, event);
                if (accepted) {
                    this.__dragOp._onDragStart(this, event.pageX, event.pageY, event);
                }
            };
            let dragMove = event => {
                if (accepted) {
                    this.__dragOp._onDragMove(this, event.pageX, event.pageY, event);
                }
            };
            let dragDrop = event => {
                if (accepted) {
                    this.__dragOp._onDrop(this, event.pageX, event.pageY, event);
                }
            };
            this._root.onDrag(dragStart, dragMove, dragDrop);
        }
        else {
            delete this.__dragOp;
            this._root.offDrag();
        }
    };

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (this._dragOp) {
            copy._dragOperation(this._dragOp);
        }
    };

    if (!superClass.prototype.hasOwnProperty("draggable")) {
        Object.defineProperty(superClass.prototype, "draggable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    return superClass;
}

/**
 * Allows an element to be clickable or double-clickable.
 * <p> Only one handler for each event may be set on an element. If one try to set again one of these two handlers, the
 * last one replaces the former. If no handler is set (for each of these two events), the relevant event has no effect.
 * <p> IMPORTANT : The handler is a function that produces the event handler, not the event handler itself. So, you can
 * use arrow methods to define both :) !
 * <pre><code>
 *     elem.clickHandler = function() {
 *          return function(event) { \/* Do event stuff here. *\/ }
 *     };
 *     elem.doubleClickHandler = function() {
 *          return function(event) { \/* Do event stuff here. *\/ }
 *     };
 * </code></pre>
 * <p> Setting an handler is undoable. To avoid the actions of undo/redo facility, one must use the "internal" methods:
 * _clickHandler and _doubleClickHandler. These are METHODS, not properties !!
 * <pre><code>
 *     elem._clickHandler(function() {
 *          return function(event) { \/* Do event stuff here. *\/ }
 *     });
 *     elem._doubleClickHandler(function() {
 *          return function(event) { \/* Do event stuff here. *\/ }
 *     });
 * </code></pre>
 * To remove an already set handler, give <code>null</code> or <code>undefined</code> as new handler builder (not a
 * function that returns null).
 * @param superClass element class to enhance.
 * @returns {*}
 */
export function makeClickable(superClass) {

    Object.defineProperty(superClass.prototype, "clickHandler", {
        configurable: true,
        get: function () {
            return this._clickHdl;
        },
        set: function (handler) {
            Memento.register(this);
            this._clickHandler(handler);
        }
    });

    Object.defineProperty(superClass.prototype, "doubleClickHandler", {
        configurable: true,
        get: function () {
            return this._doubleClickHdl;
        },
        set: function (handler) {
            Memento.register(this);
            this._doubleClickHandler(handler);
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._clickHdl = this._clickHdl;
            memento._doubleClickHdl = this._doubleClickHdl;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._clickHandler(memento._clickHdl);
            this._doubleClickHandler(memento._doubleClickHdl);
        }
    }

    superClass.prototype._clickHandler = function (handler) {
        this._clickHdl = handler;
        if (this._clickHdlImpl) {
            this._root.off(MouseEvents.CLICK, this._clickHdlImpl);
        }
        this._clickHdlImpl = event => {
            Selection.instance.adjustSelection(this, event, true);
            handler && handler.call(this)(event);
            event.stopPropagation();
        };
        this._root.on(MouseEvents.CLICK, this._clickHdlImpl);
    };

    superClass.prototype._doubleClickHandler = function (handler) {
        this._doubleClickHdl = handler;
        if (this._doubleClickHdlImpl) {
            this._root.off(Events.DOUBLE_CLICK, this._doubleClickHdlImpl);
        }
        this._doubleClickHdlImpl = event => {
            Selection.instance.adjustSelection(this, event, true);
            handler && handler.call(this)(event);
            event.stopPropagation();
        };
        this._root.on(MouseEvents.DOUBLE_CLICK, this._doubleClickHdlImpl);
    };

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (this._clickHdl) {
            copy._clickHandler(this._clickHdl);
        }
        if (this._doubleClickHdl) {
            copy._doubleClickHandler(this._doubleClickHdl);
        }
    };

    if (!superClass.prototype.hasOwnProperty("clickable")) {
        Object.defineProperty(superClass.prototype, "clickable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    return superClass;
}

/**
 * Gives a SVG rect as a shape to an element. Note that this mixing invoke the (mandatory and more abstract) makeShaped
 * mixin.
 * <p> This mixing gives the opportunity to define (as constructor parameters):
 * <ul>
 *     <li> the width and height of the shape,
 *     <li> the stroke and fill colors.
 * </ul>
 * <p> To change fill/stroke colors (and other properties), please use makeFillUpdatable/makeStrokeUpdatable mixins in
 * conjunction with this one.
 * @param superClass element class to enhance.
 */
export function makeFramed(superClass) {

    makeShaped(superClass);

    superClass.prototype._initFrame = function (width, height, strokeColor, backgroundColor, attrs) {
        let background = new Rect(-width / 2, -height / 2, width, height);
        background.stroke = strokeColor;
        background.fill = backgroundColor;
        attrs && background.attrs(attrs);
        return this._initShape(background);
    };

    let setSize = superClass.prototype._setSize;
    superClass.prototype._setSize = function(width, height) {
        setSize.call(this, width, height);
        this.shape.x = -width/2;
        this.shape.y = -height/2;
        this.shape.width = width;
        this.shape.height = height;
    };

    if (!superClass.prototype.hasOwnProperty("framed")) {
        Object.defineProperty(superClass.prototype, "framed", {
            configurable: true,
            get() {
                return true;
            }
        });
    }
}

export function makeImaged(superClass) {

    makeShaped(superClass);

    superClass.prototype._initBackground = function (width, height, strokeColor, image) {
        let background = new Group();
        background.add(image);
        if (strokeColor) {
            background.add(new Rect(-width / 2, -height / 2, width, height).attrs({
                fill: Fill.NONE,
                stroke: strokeColor
            }));
        }
        return this._initShape(background);
    };

    Object.defineProperty(superClass.prototype, "background", {
        configurable: true,
        get: function () {
            return this._shapeContent.child._children[0];
        }
    });

    Object.defineProperty(superClass.prototype, "frame", {
        configurable: true,
        get: function () {
            return this._shapeContent.child._children[1];
        }
    });

    Object.defineProperty(superClass.prototype, "url", {
        configurable: true,
        get: function () {
            return this.background.href;
        }
    });

    Object.defineProperty(superClass.prototype, "width", {
        configurable: true,
        get: function () {
            //return this.background.width;
            return this._width;
        },
        set: function (width) {
            Memento.register(this);
            this._width = width;
            this.background.attrs({width: width, x: -width / 2});
            this.frame.attrs({width: width, x: -width / 2});
        }
    });

    Object.defineProperty(superClass.prototype, "height", {
        configurable: true,
        get: function () {
            //return this.background.height;
            return this._height;
        },
        set: function (height) {
            Memento.register(this);
            this._height = height;
            this.background.attrs({height: height, y: -height / 2});
            this.frame.attrs({height: height, y: -height / 2});
        }
    });

    superClass.prototype._loadImage = function (width, height, url) {
        if (url.rasterized) {
            return new SvgRasterImage(url.svg, -width / 2, -height / 2, width, height);
        }
        else {
            assert(typeof(url) === 'string');
            return new RasterImage(url, -width / 2, -height / 2, width, height);
        }
    };

    if (!superClass.prototype.hasOwnProperty("imaged")) {
        Object.defineProperty(superClass.prototype, "imaged", {
            configurable: true,
            get() {
                return true;
            }
        });
    }
}

/**
 * Gives an image (and only one) as a shape to an element. Note that this mixing invoke the (mandatory and more
 * abstract) makeImaged mixin.
 * <p> This mixing gives the opportunity to define (as constructor parameters):
 * <ul>
 *     <li> the width and height of the shape,
 *     <li> the stroke color,
 *     <li> the image url
 * </ul>
 * <p> Note that image URL cannot be changed (maybe... in future versions...). Width and height can be.
 * <p> To change stroke color (and other properties), please use makeStrokeUpdatable mixins in conjunction with this one.
 * @param superClass element class to enhance.
 */
export function makeSingleImaged(superClass) {

    makeImaged(superClass);

    superClass.prototype._initImage = function (width, height, strokeColor, backgroundURL) {
        return this._initBackground(width, height, strokeColor, this._loadImage(width, height, backgroundURL));
    };

    return superClass;
}

export function makeMultiImaged(superClass) {

    makeImaged(superClass);

    superClass.prototype._initImages = function (width, height, strokeColor, ...backgroundURLs) {
        return this._initBackground(width, height, strokeColor,
            this._loadImages(width, height, backgroundURLs));
    };

    superClass.prototype._loadImages = function (width, height, backgroundURLs) {
        this._images = new List();
        for (let backgroundURL of backgroundURLs) {
            this._images.add(this._loadImage(width, height, backgroundURL));
        }
        return this._images[0];
    };

    superClass.prototype._setImageIndex = function (index) {
        let idx = index % this._images.length;
        if (this.background !== this._images[idx]) {
            this.shape.replace(this.background, this._images[idx]);
        }
        return this;
    };

    Object.defineProperty(superClass.prototype, "imageIndex", {
        configurable: true,
        get: function () {
            return this._images.indexOf(this.background);
        },
        set: function (index) {
            Memento.register(this);
            this._setImageIndex(index);
        }
    });

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        memento._images = new List(...this._images);
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        this._images = new List(...memento._images);
        return this;
    };

    if (!superClass.prototype.hasOwnProperty("singleImaged")) {
        Object.defineProperty(superClass.prototype, "singleImaged", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    return superClass;
}

export function makeClipImaged(superClass) {

    makeMultiImaged(superClass);

    superClass.prototype._initImages = function (width, height, strokeColor, imageURL, ...clipped) {
        return this._initBackground(width, height, strokeColor,
            this._loadImages(width, height, imageURL, ...clipped));
    };

    superClass.prototype._loadImages = function (width, height, imageURL, ...clipped) {
        this._images = new List();
        for (let clip of clipped) {
            this._images.add(new ClippedRasterImage(imageURL, clip.x, clip.y, clip.width, clip.height, -width / 2, -height / 2, width, height));
        }
        return this._images[0];
    };

    if (!superClass.prototype.hasOwnProperty("clipImaged")) {
        Object.defineProperty(superClass.prototype, "clipImaged", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    return superClass;
}

export function makeGentleDropTarget(superClass) {

    superClass.prototype._dropTarget = function (element) {
        if (this.support && this.support._dropTarget && (!this._acceptDrop || !this._acceptDrop(element))) {
            return this.support._dropTarget(element);
        }
        return this;
    };

    return superClass;
}
