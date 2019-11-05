'use strict';

import {
    createUUID, same, isNumber
} from "./misc.js";
import {
    List, ESet
} from "./collections.js";
import {
    Matrix, Box, getBox
} from "./geometry.js";
import {
    SVGElement, Translation, Rotation, Group, Rect, MouseEvents, l2l, RasterImage, Fill,
    ClippedRasterImage, Mutation, Colors, computeMatrix, TextAnchor, AlignmentBaseline, Text,
    collectProperties, Attrs, SvgRasterImage
} from "./graphics.js";
import {
    Memento, makeObservable, CopyPaste, Events, Context, getCanvasLayer, makeNotCloneable, makeCloneable,
    CloneableObject, Cloning
} from "./toolkit.js";

export function makeDeletable(superClass) {

    superClass.prototype.delete = function() {
        this.detach();
        this.finalize();
        this._fire(Events.DELETED, this);
    };

    if (!superClass.prototype.hasOwnProperty("deletable")) {
        Object.defineProperty(superClass.prototype, "deletable", {
            configurable:true,
            get() {
                return true;
            }
        });
    }
}

export function makeMoveable(superClass) {

    superClass.prototype.move = function(x, y) {
        let result = this.setLocation(x, y);
        this._fire(Events.MOVED, {x, y});
        if (this.parent && this.parent._shift) {
            this.parent._shift(this, x, y);
            if (this.parent._fire) {
                this.parent._fire(Events.MOVE, this);
            }
        }
        return result;
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

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        superInit.call(this, ...args);
        this._initRotatable();
    };

    superClass.prototype._initRotatable = function(angle = 0) {
        this._hinge = new Rotation(angle, 0, 0);
        let parent = this._tray.parent;
        this._hinge.add(this._tray);
        parent.add(this._hinge);
        return this._hinge;
    };

    Object.defineProperty(superClass.prototype, "angle", {
        configurable:true,
        get() {
            return this._hinge.angle;
        }
    });

    Object.defineProperty(superClass.prototype, "globalAngle", {
        configurable:true,
        get() {
            return this._hinge.globalMatrix.angle;
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

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        superInit && superInit.call(this, ...args);
        if (!this._clickHdlImpl) {
            this._clickHdlImpl = function(event) {
                Context.selection.adjustSelection(this, event, true);
                event.stopPropagation();
            }.bind(this);
            this._root.on(MouseEvents.CLICK, this._clickHdlImpl);
        }
    };

    Object.defineProperty(superClass.prototype, "selectFrame", {
        configurable:true,
        get() {
            return this._selectFrame===undefined ? this._root : this._selectFrame;
        },
        set(frame) {
            this._selectFrame = frame;
        }
    });

    if (!superClass.prototype.hasOwnProperty("selectable")) {
        Object.defineProperty(superClass.prototype, "selectable", {
            configurable: true,
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

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (!copy._clickHdl) {
            copy._clickHdlImpl = function(event) {
                Context.selection.adjustSelection(this, event, true);
                event.stopPropagation();
            }.bind(copy);
            copy._root.on(MouseEvents.CLICK, copy._clickHdlImpl);
        }
    };

}

export function makeShaped(superClass) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init && init.call(this, ...args);
        this._shape = new Group();
        this._addShapeToTray();
    };

    superClass.prototype._addShapeToTray = function() {
        let next = this._partsSupport || this._decorationsSupport || this._content;
        next ? this._tray.insert(next, this._shape) : this._tray.add(this._shape);
    };

    superClass.prototype._initShape = function(svgElement) {
        console.assert(svgElement);
        this._shape.add(svgElement);
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

}

export function makePartsOwner(superClass) {

    if (!superClass.prototype._initParts) {
        let init = superClass.prototype._init;
        superClass.prototype._init = function (...args) {
            init.call(this, ...args);
            this._partsSupport = this._initParts();
            this._addPartsToTray();
        };

        superClass.prototype._addPartsToTray = function () {
            let next = this._decorationsSupport || this._content;
            next ? this._tray.insert(next, this._partsSupport) : this._tray.add(this._partsSupport);
        };

        superClass.prototype._initParts = function () {
            let partsSupport = new Group();
            partsSupport.cloning = Cloning.NONE;
            return partsSupport;
        };

        let finalize = superClass.prototype.finalize;
        superClass.prototype.finalize = function () {
            finalize.call(this);
            if (this._parts) {
                for (let child of this._parts) {
                    child.finalize();
                }
            }
        };

        superClass.prototype._addPart = function (element) {
            if (!this._parts) {
                this._parts = new List();
                this._parts.cloning = Cloning.NONE;
            }
            // IMPORTANT : DOM update before this._children update !
            this._partsSupport.add(element._root);
            this._parts.add(element);
            element._parent = this;
        };

        Object.defineProperty(superClass.prototype, "parts", {
            configurable: true,
            get: function () {
                return this._parts ? new List(...this._parts) : new List();
            }
        });

        let cloning = superClass.prototype._cloning;
        superClass.prototype._cloning = function (duplicata) {
            let copy = cloning.call(this, duplicata);
            for (let child of this.parts) {
                let childCopy = child.clone(duplicata);
                copy._addPart(childCopy);
            }
            return copy;
        };
    }

    return superClass;
}

export function makeContainer(superClass) {

    console.assert(!superClass.prototype._initContent);

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._content = this._initContent();
        this._addContentToTray();
    };

    superClass.prototype._addContentToTray = function() {
        this._tray.add(this._content);
    };

    superClass.prototype._initContent = function() {
        let content = new Group();
        content.cloning = Cloning.NONE;
        return content;
    };

    let finalize = superClass.prototype.finalize;
    superClass.prototype.finalize = function() {
        finalize.call(this);
        if (this._children) {
            for (let child of this._children) {
                child.finalize();
            }
        }
    };

    superClass.prototype.__clear = function() {
        this._content.clear()
    };

    superClass.prototype.__add = function(element) {
        this._content.add(element._root);
    };

    superClass.prototype.__insert = function(previous, element) {
        this._content.insert(previous._root, element._root);
    };

    superClass.prototype.__replace = function(previous, element) {
        this._content.replace(previous._root, element._root);
    };

    superClass.prototype.__remove = function(element) {
        this._content.remove(element._root);
    };

    superClass.prototype._add = function(element) {
        if (!this._children) {
            this._children = new List();
            this._children.cloning = Cloning.NONE;
        }
        // IMPORTANT : DOM update before this._children update !
        this.__add(element);
        this._children.add(element);
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
            this.__insert(previous, element);
            // IMPORTANT : DOM update before this._children update !
            this._children.insert(previous, element);
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
        // IMPORTANT : DOM update before this._children update !
        this.__replace(previous, element);
        this._children.replace(previous, element);
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
            // IMPORTANT : DOM update before this._children update !
            this.__remove(element);
            this._children.remove(element);
            element._parent = null;
            if (this._children.size===0) {
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

    superClass.prototype._clear = function(element) {
        if (this._children) {
            // IMPORTANT : DOM update before this._children update !
            this.__clear();
            for (let element of this._children) {
                element._parent = null;
            }
            delete this._children;
        }
    };

    superClass.prototype.clear = function() {
        if (this._children) {
            Memento.register(this);
            let children = this._children;
            for (let element of children) {
                Memento.register(element);
            }
            this._clear();
            for (let element of children) {
                this._fire(Events.REMOVE, element);
                element._fire(Events.DETACH, this);
            }
        }
        return this;
    };

    superClass.prototype._shift = function(element, x, y) {
    };

    superClass.prototype.contains = function(element) {
        return this._children && this._children.contains(element);
    };

    Object.defineProperty(superClass.prototype, "content", {
        configurable:true,
        get: function () {
            return this._content;
        }
    });

    Object.defineProperty(superClass.prototype, "children", {
        configurable:true,
        get: function () {
            return this._children ? new List(...this._children) : new List();
        }
    });

    superClass.prototype._memorizeContent = function(memento) {
        if (this._children) {
            memento._children = new List(...this._children);
        }
    };

    superClass.prototype._revertContent = function(memento) {
        this.__clear();
        if (memento._children) {
            this._children = new List(...memento._children);
            for (let child of this._children) {
                this.__add(child);
            }
        }
        else {
            delete this._children;
        }
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            this._memorizeContent(memento);
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._revertContent(memento);
            return this;
        };
    }

    let cloning = superClass.prototype._cloning;
    superClass.prototype._cloning = function (duplicata) {
        let copy = cloning.call(this, duplicata);
        for (let child of this.children) {
            let childCopy = child.clone(duplicata);
            copy._add(childCopy);
        }
        return copy;
    };

    return superClass;
}

export class Decoration {

    constructor() {
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

    console.assert(!superClass.prototype._initDecorations);

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._initDecorations();
        this._addDecorationsToTray()
    };

    superClass.prototype._addDecorationsToTray = function() {
        let next = this._content;
        next ? this._tray.insert(next, this._decorationsSupport) : this._tray.add(this._decorationsSupport);
    };

    superClass.prototype._initDecorations = function() {
        this._decorationsSupport = new Group();
        this._decorationsSupport.cloning = Cloning.NONE;
        return this._decorationsSupport;
    };

    superClass.prototype._addDecoration = function(decoration) {
        if (!this._decorations) {
            this._decorations = new List();
            this._decorations.cloning = Cloning.NONE;
        }
        this._decorationsSupport.add(decoration._root);
        this._decorations.add(decoration);
        decoration._setElement(this);
    };

    superClass.prototype.addDecoration = function(decoration) {
        console.assert(!decoration.element);
        Memento.register(this);
        Memento.register(decoration);
        this._addDecoration(decoration);
//        this._fire(Events.ADD_DECORATION, decoration);
        return this;
    };

    superClass.prototype._removeDecoration = function(decoration) {
        if (this._decorations) {
            // IMPORTANT : DOM update before this._children update !
            this._decorationsSupport.remove(decoration._root);
            this._decorations.remove(decoration);
            decoration._setElement(null);
            if (this._decorations.size===0) {
                delete this._decorations;
            }
        }
    };

    superClass.prototype.removeDecoration = function(decoration) {
        console.assert(decoration.element===this);
        Memento.register(this);
        Memento.register(decoration);
        this._removeDecoration(decoration);
//        this._fire(Events.REMOVE_DECORATION, decoration);
        return this;
    };

    superClass.prototype._clearDecorations = function() {
        if (this._decorations) {
            this._decorationsSupport.clear();
            for (let decoration of this._decorations) {
                decoration._setElement(null);
            }
            delete this._decorations;
        }
    };

    superClass.prototype.clearDecorations = function() {
        if (this._decorations) {
            Memento.register(this);
            let decorations = this._decorations;
            for (let decoration of decorations) {
                Memento.register(decoration);
            }
            this._clearDecorations();
            /*
            for (let decoration of decorations) {
                this._fire(Events.REMOVE_DECORATION, decoration);
            }
            */
        }
        return this;
    };

    superClass.prototype.containsDecoration = function(decoration) {
        return this._decorations && this._decorations.contains(decoration);
    };

    Object.defineProperty(superClass.prototype, "decorations", {
        configurable:true,
        get: function () {
            return this._decorations ? new List(...this._decorations) : new List();
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
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
    }

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned.call(this, copy, duplicata);
        for (let decoration of this.decorations) {
            let decorationCopy = decoration.clone(duplicata);
            copy._addDecoration(decorationCopy);
        }
        return copy;
    };

    return superClass;
}

/**
 * Make a container class a support : (already) container instances then accept other elements to be dropped on.
 * <p> Note that the element must be a container (of any type) to give value to this trait.
 * @param superClass class to be enhanced.
 */
export function makeContainerASupport(superClass) {

    Object.defineProperty(superClass.prototype, "isSupport", {
        configurable: true,
        get: function () {
            return true;
        }
    });

    if (!superClass.prototype._acceptDrop) {
        superClass.prototype._acceptDrop = function (element) {
            return true;
        }
    }

    superClass.prototype._dropTarget = function (element) {
        return this;
    }
}

/**
 * Make an element class a support. This class is made a container AND a support (combinaison of two traits :
 * makeContainer and makeContainerASupport). A support is a container class that accept other elements to be dropped in.
 * <p> Note that the "container" aspect of the class may be enhanced (to be a multi layered container for example).
 * @param superClass to be enhanced
 */
export function makeSupport(superClass) {

    makeContainer(superClass);
    makeContainerASupport(superClass);

}

/**
 * Make a container class a sandbox : (already) container instances should be systematically put on "top" layers of
 * their own parent element in order to never have an element they do not own, "flying" on them.
 * <p> Note that this is just a marking trait : by itself, the instance do nothing. Layered parent instance should ask
 * for this trait to add accordingly this element in their content.
 * @param superClass class to be enhanced.
 */
export function makeContainerASandBox(superClass) {

    Object.defineProperty(superClass.prototype, "isSandBox", {
        configurable: true,
        get: function () {
            return true;
        }
    });

}

export function makeSandBox(superClass) {

    makeSupport(superClass);
    makeContainerASandBox(superClass);

}

export function makeContainerMultiLayered(superClass, {layers}) {

    let defaultLayer = layers[0];

    let initContent = superClass.prototype._initContent;
    superClass.prototype._initContent = function () {
        let content = new Group();
        content.cloning = Cloning.NONE;
        this._layers = new CloneableObject();
        for (let layer of layers) {
            this._layers[layer] = new Group();
            content.add(this._layers[layer]);
        }
        initContent && initContent.call(this);
        return content;
    };

    superClass.prototype.__clear = function () {
        for (let layer of layers) {
            this._layers[layer].clear();
        }
    };

    superClass.prototype.__add = function (element) {
        let layer = this._getLayer(element);
        this._layers[layer].add(element._root);
    };

    /**
     * Find the first element that follow a given child in the container and that belongs to a given layer. This
     * private method is used to replace or insert an element in place of (or before) another one that belongs to
     * another layer.
     * @param element starting point of the search
     * @param layer layer of the requested element
     * @returns {*}
     * @private
     */
    superClass.prototype._findNextOnLayer = function(element, layer) {
        let elemIdx = this._children.indexOf(element);
        if (elemIdx === -1) return null;
        for (let index = elemIdx+1; index<this._children.length; index++) {
            if (this._getLayer(this._children[index]) === layer) return this._children[index];
        }
        return null;
    };

    superClass.prototype.__insert = function (previous, element) {
        let previousLayer = this._getLayer(previous);
        let layer = this._getLayer(element);
        if (layer===previousLayer) {
            this._layers[layer].insert(previous._root, element._root);
        }
        else {
            let next = this._findNextOnLayer(previous, layer);
            if (next) {
                this._layers[layer].insert(next._root, element._root);
            }
            else {
                this._layers[layer].add(element._root);
            }
        }
    };

    superClass.prototype.__replace = function (previous, element) {
        let previousLayer = this._getLayer(previous);
        let layer = this._getLayer(element);
        if (layer===previousLayer) {
            this._layers[layer].replace(previous._root, element._root);
        }
        else {
            let next = this._findNextOnLayer(previous, layer);
            this._layers[previousLayer].remove(previous._root);
            if (next) {
                this._layers[layer].insert(next._root, element._root);
            }
            else {
                this._layers[layer].add(element._root);
            }
        }
    };

    superClass.prototype.__remove = function (element) {
        let layer = this._getLayer(element);
        this._layers[layer].remove(element._root);
    };

    superClass.prototype._getLayer = function(element) {
        let layer = element.getLayer && element.getLayer(this) || defaultLayer;
        if (!this._layers[layer]) layer = defaultLayer;
        return layer;
    };

    let cloning = superClass.prototype._cloning;
    superClass.prototype._cloning = function(duplicata) {
        let copy = cloning.call(this, duplicata);
        for (let layer of layers) {
            copy._content.add(copy._layers[layer]);
        }
        return copy;
    };
}

export function makeMultiLayeredContainer(superClass, {layers}) {
    makeContainer(superClass);
    makeContainerMultiLayered(superClass, {layers});
}

export function makeLayersWithContainers(superClass, {layersBuilder}) {

    console.assert(layersBuilder);

    let defaultLayer;
    let layers = layersBuilder();

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        superInit.call(this, ...args);
        this._content = this._initContent();
        this._addContentToTray();
    };

    superClass.prototype._addContentToTray = function() {
        let next = this._decorationsSupport;
        next ? this._tray.insert(next, this._content) : this._tray.add(this._content);
    };

    superClass.prototype._initContent = function () {
        let content = new Group();
        this._layers = new CloneableObject();
        for (let layer in layers) {
            if (!defaultLayer) defaultLayer = layer;
            this._layers[layer] = layers[layer];
            this._layers[layer].pedestal = new Group();
            content.add(this._layers[layer].pedestal.add(layers[layer]._root));
            layers[layer]._parent = this;
        }
        return content;
    };

    let finalize = superClass.prototype.finalize;
    superClass.prototype.finalize = function() {
        finalize.call(this);
        for (let layer of this._layers) {
            layer.finalize();
        }
    };

    superClass.prototype.clear = function () {
        for (let layer in layers) {
            this._layers[layer].clear();
        }
        return this;
    };

    superClass.prototype.add = function (element) {
        let layer = this._getLayer(element);
        this._layers[layer].add(element);
        return this;
    };

    superClass.prototype.insert = function (previous, element) {
        let previousLayer = this._getLayer(previous);
        let layer = this._getLayer(element);
        if (layer===previousLayer) {
            this._layers[layer].insert(previous, element);
        }
        else {
            this._layers[layer].add(element);
        }
        return this;
    };

    superClass.prototype.replace = function (previous, element) {
        let previousLayer = this._getLayer(previous);
        let layer = this._getLayer(element);
        if (layer===previousLayer) {
            this._layers[layer].replace(previous, element);
        }
        else {
            this._layers[previousLayer].remove(previous);
            this._layers[layer].add(element);
        }
        return this;
    };

    superClass.prototype.remove = function (element) {
        let layer = this._getLayer(element);
        this._layers[layer].remove(element);
        return this;
    };

    superClass.prototype.contains = function (element) {
        let layer = this._getLayer(element);
        return this._layers[layer].contains(element);
    };

    superClass.prototype.getElementsInLayers = function (elements) {
        let elementsInLayers = new Map();
        for (let element of elements) {
            let layer = this._getLayer(element);
            let elements = elementsInLayers.get(layer);
            if (!elements) {
                elements = new List();
                elementsInLayers.set(layer, elements);
            }
            elements.add(element);
        }
        return elementsInLayers;
    };

    let hover = superClass.prototype.hover;
    superClass.prototype.hover = function (elements) {
        hover && hover.call(this, elements);
        let elementsInLayers = this.getElementsInLayers(elements);
        for (let layer of elementsInLayers.keys()) {
            if (this._layers[layer].hover) {
                this._layers[layer].hover(elementsInLayers.get(layer));
            }
        }
    };

    superClass.prototype.showLayer = function(layer) {
        this._layers[layer].pedestal.add(this._layers[layer]._root);
    };

    superClass.prototype.hideLayer = function(layer) {
        this._layers[layer].pedestal.remove(this._layers[layer]._root);
    };

    superClass.prototype.hidden = function(layer) {
        return !!this._layers[layer]._root.parent;
    };

    Object.defineProperty(superClass.prototype, "children", {
        configurable: true,
        get: function () {
            let result = new List();
            for (let layer in this._layers) {
                result.push(...this._layers[layer].children);
            }
            return result;
        }
    });

    superClass.prototype.layerChildren = function (layer) {
        return this._layers[layer].children;
    };

    superClass.prototype._acceptDrop = function(element) {
        let layer = this._getLayer(element);
        return this._layers[layer]._acceptDrop(element);
    };

    superClass.prototype._getLayer = function(element) {
        let layer = element.getLayer && element.getLayer(this) || defaultLayer;
        if (!this._layers[layer]) layer = defaultLayer;
        return layer;
    };

    Object.defineProperty(superClass.prototype, "content", {
        configurable: true,
        get: function () {
            return this._content;
        }
    });
}

export function makeLayered(superClass, {layer}) {

    let getLayer = superClass.prototype.getLayer;
    superClass.prototype.getLayer = function(target) {
        if (getLayer) {
            let layer = getLayer.call(this, target);
            if (layer) return layer;
        }
        return layer;
    };

}

export class Pedestal {

    constructor(element, parent, zIndex, support) {
        this._root = new Group();
        this._root._owner = this;
        this._element = element;
        this._support = support;
        this._zIndex = zIndex;
        this._support._level(this._zIndex).add(this._root);
        support._pedestals.set(element, this);
        if (parent) {
            support._pedestals.get(parent)._register(this);
        }
    }

    get elements() {
        let elements = new List();
        for (let eroot of this._root.children) {
            elements.add(eroot._owner);
        }
        return elements;
    }

    _memento() {
        for (let element of this.elements) {
            element._registerPedestal();
        }
        return {
            _rootChildren : [...this._root.children],
            _matrix : this._root._matrix
        }
    }

    _revert(memento) {
        this._root.clear();
        for (let svgChild of memento._rootChildren) {
            this._root.add(svgChild);
        }
        if (memento._matrix) {
            this._root._matrix = memento._matrix;
        }
    }

    get level() {
        return this._support.level(this._zIndex);
    }

    finalize() {
        this._support.removePedestal(this);
        if (this._children) {
            for (let pedestal of this._children) {
                pedestal.finalize();
            }
        }
    }

    _proto(container) {
        let proto = container.__proto__;
        let that = this;
        let pedestal = that._support._pedestal(container, that._element, that._zIndex);
        container.__proto__ = {
            add(element) {
                that._support._memorizeElementContent(element);
                proto.add.call(this, element);
            },
            insert(previous, element) {
                that._support._memorizeElementContent(element);
                proto.insert.call(this, previous, element);
            },
            replace(previous, element) {
                that._support._memorizeElementContent(element);
                proto.replace.call(this, previous, element);
            },
            remove(element) {
                that._support._memorizeElementContent(element);
                proto.remove.call(this, element);
            },
            clear() {
                for (let element of that.elements) {
                    that._support._memorizeElementContent(element);
                }
                proto.clear.call(this);
            },
            _add(element) {
                proto._add.call(this, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _insert(previous, element) {
                proto._insert.call(this, previous, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _replace(previous, element) {
                that._support._takeOutElementContent(previous);
                that._support._removeEmptyLevels();
                proto._replace.call(this, previous, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _remove(element) {
                that._support._takeOutElementContent(element);
                that._support._removeEmptyLevels();
                proto._remove.call(this, element);
            },
            _clear() {
                for (let element of pedestal.elements) {
                    that._support._takeOutElementContent(element);
                }
                that._support._removeEmptyLevels();
                proto._clear.call(this);
            },
            __add(element) {
                pedestal.add(element);
            },
            __insert(previous, element) {
                pedestal.insert(previous, element);
            },
            __replace(previous, element) {
                pedestal.replace(previous, element);
            },
            __remove(element) {
                pedestal.remove(element);
            },
            __clear() {
                pedestal.clear();
            },
            _setLocation(x, y) {
                super._setLocation(x, y);
                pedestal.refresh();
                return this;
            },
            _memento() {
                this._registerPedestal();
                Memento.register(pedestal._support);
                return super._memento();
            },
            _registerPedestal() {
                Memento.register(pedestal);
            },
            pedestal,
            __pass__:true,
            __proto__:proto,
            constructor:proto.constructor
        }
    }

    _unproto(container) {
        container.pedestal._parent._unregister(container.pedestal);
        container.__proto__ = container.__proto__.__proto__;
    }

    get elements() {
        let elements = new List();
        for (let eroot of this._root.children) {
            elements.push(eroot._owner);
        }
        return elements;
    }

    clear() {
        this._root.clear();
    }

    add(element) {
        this._root.add(element._root);
    }

    insert(previous, element) {
        this._root.insert(previous._root, element._root);
    }

    replace(previous, element) {
        this._root.replace(previous._root, element._root);
    }

    remove(element) {
        this._root.remove(element._root);
    }

    _register(pedestal) {
        if (!this._children) {
            this._children = new List();
        }
        this._children.add(pedestal);
        pedestal._parent = this;
        if (this.level) {
            pedestal.matrix = computeMatrix(this.level, pedestal._element.content);
        }
    }

    _unregister(pedestal) {
        pedestal.finalize();
        this._children.remove(pedestal);
    }

    get matrix() {
        return this._root.matrix;
    }

    set matrix(matrix) {
        this._root.matrix = matrix;
        if (this._children) {
            for (let pedestal of this._children) {
                pedestal.matrix = computeMatrix(this.level, pedestal._element.content);
            }
        }
    }

    refresh() {
        this.matrix = computeMatrix(this._parent.level, this._element.content);
    }
}
makeCloneable(Pedestal);

class ZIndexSupport {

    clone(duplicata) {
        let support = new ZIndexSupport(duplicata.get(this._host));
        return support;
    }

    constructor(host) {
        this._host = host;
        this._levels = new List();
        this._pedestals = new Map();
        this._rootPedestal = new Pedestal(this._host, null, 0, this);
        let config = {attributes: true, childList: true, subtree: true};

        let action = mutations=> {
            let updates = new ESet();
            for (let mutation of mutations) {
                if (mutation.type === Mutation.ATTRIBUTES && mutation.attributeName==="transform" ) {
                    let svgElement = SVGElement.elementOn(mutation.target);
                    let element = svgElement.owner;
                    if (element !== this._host) {
                        updates.add(element);
                    }
                }
            }
            let processed = new ESet();
            let roots = new ESet();

            function process(pedestal, isRoot) {
                if (!processed.has(pedestal)) {
                    processed.add(pedestal);
                    if (isRoot) {
                        roots.add(pedestal);
                    }
                    if (pedestal._children) {
                        for (let child of pedestal._children) {
                            process(child, false);
                        }
                    }
                }
                else {
                    roots.delete(pedestal);
                }
            }

            for (let element of updates) {
                let pedestal = this._pedestals.get(element);
                pedestal && process(pedestal, true);
            }
            Context.mutationObservers.disconnect(this._host);
            for (let pedestal of roots) {
                pedestal.refresh();
            }
            Context.mutationObservers.observe(this._host, action, this._host._content._node, config);
        };
        Context.mutationObservers.observe(this._host, action, this._host._content._node, config);
    }

    removePedestal(pedestal) {
        let level = this.level(pedestal._zIndex);
        level.remove(pedestal._root);
        this._pedestals.delete(pedestal._element);
    }

    level(index) {
        if (!this._levels[index]) {
            Memento.register(this._host);
            this._level(index);
        }
        return this._levels[index];
    };

    _level(index) {
        for (let idx = this._levels.length; idx<=index; idx++) {
            this._levels[idx] = new Group();
            this._host._content.add(this._levels[idx]);
        }
        return this._levels[index];
    };

    _pedestal(element, parent, zIndex) {
        let pedestal = this._pedestals.get(element);
        if (!pedestal) {
            pedestal = new Pedestal(element, parent, zIndex + 1, this);
            this._pedestals.set(element, pedestal);
        }
        return pedestal;
    };

    _memorizeElementContent(element) {
        Memento.register(element);
        if (element.children) {
            for (let child of element.children) {
                this._memorizeElementContent(child);
            }
        }
    };

    _takeInElementContent(element, parent, zIndex) {
        if (!element.isSandBox) {
            let children = element.children || [];
            if (element.isSupport) {
                for (let child of children) {
                    element._remove(child);
                }
                this._pedestals.get(parent)._proto(element);
                for (let child of children) {
                    element._add(child);
                }
            }
            else {
                for (let child of children) {
                    this._takeInElementContent(child, parent, zIndex);
                }
            }
        }
    };

    _takeOutElementContent(element) {
        if (!element.isSandBox) {
            if (element.isSupport) {
                let pedestal = this._pedestals.get(element);
                if (pedestal) {
                    let elements = pedestal.elements;
                    for (let child of elements) {
                        element._remove(child);
                    }
                    pedestal._unproto(element);
                    for (let child of elements) {
                        element._add(child);
                    }
                }
            }
            else {
                let children = element.children;
                if (children && children.length > 0) {
                    for (let child of children) {
                        this._takeOutElementContent(child);
                    }
                }
            }
        }
    };

    _removeEmptyLevels() {
        for (let index = this._levels.length-1; index>0; index--) {
            if (this._levels[index].empty) {
                this._host._content.remove(this._levels[index]);
                this._levels.length -=1;
            }
            else {
                break;
            }
        }
    }

    _add(add, element) {
        add.call(this._host, element);
        this._takeInElementContent(element, this._host, 0);
    };

    _insert(insert, previous, element) {
        insert.call(this._host, previous, element);
        this._takeInElementContent(element, this._host, 0);
    };

    _replace(replace, previous, element) {
        this._takeOutElementContent(previous);
        this._removeEmptyLevels();
        replace.call(this._host, previous, element);
        this._takeInElementContent(element, this._host, 0);
    };

    _remove(remove, element) {
        this._takeOutElementContent(element);
        this._removeEmptyLevels();
        remove.call(this._host, element);
    };

    _clear(clear) {
        for (let element of this._host.children) {
            this._takeOutElementContent(element);
        }
        clear.call(this._host);
        this._levels.clear();
        this._pedestals.clear();
        this._rootPedestal.clear();
        this._pedestals.set(this._host, this._rootPedestal);
        this.level(0).add(this._rootPedestal._root);
    };

    __add = function (element) {
        this._rootPedestal.add(element);
    };

    __insert(previous, element) {
        this._rootPedestal.insert(previous, element);
    };

    __replace(previous, element) {
        this._rootPedestal.replace(previous, element);
    };

    __remove(element) {
        this._rootPedestal.remove(element);
    };

    __clear(element) {
        this._rootPedestal.clear();
    };

    _memento() {
        function justLevel(level) {
            let pedestals = new List();
            for (let proot of level.children) {
                let pedestal = proot.owner;
                pedestals.push(pedestal);
            }
            return pedestals;
        }

        Memento.register(this._rootPedestal);
        let memento = {};
        memento._pedestals = new Map([...this._pedestals.entries()]);
        memento._levels = new List();
        for (let level of this._levels) {
            memento._levels.push(justLevel(level));
        }
        return memento;
    };

    _revert(memento) {
        this._pedestals = new Map([...memento._pedestals.entries()]);
        let index=0;
        this._levels.clear();
        this._host._content.clear();
        for (let level of memento._levels) {
            let rlevel = new Group();
            this._levels.push(rlevel);
            for (let pedestal of level) {
                rlevel.add(pedestal._root);
            }
            this._host._content.add(rlevel);
        }
        return this;
    };
}

export function makeContainerZindex(superClass) {

    superClass.prototype._initContent = function () {
        this._content = new Group();
        this._content.cloning = Cloning.NONE;
        this._zIndexSupport = new ZIndexSupport(this);
        return this._content;
    };

    let add = superClass.prototype.add;
    superClass.prototype.add = function (element) {
        Memento.register(this._zIndexSupport);
        this._zIndexSupport._memorizeElementContent(element);
        return add.call(this, element);
    };

    let insert = superClass.prototype.insert;
    superClass.prototype.insert = function (previous, element) {
        Memento.register(this._zIndexSupport);
        this._zIndexSupport._memorizeElementContent(element);
        return insert.call(this, previous, element);
    };

    let replace = superClass.prototype.replace;
    superClass.prototype.replace = function (previous, element) {
        Memento.register(this._zIndexSupport);
        this._zIndexSupport._memorizeElementContent(element);
        return replace.call(this, previous, element);
    };

    let remove = superClass.prototype.remove;
    superClass.prototype.remove = function (element) {
        Memento.register(this._zIndexSupport);
        this._zIndexSupport._memorizeElementContent(element);
        return remove.call(this, element);
    };

    let clear = superClass.prototype.clear;
    superClass.prototype.clear = function () {
        Memento.register(this._zIndexSupport);
        for (let element of this._children) {
            this._zIndexSupport._memorizeElementContent(element);
        }
        return clear.call(this);
    };

    let _add = superClass.prototype._add;
    superClass.prototype._add = function (element) {
        this._zIndexSupport._add(_add, element);
    };

    let _insert = superClass.prototype._insert;
    superClass.prototype._insert = function (previous, element) {
        this._zIndexSupport._insert(_insert, previous, element);
    };

    let _replace = superClass.prototype._replace;
    superClass.prototype._replace = function (previous, element) {
        this._zIndexSupport._replace(_replace, previous, element);
    };

    let _remove = superClass.prototype._remove;
    superClass.prototype._remove = function (element) {
        this._zIndexSupport._remove(_remove, element);
    };

    let _clear = superClass.prototype._clear;
    superClass.prototype._clear = function () {
        this._zIndexSupport._clear(_clear);
    };

    superClass.prototype.__add = function (element) {
        this._zIndexSupport.__add(element);
    };

    superClass.prototype.__insert = function (previous, element) {
        this._zIndexSupport.__insert(previous, element);
    };

    superClass.prototype.__replace = function (previous, element) {
        this._zIndexSupport.__replace(previous, element);
    };

    superClass.prototype.__remove = function (element) {
        this._zIndexSupport.__remove(element);
    };

    superClass.prototype.__clear = function () {
        this._content.clear();
        this._zIndexSupport.__clear();
    };

    superClass.prototype._memorizeContent = function(memento) {
        Memento.register(this._zIndexSupport);
    };

    superClass.prototype._revertContent = function(memento) {
    };

}

export function makeZindexContainer(superClass) {
    makeContainer(superClass);
    makeContainerZindex(superClass);
}

export function makeZindexSupport(superClass) {
    makeSandBox(superClass);
    makeContainerZindex(superClass);
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
            this.__dragOp = operation.call(this);
            let dragStart = event=> {
                accepted = this.__dragOp._accept(this, event.pageX, event.pageY, event);
                if (accepted) {
                    this.__dragOp._onDragStart(this, event.pageX, event.pageY, event);
                }
            };
            let dragMove = event=> {
                if (accepted) {
                    this.__dragOp._onDragMove(this, event.pageX, event.pageY, event);
                }
            };
            let dragDrop = event=> {
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
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (this._dragOp) {
            copy._dragOperation(this._dragOp);
        }
    };

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
            this._root.off(MouseEvents.CLICK, this._clickHdlImpl);
        }
        this._clickHdlImpl = event=> {
            Context.selection.adjustSelection(this, event, true);
            handler && handler.call(this)(event);
            event.stopPropagation();
        };
        this._root.on(MouseEvents.CLICK, this._clickHdlImpl);
    };

    superClass.prototype._doubleClickHandler = function(handler) {
        this._doubleClickHdl = handler;
        if (this._doubleClickHdlImpl) {
            this._root.off(Events.DOUBLE_CLICK, this._doubleClickHdlImpl);
        }
        this._doubleClickHdlImpl = event=> {
            Context.selection.adjustSelection(this, event, true);
            handler && handler.call(this)(event);
            event.stopPropagation();
        };
        this._root.on(MouseEvents.DOUBLE_CLICK, this._doubleClickHdlImpl);
    };

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (this._clickHdl) {
            copy._clickHandler(this._clickHdl);
        }
        if (this._doubleClickHdl) {
            copy._doubleClickHandler(this._doubleClickHdl);
        }
    };

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

    superClass.prototype._initFrame = function(width, height, strokeColor, backgroundColor) {
        let background = new Rect(-width/2, -height/2, width, height);
        background.stroke = strokeColor;
        background.fill = backgroundColor;
        return this._initShape(background);
    };

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
        configurable:true,
        get: function () {
            return this.shape._children[0];
        }
    });

    Object.defineProperty(superClass.prototype, "frame", {
        configurable:true,
        get: function () {
            return this.shape._children[1];
        }
    });

    Object.defineProperty(superClass.prototype, "url", {
        configurable:true,
        get: function () {
            return this.background.href;
        }
    });

    Object.defineProperty(superClass.prototype, "width", {
        configurable:true,
        get: function () {
            return this.background.width;
        },
        set: function(width) {
            Memento.register(this);
            this.background.attrs({width:width, x:-width/2});
            this.frame.attrs({width:width, x:-width/2});
        }
    });

    Object.defineProperty(superClass.prototype, "height", {
        configurable:true,
        get: function () {
            return this.background.height;
        },
        set: function(height) {
            Memento.register(this);
            this.background.attrs({height:height, y:-height/2});
            this.frame.attrs({height:height, y:-height/2});
        }
    });

    superClass.prototype._loadImage = function(width, height, url) {
        if (url.rasterized) {
            return new SvgRasterImage(url.svg, -width/2, -height/2, width, height);
        }
        else {
            console.assert(typeof(url)==='string');
            return new RasterImage(url, -width/2, -height/2, width, height);
        }
    };
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

    superClass.prototype._loadImages = function(width, height, backgroundURLs) {
        this._images = new List();
        for (let backgroundURL of backgroundURLs) {
            this._images.add(this._loadImage(width, height, backgroundURL));
        }
        return this._images[0];
    };

    superClass.prototype._setImageIndex = function(index) {
        let idx = index%this._images.length;
        if (this.background !== this._images[idx]) {
            this.shape.replace(this.background, this._images[idx]);
        }
        return this;
    };

    Object.defineProperty(superClass.prototype, "imageIndex", {
        configurable:true,
        get: function () {
            return this._images.indexOf(this.background);
        },
        set: function(index) {
            Memento.register(this);
            this._setImageIndex(index);
        }
    });

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
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
    }

    return superClass;
}

export function makeClipImaged(superClass) {

    makeMultiImaged(superClass);

    superClass.prototype._initImages = function (width, height, strokeColor, imageURL, ...clipped) {
        return this._initBackground(width, height, strokeColor,
            this._loadImages(width, height, imageURL, ...clipped));
    };

    superClass.prototype._loadImages = function(width, height, imageURL, ...clipped) {
        this._images = new List();
        for (let clip of clipped) {
            this._images.add(new ClippedRasterImage(imageURL, clip.x, clip.y, clip.width, clip.height, -width / 2, -height / 2, width, height));
        }
        return this._images[0];
    };

    return superClass;
}

export function makeGentleDropTarget(superClass) {

    superClass.prototype._dropTarget = function(element) {
        if (this.support && this.support._dropTarget && (!this._acceptDrop || !this._acceptDrop(element))) {
            return this.support._dropTarget(element);
        }
        return this;
    };

    return superClass;
}

export function makePart(superClass) {

    Object.defineProperty(superClass.prototype, "owner", {
        configurable:true,
        get() {
            let parent = this.parent;
            if (parent) {
                let owner = parent.owner;
                return owner ? owner : parent;
            }
            return null;
        }
    });

    if (!superClass.prototype.hasOwnProperty("selectable")) {
        Object.defineProperty(superClass.prototype, "selectable", {
            configurable:true,
            get() {
                return this.owner.selectable;
            }
        });
    }

    Object.defineProperty(superClass.prototype, "menuOptions", {
        configurable: true,
        get: function () {
            let menuOptions = new List(...this.owner.menuOptions);
            if (menuOptions) {
                if (this._menuOptions) {
                    menuOptions.push(...this._getOwnMenuOptions());
                }
                return menuOptions;
            }
            else {
                return this._menuOptions;
            }
        }
    });

    if (!superClass.prototype._acceptDrop) {
        makeGentleDropTarget(superClass);
    }

    return superClass;
}

export function makeFillUpdatable(superClass) {

    superClass.prototype._initFill = function(data) {
        this._setFillColor(data.fillColor || Colors.NONE);
    };

    Object.defineProperty(superClass.prototype, "fillColor", {
        configurable: true,
        get: function() {
            return this._fillColor;
        },
        set: function(fillColor) {
            Memento.register(this);
            this._setFillColor(fillColor);
        }
    });

    superClass.prototype._setFillColor = function(fillColor) {
        this._fillColor = fillColor;
        this._shape.child.attrs({fill: fillColor});
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._fillColor = this._fillColor;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._fillColor = memento._fillColor;
            this._shape.child.attrs({fill: this._fillColor});
            return this;
        };
    }

}

export function makeStrokeUpdatable(superClass) {

    superClass.prototype._initStroke = function(data) {
        this._setStrokeColor(data.strokeColor || this._strokeColor  || Colors.BLACK);
        this._setStrokeWidth(data.strokeWidth || this._strokeWidth  || 1);
    };

    Object.defineProperty(superClass.prototype, "strokeColor", {
        configurable: true,
        get: function() {
            return this._strokeColor;
        },
        set: function(strokeColor) {
            Memento.register(this);
            this._setStrokeColor(strokeColor);
        }
    });

    Object.defineProperty(superClass.prototype, "strokeWidth", {
        configurable: true,
        get: function() {
            return this._strokeWidth;
        },
        set: function(strokeWidth) {
            Memento.register(strokeWidth);
            this._setStrokeWidth(strokeWidth);
        }
    });

    superClass.prototype._setStrokeColor = function(strokeColor) {
        this._strokeColor = strokeColor;
        this._shape.child.attrs({stroke: strokeColor});
    };

    superClass.prototype._setStrokeWidth = function(strokeWidth) {
        this._strokeWidth = strokeWidth;
        this._shape.child.attrs({stroke_width: strokeWidth});
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._strokeColor = this._strokeColor;
            memento._strokeWidth = this._strokeWidth;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._strokeColor = memento._strokeColor;
            this._strokeWidth = memento._strokeWidth;
            this._shape.child.attrs({stroke: this._strokeColor, stroke_width: this._strokeWidth});
            return this;
        };
    }

}

export class BoardElement {

    constructor(width, height, ...args) {
        this._width = width;
        this._height = height;
        console.assert(this._width!==undefined&&this._height!==undefined);
        this._id = createUUID();
        this._createStructure();
        this._init(...args);
    }

    _init(...args) {
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
        this._parent = null;
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

    setLocation(x, y) {
        if (!same(x, this.lx) || !same(y, this.ly)) {
            Memento.register(this);
            this._setLocation(x, y);
            this._fire(Events.GEOMETRY, this.lx, this.ly, this.width, this.height);
            return true;
        }
        return false;
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

    _setLocation(x, y) {
        this._matrix = Matrix.translate(x, y);
        return this;
    }

    _setSize(width, height) {
        this._width = width;
        this._height = height;
        return this;
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
        return parent ? parent : Context.canvas.getGlassSupport(this);
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

    clone(duplicata) {
/*
        let copy = duplicata.get(this);
        if (!copy) {
        */
            let copy = this._cloning(duplicata);
//        }
        return copy;
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
}
makeObservable(BoardElement, Cloning.NONE);

export class BoardArea extends BoardElement {

    constructor(width, height, backgroundColor) {
        super(width, height);
        let background = new Rect(-width/2, -height/2, width, height);
        background.fill = backgroundColor;
        this._initShape(background);
        this._setSize(width, height);
        this._dragOperation(function() {return Context.scrollOrSelectAreaDrag;});
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
makeNotCloneable(BoardArea);

export class BoardTable extends BoardArea {

    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
        this._observe(Context.copyPaste);
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

export class TextDecoration extends Decoration {

    constructor(labelOwner, labelGetter, specs, fontProperties = Attrs.FONT_PROPERTIES) {
        super();
        this._labelOwner = labelOwner;
        this._labelGetter = labelGetter;
        this._specs = specs;
        this._fontProperties = fontProperties;
    }

    _init() {

        function getX(specs) {
            let {x} = specs;
            let textAnchor = TextAnchor.MIDDLE;
            if (x === TextDecoration.LEFT) {
                x = -this._element.width/2+TextDecoration.MARGIN;
                textAnchor = TextAnchor.START;
            } else if (x === TextDecoration.RIGHT) {
                x = this._element.width/2-TextDecoration.MARGIN;
                textAnchor = TextAnchor.END;
            } else if (x === TextDecoration.MIDDLE) {
                x = 0;
                textAnchor = TextAnchor.MIDDLE;
            } else {
                console.assert(isNumber(x));
            }
            return {x, textAnchor};
        }

        function getY(specs) {
            let {y} = specs;
            let alignmentBaseline = AlignmentBaseline.MIDDLE;
            if (y === TextDecoration.TOP) {
                y = -this._element.height/2+TextDecoration.MARGIN;
                alignmentBaseline = AlignmentBaseline.BEFORE_EDGE;
            } else if (y === TextDecoration.TOP) {
                y = this._element.height/2-TextDecoration.MARGIN;
                alignmentBaseline = AlignmentBaseline.AFTER_EDGE;
            } else if (y === TextDecoration.MIDDLE) {
                y = 0;
                alignmentBaseline = AlignmentBaseline.MIDDLE;
            } else {
                console.assert(isNumber(y));
            }
            return {y, alignmentBaseline};
        }

        let {x, textAnchor} = getX.call(this, this._specs);
        let {y, alignmentBaseline} = getY.call(this, this._specs);
        let attrs = collectProperties(this._specs, this._fontProperties);
        let text = new Text(0, 0, this._labelGetter.call(this._labelOwner)).attrs({
            text_anchor:textAnchor, alignment_baseline:alignmentBaseline, ...attrs}
        );
        this._root.add(text);
        this._root.matrix = Matrix.translate(x, y);
    }

    refresh() {
        this._root.clear();
        this._init();
    }

    clone(duplicata) {
        //let element = duplicata.get(this._element);
        let labelOwner = duplicata.get(this._labelOwner);
        let copy = new TextDecoration(labelOwner, this._labelGetter, {...this._specs}, {...this._fontProperties});
        //copy._element = element;
        return copy;
    }

}
TextDecoration.MARGIN = 2;
TextDecoration.LEFT = "left";
TextDecoration.RIGHT = "right";
TextDecoration.MIDDLE = "middle";
TextDecoration.TOP = "top";
TextDecoration.BOTTOM = "bottom";
