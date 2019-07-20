'use strict';

import {
    SVGElement, Translation, Rotation, Group, Rect, createUUID, MouseEvents, Matrix, l2l, List, RasterImage, Fill,
    ClippedRasterImage, Mutation, computeMatrix
} from "./svgbase.js";
import {
    Memento, makeObservable, CopyPaste, Events, getBox, Context, getCanvasLayer
} from "./toolkit.js";

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
            return this._selectFrame===undefined ? this._root : this._selectFrame;
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
        }
        this._children.add(element);
        this.__add(element);
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
            this.__insert(previous, element);
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
        this.__replace(previous, element);
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
            this.__remove(element);
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
            return this;
        };
    }

    return superClass;
}

export function makePositionningContainer(superClass, positionsFct) {

    superClass.prototype._receiveDrop = function(element) {
        let lx = element.lx;
        let ly = element.ly;
        let distance = Infinity;
        let position = {x:lx, y:ly};
        for (let _position of positionsFct.bind(this)()) {
            let _distance = (_position.x-lx)*(_position.x-lx)+(_position.x-lx)*(_position.x-lx);
            if (_distance<distance) {
                position = _position;
            }
        }
        element.move(position.x, position.y);
    };

    return superClass;
}

export function makeSupport(superClass) {

    makeContainer(superClass);

    Object.defineProperty(superClass.prototype, "isSupport", {
        configurable: true,
        get: function () {
            return true;
        }
    });

    superClass.prototype._acceptDrop = function(element) {
        return true;
    }

}

export function makeContainerMultiLayered(superClass, ...layers) {

    let defaultLayer = layers[0];

    superClass.prototype._initContent = function () {
        this._content = new Group();
        for (let layer of layers) {
            this[layer] = new Group();
            this._content.add(this[layer]);
        }
        return this._content;
    };

    superClass.prototype.__clear = function () {
        for (let layer of layers) {
            this[layer].clear();
        }
    };

    superClass.prototype.__add = function (element) {
        let layer = element.layer || defaultLayer;
        this[layer].add(element._root);
    };

    superClass.prototype.__insert = function (previous, element) {
        let layer = element.layer || defaultLayer;
        this[layer].insert(previous._root, element._root);
    };

    superClass.prototype.__replace = function (previous, element) {
        let layer = element.layer || defaultLayer;
        this[layer].replace(previous._root, element._root);
    };

    superClass.prototype.__remove = function (element) {
        let layer = element.layer || defaultLayer;
        this[layer].remove(element._root);
    };
}

export function makeMultiLayeredContainer(superClass, ...layers) {
    makeContainer(superClass);
    makeContainerMultiLayered(superClass);
}

export function makeLayered(superClass, layer) {

    Object.defineProperty(superClass.prototype, "layer", {
        configurable: true,
        get: function () {
            return layer;
        }
    });

}

export class Pedestal {

    constructor(element, parent, zIndex, host) {
        this._root = new Group();
        this._root._owner = this;
        this._element = element;
        this._host = host;
        this._zIndex = zIndex;
        this.level.add(this._root);
        host._pedestals.set(element, this);
        if (parent) {
            host._pedestals.get(parent)._register(this);
        }
    }

    _memento() {
        for (let eroot of this._root.children) {
            let child = eroot._owner;
            Memento.register(child);
        }
        return {
            _matrix : this._root.matrix
        }
    }

    _revert(memento) {
        this._root.matrix = memento._matrix;
    }

    get level() {
        return this._host.level(this._zIndex);
    }

    finalize() {
        let level = this._host.level(this._zIndex);
        level.remove(this._root);
        this._host._pedestals.delete(this._element);
        if (this._children) {
            for (let pedestal of this._children) {
                pedestal.finalize();
            }
        }
    }

    _proto(container) {
        let proto = container.__proto__;
        let that = this;
        let pedestal = that._host._pedestal(container, that._element, that._zIndex);
        container.__proto__ = {
            _add(element) {
                proto._add.call(this, element);
                that._host._takeInElementContent(element, this, that._zIndex + 1);
            },
            _insert(previous, element) {
                proto._insert.call(this, previous, element);
                that._host._takeInElementContent(element, this, that._zIndex + 1);
            },
            _replace(previous, element) {
                that._host._takeOutElementContent(element);
                proto._replace.call(this, previous, element);
                that._host._takeInElementContent(element, this, that._zIndex + 1);
            },
            _remove(element) {
                that._host._takeOutElementContent(element);
                proto._remove.call(this, element);
            },
            _clear() {
                proto.__clear.call(this);
            },
            __add(element) {
                pedestal.add(element);
            },
            __insert(previous, element) {
                pedestal.insert(element);
            },
            __replace(previous, element) {
                pedestal.replace(previous, element);
            },
            __remove(element) {
                pedestal.remove(element);
            },
            __clear() {
                pedestal.clear()
            },
            _memento() {
                Memento.register(pedestal);
                return super._memento();
            },
            pedestal,
            __pass__:true,
            __proto__:proto,
            constructor:proto.constructor
        }
    }

    _unproto(container) {
        container.pedestal._parent._unregister(container.pedestal);
        container.__proto__ = container.__proto__._proto_;
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
        let parent = this._parent;
        this.matrix =  computeMatrix(parent.level, this._element.content);
    }
}

export function makeContainerZindex(superClass) {

    superClass.prototype._initContent = function () {
        this._content = new Group();
        this._levels = new List();
        this._pedestals = new Map();
        this._rootPedestal = new Pedestal(this, null, 0, this);
        let config = {attributes: true, childList: true, subtree: true}
        let action = mutations=> {
            let updates = new Set();
            for (let mutation of mutations) {
                if (mutation.type === Mutation.ATTRIBUTES && mutation.attributeName==="transform" ) {
                    let svgElement = SVGElement.elementOn(mutation.target);
                    let element = svgElement.owner;
                    if (element !== this) {
                        updates.add(element);
                    }
                }
            }
            let processed = new Set();
            let roots = new Set();
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
            Context.mutationObservers.disconnect(this);
            for (let pedestal of roots) {
                pedestal.refresh();
            }
            Context.mutationObservers.observe(this, action, this._content._node, config);
        };
        Context.mutationObservers.observe(this, action, this._content._node, config);
        return this._content;
    };

    superClass.prototype.level = function(index) {
        if (!this._levels[index]) {
            for (let idx = this._levels.length; idx<=index; idx++) {
                Memento.register(this);
                this._levels[idx] = new Group();
                this._content.add(this._levels[idx]);
            }
        }
        return this._levels[index];
    };

    superClass.prototype._pedestal = function(element, parent, zIndex) {
        let pedestal = this._pedestals.get(element);
        if (!pedestal) {
            pedestal = new Pedestal(element, parent, zIndex + 1, this);
            this._pedestals.set(element, pedestal);
        }
        return pedestal;
    };

    superClass.prototype._takeInElementContent = function(element, parent, zIndex) {
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
    };

    superClass.prototype._takeOutElementContent = function(element) {
        if (element.isSupport) {
            let pedestal = this._pedestals.get(element);
            if (pedestal) {
                let elements = pedestal.elements;
                for (let child of elements) {
                    element._remove(child);
                }
                pedestal._unproto(element);
                element.__proto__ = element.__proto__.__proto__;
                for (let child of elements) {
                    element._add(child);
                }
            }
        }
        else {
            let children = element.children;
            if (children && children.length>0) {
                for (let child of children) {
                    this._takeOutElementContent(child);
                }
            }
        }
    };

    superClass.prototype.__clear = function () {
        this._content.clear();
        this._levels.clear();
        this._pedestals.clear();
        this._rootPedestal.clear();
        this._pedestals.set(this, this._rootPedestal);
        this.level(0).add(this._rootPedestal._root);
    };

    let _add = superClass.prototype._add;
    superClass.prototype._add = function (element) {
        _add.call(this, element);
        this._takeInElementContent(element, this, 0);
    };

    let _insert = superClass.prototype._insert;
    superClass.prototype._insert = function (previous, element) {
        _insert.call(this, previous, element);
        this._takeInElementContent(element, this, 0);
    };

    let _replace = superClass.prototype._replace;
    superClass.prototype._replace = function (previous, element) {
        this._takeOutElementContent(previous);
        _replace.call(this, previous, element);
        this._takeInElementContent(element, this, 0);
    };

    let _remove = superClass.prototype._remove;
    superClass.prototype._remove = function (element) {
        this._takeOutElementContent(element);
        _remove.call(this, element);
    };

    superClass.prototype.__add = function (element) {
        this._rootPedestal.add(element);
    };

    superClass.prototype.__insert = function (previous, element) {
        this._rootPedestal.insert(previous, element);
    };

    superClass.prototype.__replace = function (previous, element) {
        this._rootPedestal.replace(previous, element);
    };

    superClass.prototype.__remove = function (element) {
        this._rootPedestal.remove(element);
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            function justLevel(level) {
                let pedestals = new List();
                for (let proot of level.children) {
                    let pedestal = proot.owner;
                    pedestals.push(pedestal);
                }
                return pedestals;
            }
            let memento = superMemento.call(this);
            memento._pedestals = new Map(this._pedestals.entries());
            memento._levels = new List();
            for (let level of this._levels) {
                memento._levels.push(justLevel(level));
            }
            Memento.register(this._rootPedestal);
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._pedestals = new Map(memento._pedestals.entries());
            let index=0;
            for (let level of memento._levels) {
                let rlevel = this._levels[index++];
                if (!rlevel) {
                    rlevel = new Group();
                    this._levels.push(rlevel);
                }
                for (let pedestal of level) {
                    rlevel.add(pedestal._root);
                }
                this._content.add(rlevel);
            }
            let config = {attributes: true, childList: true, subtree: true};
            return this;
        };
    }
}

export function makeZindexContainer(superClass) {
    makeContainer(superClass);
    makeContainerZindex(superClass);
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
            this._root.off(MouseEvents.CLICK, this._clickHdlImpl);
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

export function makeFramed(superClass) {

    makeShaped(superClass);

    superClass.prototype._initFrame = function(width, height, strokeColor, backgroundColor) {
        let background = new Rect(-width/2, -height/2, width, height);
        background.stroke = strokeColor;
        background.fill = backgroundColor;
        return this._initShape(background);
    };

    Object.defineProperty(superClass.prototype, "fill", {
        configurable:true,
        get: function () {
            return this.shape.fill;
        }
    });
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
}

export function makeSingleImaged(superClass) {

    makeImaged(superClass);

    superClass.prototype._initImage = function (width, height, strokeColor, backgroundURL) {
        return this._initBackground(width, height, strokeColor,
            new RasterImage(backgroundURL, -width / 2, -height / 2, width, height));
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
            this._images.add(new RasterImage(backgroundURL, -width / 2, -height / 2, width, height));
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

export function makePart(superClass) {

    superClass.prototype._initPart = function(owner) {
        this._owner = owner;
        return this;
    };

    if (!superClass.prototype.hasOwnProperty("selectable")) {
        Object.defineProperty(superClass.prototype, "selectable", {
            configurable:true,
            get() {
                return this.parent.selectable;
            }
        });
    }

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            memento._owner = this._owner;
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            this._owner = memento._owner;
            return this;
        };
    }

    Object.defineProperty(superClass.prototype, "menuOptions", {
        get: function () {
            let menuOptions = this._owner.menuOptions;
            if (menuOptions) {
                if (this._menuOptions) {
                    menuOptions.push(...this._menuOptions);
                }
                return menuOptions;
            }
            else {
                return this._menuOptions;
            }
        }
    });

}

export class BoardElement {

    constructor() {
        this._createStructure();
        this._id = createUUID();
    }

    _notified(source, type) {}

    _createStructure() {
        this._root = new Translation();
        this._root.that = this;
        this._root._id = "root";
        this._root._owner = this;
        this._parent = null;
    }

    _memento() {
        let memento = {};
        memento._parent = this._parent;
        memento.rootMatrix = this._root.matrix.clone();
        return memento;
    }

    _revert(memento) {
        this._parent = memento._parent;
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
        this._matrix = Matrix.translate(x, y);
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
        return {
            x:matrix.dx, y:matrix.dy,
            left:x1>x2?x2:x1, right:x1>x2?x1:x2,
            top:y1>y2?y2:y1, bottom:y1>y2?y1:y2
        };
    }

    get localGeometry() { return this._geometry(this.matrix); }
    get globalGeometry() { return this._geometry(this.global); }
    get lx() { return this.matrix.x(0, 0); }
    get ly() { return this.matrix.y(0, 0); }
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

export class BoardSupport extends BoardElement {

    constructor(...args) {
        super();
        this._root.add(this.initShape(...args)).add(this._initContent());
    }

}
makeSupport(BoardSupport);
makeDraggable(BoardSupport);
