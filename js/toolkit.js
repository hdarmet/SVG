'use strict';

import {
    assert
} from "./misc.js";
import {
    List, ESet
} from "./collections.js";
import {
    Matrix2D
} from "./geometry.js";
import {win, doc, dom,
    MouseEvents, KeyboardEvents, Buttons,
    Svg, Rect, Group, Translation, Fill, Colors, Visibility,
    localOffset, globalOffset, computePosition
} from "./graphics.js";
import {
    defineShadow
} from "./svgtools.js";
import {
    defineMethod, defineGetProperty
} from "./misc.js";
import {
    extendIfMethod
} from "./misc.js";

export const Context = {
    selectPredicate : null,
    readOnly : 0,
    freezed : 0,
    scale : 18000 / 1200,

    isReadOnly() {
        return this.readOnly;
    },
    _starters : new List(),
    addStarter(starter) {
        this._starters.add(starter);
    },
    start() {
        for (let starter of this._starters) {
            starter.call(this);
        }
    },
    _stoppers : new List(),
    addStopper(starter) {
        this._stoppers.add(starter);
    },
    stop() {
        for (let stopper of this.stoppers) {
            stopper.call(this);
        }
    }
};

export const Cloning = {
    DEEP:0, // Default value, used even if not defined :)
    SHALLOW:1,
    NONE:2,
    IGNORE:3
};

export function setRef(item, reference) {
    item._root.id = reference;
}

export function html(item) {
    return item._root.outerHTML;
}

export let computeGridStep = function() {
    let zoom = Canvas.instance.zoom;
    let unitValue = Context.scale / zoom;
    let step = unitValue * 10;
    let scale = 1;
    let gridSpec;
    while (true) {
        let ref = scale;
        if (step < scale) {
            gridSpec = {scale, step: scale / Context.scale, ref:ref*10, case:1};
            break;
        }
        scale *= 2.5;
        if (step < scale) {
            gridSpec = {scale, step: scale / Context.scale, ref:ref*10, case:2};
            break;
        }
        scale *= 2;
        if (step < scale) {
            gridSpec = {scale, step: scale / Context.scale, ref:ref*10, case:3};
            break;
        }
        scale *= 2;
    }
    if (gridSpec.ref<=10) {
        gridSpec.unitLabel = "mm";
        gridSpec.unitFactor = 10;
    }
    else if (gridSpec.ref<=1000) {
        gridSpec.unitLabel = "cm";
        gridSpec.unitFactor = 100;
    }
    else {
        gridSpec.unitLabel = "m";
        gridSpec.unitFactor = 1000;
    }
    return gridSpec;
};

export const Events = {
    ADD : "add",
    REMOVE : "remove",
    ADD_FLOATING : "add-floating",
    DISPLACE_FLOATING : "displace-floating",
    REMOVE_FLOATING : "remove-floating",
    ATTACH : "attach",
    DETACH : "detach",
    DELETED : "deleted",
    DISPLACE : "displace",
    DISPLACED : "displaced",
    SELECT : "select",
    UNSELECT : "unselect",
    ZOOM : "zoom",
    SCROLL : "scroll",
    HOVER : "hover",
    RESIZE : "resize",
    GEOMETRY : "geometry",
    MOVE : "move",
    MOVED : "moved",
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
    SCROLL_END : "scroll-end",
    ADD_DECORATION : "add-decoration",
    REMOVE_DECORATION : "remove-decoration",
    ADD_FOLLOWER : "add-follower",
    MOVE_FOLLOWER : "move-follower",
    REMOVE_FOLLOWER : "remove-follower",
    ADD_FOLLOWED : "add-followed",
    MOVE_FOLLOWED : "move-followed",
    REMOVE_FOLLOWED : "remove-followed",
    ADD_CARRIED : "add-carried",
    MOVE_CARRIED : "move-carried",
    REMOVE_CARRIED : "remove-carried",
    ADD_CARRIER : "add-carrier",
    MOVE_CARRIER : "move-carrier",
    REMOVE_CARRIER : "remove-carrier",
    ADD_GLUED : "add-glued",
    REMOVE_GLUED : "remove-glued"
};

export function sortByDistance(elements, gx, gy) {

    elements.sort(function(elem1, elem2) {
        function distance(elem, x, y) {
            let egx = elem.gx;
            let egy = elem.gy;
            return (egx - x) * (egx - x) + (egy - y) * (egy - y);
        }
        return distance(elem1, gx, gy) - distance(elem2, gx, gy);
    });

}

export function l2pBoundingBox(elements) {
    let result = null;
    for (let element of elements) {
        let box = element.l2pbbox();
        result = (result === null) ? box : result.add(box);
    }
    return result;
}

export function l2lBoundingBox(elements, targetMatrix) {
    let result = null;
    for (let element of elements) {
        let box = element.l2mbbox(targetMatrix);
        result = (result === null) ? box : result.add(box);
    }
    return result;
}

export function getCanvasLayer(artifact) {
    let parent = artifact.parent;
    while (parent) {
        if (parent._owner && parent._owner instanceof CanvasLayer) {
            return parent._owner;
        }
        parent = parent.parent;
    }
    return null;
}

export function getOwner(artifact) {
    let parent = artifact.parent;
    while (parent) {
        if (parent._owner) {
            return parent._owner;
        }
        parent = parent.parent;
    }
    return null;
}

/**
 * Extend the current selection by adding any element "associated" to already selected elements (for exemple,
 * element that are 'carried' or 'sticked' to the selected element.
 * @param elements core selection of element
 * @returns {Set} extended set of selected element
 */
export function getExtension(elements) {
    let extension = new ESet(elements);
    for (let element of elements) {
        if (element.getExtension) {
            for (let associatedElement of element.getExtension()) {
                extension.add(associatedElement);
            }
        }
    }
    return extension;
}

export function makeObservable(superClass, cloning=Cloning.DEEP) {

    defineMethod(superClass,
        function addObserver(observer) {
            Memento.register(this);
            this._addObserver(observer);
        }
    );

    defineMethod(superClass,
        function removeObserver(observer) {
            Memento.register(this);
            this._removeObserver(observer);
        }
    );

    defineMethod(superClass,
        function _addObserver(observer) {
            if (!this._observers) {
                this._observers = new ESet();
                this._observers.cloning = cloning;
            }
            this._observers.add(observer);
        }
    );

    defineMethod(superClass,
        function _removeObserver(observer) {
            if (this._observers) {
                this._observers.delete(observer);
                if (this._observers.size === 0) {
                    delete this._observers;
                }
            }
        }
    );

    defineMethod(superClass,
        function _fire(event, ...values) {
            if (this._observers) {
                for (let observer of this._observers) {
                    observer._notified(this, event, ...values);
                }
            }
        }
    );

    if (cloning===Cloning.NONE) {
        defineMethod(superClass,
            function _cloneObservers(duplicata) {
                if (this._observers) {
                    let copy = duplicata.get(this);
                    for (let observer of this._observers) {
                        let observerCopy = duplicata.get(observer);
                        if (observerCopy) {
                            copy._addObserver(observerCopy);
                        }
                    }
                }
            }
        );
    }

    extendIfMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            if (this._observers) {
                memento._observers = new ESet(this._observers);
            }
            return memento;
        }
    );

    extendIfMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            if (memento._observers) {
                this._observers = new ESet(memento._observers);
            }
            else {
                delete this._observers;
            }
            return this;
        }
    );

}

export function makeCloneable(superClass) {

    defineGetProperty(superClass,
        function cloneable() {
            return true;
        }
    );

}

export class CloneableObject {
    constructor(content)
    {
        if (content) {
            Object.assign(this, content);
        }
    }
}
makeCloneable(CloneableObject);

export function makeNotCloneable(superClass) {

    defineGetProperty(superClass,
        function notCloneable() {
            return true;
        }
    );

}

export class NotCloneableObject {
    constructor(content)
    {
        if (content) {
            Object.assign(this, content);
        }
    }
}
makeNotCloneable(NotCloneableObject);

export function makeSingleton(Clazz, create=true) {
    let instanceName = Clazz.name;
    instanceName = instanceName[0].toLowerCase()+instanceName.substring(1);
    if (create) Context[instanceName] = new Clazz();
    Object.defineProperty(Clazz, "instance", {
        configurable:true,
        get() {
            assert(Context[instanceName]);
            return Context[instanceName];
        },
        set(instance) {
            assert(!Context[instanceName]);
            Context[instanceName] = instance;
        }
    });
}

export class CanvasLayer {

    constructor(canvas, zIndex) {
        this._canvas = canvas;
        this._root = new Group();
        this._root._owner = this;
        this._root.z_index = zIndex;
        this._mutationsObserver = this._createMutationsObserver();
        Context.addStarter(()=>{
            Memento.instance.addBefore(()=>this.stopMutationsObserver());
            Memento.instance.addAfter(()=>this.restartMutationsObserver());
        });
        this.restartMutationsObserver();
        canvas.addObserver(this);
    }

    _processMutations(mutations) {
        this.stopMutationsObserver();
        this._adjustMutations(mutations);
        this.restartMutationsObserver();
    }

    _createMutationsObserver() {
        let config = { childList: true, attributes: true, characterData: true, subtree:true };
        return new MutationObserver((mutations)=>{
            this._processMutations((mutations)=this._processMutations(mutations));
        });
    }

    stopMutationsObserver() {
        this._mutationsObserver.disconnect();
    }

    restartMutationsObserver() {
        let config = { childList: true, attributes: true, characterData: true, subtree:true };
        this._mutationsObserver.observe(this._root._node, config);
    }

    _adjustMutations(mutations) {
        if (this._mutationsCallbacks) {
            for (let callback of this._mutationsCallbacks) {
                callback.call(this, mutations);
            }
        }
    }

    addMutationsCallback(callback) {
        if (!this._mutationsCallbacks) {
            this._mutationsCallbacks = new ESet();
        }
        this._mutationsCallbacks.add(callback);
        return this;
    }

    _notified(source, type, ...values) {
    }

    get zIndex() {
        return this._root.z_index;
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

    get clientWidth() {
        return this._canvas.clientWidth;
    }

    get clientHeight() {
        return this._canvas.clientHeight;
    }

    get matrix() {
        return this._root.matrix.clone();
    }

    set matrix(matrix) {
        this._root.matrix = matrix.clone();
    }

    get globalMatrix() {
        return this._root.globalMatrix.clone();
    }


    setZIndexes(element) {
        let zIndex = this._root.z_index;
        element.visit({element}, function(context) {
            if (this._root.z_index!==undefined) {
                this._root.z_index += zIndex;
            }
        });
    }

    unsetZIndexes(element) {
        let zIndex = this._root.z_index;
        element.visit({element}, function(context) {
            if (this._root.z_index !== undefined) {
                this._root.z_index -= zIndex;
            }
        });
    }

}
makeNotCloneable(CanvasLayer);

export class BaseLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas, BaseLayer.Z_INDEX);
    }

    _adjustGeometry(matrix = this._root.matrix) {
        if (this.width!==undefined && this.height!==undefined) {
            let scale = Math.max(
                this.clientWidth / this.width,
                this.clientHeight / this.height
            );
            if (scale > matrix.scalex) {
                matrix = Matrix2D.scale(scale, scale, 0, 0);
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
        let zoomMatrix = Matrix2D.scale(zoom/this.zoom, zoom/this.zoom, x, y);
        let newMatrix = this._root.matrix.multLeft(zoomMatrix);
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    zoomOut(x, y) {
        let zoom = this.zoom/BaseLayer.ZOOM_STEP;
        if (zoom<this.minZoom) zoom=this.minZoom;
        let zoomMatrix = Matrix2D.scale(this.zoom/zoom, this.zoom/zoom, x, y);
        let newMatrix = this._root.matrix.multLeft(zoomMatrix.invert());
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
    }

    zoomSet(scale, x, y) {
        let newMatrix = Matrix2D.scale(scale, scale, x, y);
        this._adjustGeometry(newMatrix);
        this._fire(Events.ZOOM, newMatrix.scalex, newMatrix.x, newMatrix.y);
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

    get contentSelectionMark() {
        return Selection.instance.selectFilter;
    }
}
BaseLayer.ZOOM_STEP = 1.2;
BaseLayer.ZOOM_MAX = 50;
BaseLayer.Z_INDEX = 0;

export class ToolsLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas, ToolsLayer.Z_INDEX);
    }

    putArtifact(artifact) {
        this._root.add(artifact);
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
ToolsLayer.Z_INDEX = 999;

let gpi = 0;

class GlassPedestal {

    constructor(glass, support) {
        this._id = gpi++;
        this._glass = glass;
        this._support = support;
        this._root = new Group();
        if (support._root.id) this._root.id = support._root.id;
        this._elementPedestals = new Map();
        this._initContent();
    }

    _addPedestal(pedestal) {
        this._root.add(pedestal._root);
        pedestal._root.matrix = pedestal._support._root.globalMatrix.multLeft(this._root.globalMatrix.invert());
    }

    get support() {
        return this._support;
    }

    _initContent() {
        this._content = new Group();
        this._root.add(this._content);
    }

    has(element) {
        return !!this._elementPedestals.get(element);
    }

    get empty() {
        return this._elementPedestals.size === 0;
    }

    get elements() {
        return new List(...this._elementPedestals.keys());
    }

    putElement(element, x, y) {
        let zoom = Canvas.instance.zoom;
        let ematrix = this._root.globalMatrix;
        let dmatrix = ematrix.multLeft(this._root.globalMatrix.invert());
        let pedestal = new Group(dmatrix);
        this._elementPedestals.set(element, pedestal);
        this.putArtifact(pedestal, element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        element.rotate && element.rotate(element.globalAngle+invertedMatrix.angle);
        if (element.parent) {
            element.detach();
        }
        pedestal.add(element._root);
        let fx = x-element._drag.drag.x*zoom;
        let fy = y-element._drag.drag.y*zoom;
        let dX = invertedMatrix.x(fx, fy);
        let dY = invertedMatrix.y(fx, fy);
        element._setLocation(dX, dY);
        this._glass.setZIndexes(element);
    }

    moveElement(element, x, y) {
        let zoom = Canvas.instance.zoom;
        let pedestal = this._elementPedestals.get(element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        let fx = x-element._drag.drag.x*zoom;
        let fy = y-element._drag.drag.y*zoom;
        let dX = invertedMatrix.x(fx, fy);
        let dY = invertedMatrix.y(fx, fy);
        element._setLocation(dX, dY);
    }

    removeElement(element) {
        let pedestal = this._elementPedestals.get(element);
        let invertedMatrix = pedestal.globalMatrix.invert();
        element.rotate && element.rotate(element.globalAngle);
        this._elementPedestals.delete(element);
        this.removeArtifact(pedestal, element);
        this._glass.unsetZIndexes(element);
    }

    putArtifact(artifact, element) {
        this._content.add(artifact);
    }

    removeArtifact(artifact, element) {
        this._content.remove(artifact);
    }

}

export function makeMultiLayeredGlass(superClass, {layers}) {

    let defaultLayer = layers[0];

    superClass.prototype._initContent = function() {
        this._content = new Group();
        this._layers = {};
        for (let layer of layers) {
            this._layers[layer] = new Group();
            this._content.add(this._layers[layer]);
        }
        this._root.add(this._content);
    };

    superClass.prototype._getLayer = function (element) {
        let layer = element.getLayer && element.getLayer(this);
        if (!layer) layer = defaultLayer;
        if (!this._layers[layer]) layer = defaultLayer;
        return layer;
    };

    superClass.prototype._addPedestal = function(pedestal) {
        let layer = this._getLayer(pedestal._support);
        this._layers[layer].add(pedestal._root);
        pedestal._root.matrix = pedestal._support._root.globalMatrix.multLeft(this._root.globalMatrix.invert());
    };

    superClass.prototype.putArtifact = function(artifact, element) {
        let layer = this._getLayer(element);
        this._layers[layer].add(artifact);
    };

    superClass.prototype.removeArtifact = function(artifact, element) {
        let layer = this._getLayer(element);
        this._layers[layer].remove(artifact);
    };

}

export class GlassLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas, GlassLayer.Z_INDEX);
        this._initContent();
        this._elements = new Map();
        this._pedestals = new Map();
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

    hide() {
        //this._root.visibility = Visibility.HIDDEN;
        this._root.remove(this._content);
        return true;
    }

    show() {
        //this._root.visibility = null;
        this._root.add(this._content);
        return true;
    }

    _getPedestal(support) {
        function getGlassStrategy(support) {
            while(support) {
                let strategy = support.glassStrategy;
                if (strategy) return strategy;
                support = support.parent;
            }
            return null;
        }

        if (!support || !support.canvasLayer || !(support.canvasLayer instanceof BaseLayer)) {
            support = this._canvas._baseLayer;
        }
        let pedestal = this._pedestals.get(support);
        if (!pedestal) {
            let pedestalClass = getGlassStrategy(support);
            if (!pedestalClass) pedestalClass = GlassPedestal;
            pedestal = new pedestalClass(this, support);
            this._pedestals.set(support, pedestal);
            let parentSupport = support.support;
            let parentPedestal = parentSupport ? this._getPedestal(parentSupport) : null;
            if (parentPedestal) {
                parentPedestal._addPedestal(pedestal);
            }
            else {
                this._content.add(pedestal._root);
                pedestal._root.matrix = support._root.globalMatrix.multLeft(this._root.globalMatrix.invert());
            }
        }
        return pedestal;
    }

    getSupport(element) {
        let pedestal = this._elements.get(element);
        return pedestal ? pedestal.support : null;
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

    updateSelectionMark(element) {
        // All the times, I presume... but... if one day...
        if (Selection.instance.selected(element)) {
            Selection.instance._setSelectionMark(element, Selection.instance.selectFilter);
        }
    }

    putElement(element, support, x, y) {
        let supportPedestal = this._getPedestal(support);
        let elementPedestal = this._elements.get(element);
        assert(!elementPedestal);
        supportPedestal.putElement(element, x, y);
        this._elements.set(element, supportPedestal);
        this.updateSelectionMark(element);
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
GlassLayer.Z_INDEX = 1000;

export function setGlassStrategy(superClass, {glassStrategy}) {

    Object.defineProperty(superClass.prototype, "glassStrategy", {
        configurable: true,
        enumerable: false,
        get: function () {
            return glassStrategy;
        }
    });

}

export function setLayeredGlassStrategy(superClass, {layers}) {

    let glassStrategy = class extends GlassPedestal {
        constructor(glass, support, ...args) {super(glass, support, ...args);}
    };
    makeMultiLayeredGlass(glassStrategy, {layers});
    setGlassStrategy(superClass, {glassStrategy});

}

export class ModalsLayer extends CanvasLayer {

    constructor(canvas) {
        super(canvas, ModalsLayer.Z_INDEX);
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

    _notified(source, event, ...values) {
        if (source === this._canvas && event === Events.GEOMETRY) {
            this._curtain.x = -this._canvas.width/2;
            this._curtain.y = -this._canvas.height/2;
            this._curtain.width = this._canvas.width;
            this._curtain.height = this._canvas.height;
        }
    }

    get modalOpened() {
        return this._modalOpened;
    }

}
ModalsLayer.Z_INDEX = 999;

export class Anchor {
    constructor() {
        this._listeners = new List();
        this._events = new List();
    }

    attach(svg, anchor) {
        this._anchor = doc.querySelector(anchor);
        dom.addEventListener(this._anchor, MouseEvents.MOUSE_UP, event=>{
            this._anchor.focus();
        });
        dom.addEventListener(this._anchor, MouseEvents.CONTEXT_MENU, function(event) {
            event.preventDefault();
            return false;
        });
        for (let listener of this._listeners) {
            dom.addEventListener(this._anchor, listener.type, listener.handler);
        }
        for (let event of this._events) {
            this._anchor.dispatchEvent(event);
        }
        svg.attach(this._anchor);
    }

    addEventListener(type, handler) {
        if (this._anchor) {
            dom.addEventListener(this._anchor, type, handler);
        }
        else {
            this._listeners.add({type, handler});
        }
        return this;
    }

    removeEventListener(type, handler) {
        if (this._anchor) {
            this._anchor.removeEventListener(type, handler);
        }
        else {
            this._listeners = this._listeners.filter(listener=>listener.type!==type && listener.handler!==handler);
        }
        return this;
    }

    dispatchEvent(event) {
        if (this._anchor) {
            this._anchor.dispatchEvent(event);
        }
        else {
            this._events.add(event);
        }
        return this;
    }

}

makeSingleton(Anchor);

export class Canvas {

    constructor(anchor, widthOrStyle, height) {
        this._root = new Svg();
        if (typeof(widthOrStyle)==="string") {
            this._root.style=widthOrStyle;
        }
        else {
            this._root.width = widthOrStyle;
            this._root.height = height;
        }
        Anchor.instance.attach(this._root, anchor);
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
        this.highlightFilter = defineShadow("_highlight_", Colors.RED, 1);
        this._root.addDef(this.highlightFilter);
    }

    _adjustContent(x=0, y=0) {
        this._content.matrix = Matrix2D.translate(this.width/2+x, this.height/2+y);
    }

    createBaseLayer() {
        let layer = new BaseLayer(this);
        this.add(layer);
        return layer;
    }

    get baseLayer() {
        return this._baseLayer;
    }

    createToolsLayer() {
        let layer = new ToolsLayer(this);
        this.add(layer);
        return layer;
    }

    get toolsLayer() {
        return this._toolsLayer;
    }

    createGlassLayer() {
        let layer = new GlassLayer(this);
        this.add(layer);
        return layer;
    }

    get glassLayer() {
        return this._glassLayer;
    }

    createModalsLayer() {
        let layer = new ModalsLayer(this);
        this.add(layer);
        return layer;
    }

    get modalsLayer() {
        return this._modalsLayer;
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
        this.width = this.clientWidth;
        this.height = this.clientHeight;
        this._fire(Events.GEOMETRY, this.width, this.height, this.clientWidth, this.clientHeight);
        win.setInterval(() => {
            if (
                this.width !== this.clientWidth ||
                this.height !== this.clientHeight
            ) {
                this.width = this.clientWidth;
                this.height = this.clientHeight;
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
    getGlassSupport(element) { return this._glassLayer.getSupport(element); }
    getHoveredElements(support) { return this._glassLayer.getHoveredElements(support); }

    // Modal layer
    openPopup(onOpen, data, onValidate, onCancel) { this._modalsLayer.openPopup(onOpen, data, onValidate, onCancel); }
    openModal(onOpen, data, onValidate, onCancel) { this._modalsLayer.openModal(onOpen, data, onValidate, onCancel); }
    get modalOpened() { return this._modalsLayer.modalOpened; }
}
makeNotCloneable(Canvas);
makeObservable(Canvas);
makeSingleton(Canvas, false);

export class MutationObservers {
    constructor() {
        this._mutations = new Map();
        Context.addStarter(()=>{
            Memento.instance.addBefore(()=>MutationObservers.instance.stop());
            Memento.instance.addAfter(()=>MutationObservers.instance.restart());
        });
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
makeSingleton(MutationObservers);

export class CopyPaste {

    constructor() {
        this._models = new List();
        this._keyboardCommands();
    }

    _keyboardCommands() {
        Anchor.instance.addEventListener(KeyboardEvents.KEY_UP, event => {
            if (!Context.freezed) {
                if (event.ctrlKey || event.metaKey) {
                    if (event.key === "c") {
                        this.copyModel(getExtension(Selection.instance.selection()));
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

        let result = new ESet();
        if (elements.size > 0) {
            let { cx, cy } = center();
            let duplicata = new Map();
            for (let element of elements) {
                if (element._parent) {
                    duplicata.set(element._parent, undefined);
                }
            }
            this._duplicate(elements, duplicata);
            for (let element of elements) {
                let copy = duplicata.get(element);
                let { x, y } = computePosition(element._root, element.canvasLayer._root);
                copy._setLocation(x - cx, y - cy);
                result.add(copy);
            }
        }
        return result;
    }

    _duplicate(elements, duplicata) {
        let result = new List();
        for (let element of elements) {
            let copy = duplicata.get(element);
            if (!copy) {
                copy = element.clone(duplicata);
                result.add(copy);
                duplicata.set(element, copy);
            }
            Selection.instance._unsetSelectionMark(copy);
        }
        for (let entry of duplicata.entries()) {
            let [that, thatCopy] = entry;
            if (thatCopy && that._cloned) {
                that._cloned(thatCopy, duplicata);
            }
        }
        this._fire(CopyPaste.events.DUPLICATE, result);
        return result;
    }

    copyModel(elements) {
        if (elements.size > 0) {
            this._models = this.duplicateForCopy(elements);
            this._fire(CopyPaste.events.COPY_MODEL);
        }
    }

    duplicateElement(element) {
        let result = this.duplicateForCopy(new List(element));
        return result.pick();
    }

    duplicateForPaste(elements) {
        let pasted = new ESet();
        let duplicata = new Map();
        this._duplicate(elements, duplicata);
        for (let element of elements) {
            let copy = duplicata.get(element);
            copy._setLocation(element.lx, element.ly);
            pasted.add(copy);
        }
        return pasted;
    }

    pasteModel() {
        Memento.instance.open();
        let pasted = this.duplicateForPaste(this._models);
        Selection.instance.selectOnly(...pasted);
        let matrix = Canvas.instance.baseGlobalMatrix.invert();
        let cx = Canvas.instance.clientWidth / 2;
        let cy = Canvas.instance.clientHeight / 2;
        let vx = matrix.x(cx, cy);
        let vy = matrix.y(cx, cy);
        for (let copy of pasted) {
            copy.setLocation(copy.lx + vx, copy.ly + vy);
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

        function cloneList(source) {
            let copy;
            if (!source.cloning) {
                copy = new List();
                duplicata.set(source, copy);
                for (let record of source) {
                    copy.add(cloneRecord(record, duplicata));
                }
            }
            else if (source.cloning===Cloning.SHALLOW) {
                copy = new List(...source);
                duplicata.set(source, copy);
            }
            else {
                copy = new List();
                duplicata.set(source, copy);
            }
            if (source.cloning!==undefined) copy.cloning=source.cloning;
            return copy;
        }

        function cloneArray(source) {
            let copy;
            if (!source.cloning) {
                copy = [];
                duplicata.set(source, copy);
                for (let record of source) {
                    copy.push(cloneRecord(record, duplicata));
                }
            }
            else if (source.cloning===Cloning.SHALLOW) {
                copy = [...source];
                duplicata.set(source, copy);
            }
            else {
                copy = [];
                duplicata.set(source, copy);
            }
            if (source.cloning!==undefined) copy.cloning=source.cloning;
            return copy;
        }

        function cloneSet(source) {
            let copy;
            if (!source.cloning) {
                copy = new ESet();
                duplicata.set(source, copy);
                for (let record of source) {
                    copy.add(cloneRecord(record, duplicata));
                }
            }
            else if (source.cloning===Cloning.SHALLOW) {
                copy = new ESet(source);
                duplicata.set(source, copy);
            }
            else {
                copy = new ESet();
                duplicata.set(source, copy);
            }
            if (source.cloning!==undefined) copy.cloning=source.cloning;
            return copy;
        }

        function cloneMap(source) {
            let copy;
            if (!source.cloning) {
                copy = new Map();
                duplicata.set(source, copy);
                for (let entry of source.entries()) {
                    copy.set(cloneRecord(entry[0], duplicata), cloneRecord(entry[1], duplicata));
                }
            }
            else if (source.cloning===Cloning.SHALLOW) {
                copy = new Map(source);
                duplicata.set(source, copy);
            }
            else {
                copy = new Map();
                duplicata.set(source, copy);
            }
            if (source.cloning!==undefined) copy.cloning=source.cloning;
            return copy;
        }

        if (source.cloning === Cloning.IGNORE) return null;
        if (duplicata.has(source)) return duplicata.get(source);
        if (source.notCloneable) {
            return source;
        }
        else if (source.cloneable) {
            return CopyPaste.clone(source, duplicata);
        }
        else if (source.clone) {
            let copy = source.clone(duplicata);
            duplicata.set(source, copy);
            return copy;
        }
        else if (source instanceof List) {
            return cloneList(source, duplicata);
        }
        else if (source instanceof Array) {
            return cloneArray(source, duplicata);
        }
        else if (source instanceof Set) {
            return cloneSet(source, duplicata);
        }
        else if (source instanceof Map) {
            return cloneMap(source, duplicata);
        }
        else {
            throw source+" is not cloneable."
        }
    }

    if (source === null || source === undefined || source.cloning === Cloning.IGNORE) return null;
    if (duplicata.has(source)) return duplicata.get(source);
    let copy = {};
    duplicata.set(source, copy);
    copy.__proto__ = source.__proto__;
    while(copy.__proto__.__pass__) {
        copy.__proto__ = copy.__proto__.__proto__;
    }
    if (source.cloning != Cloning.NONE) {
        for (let property in source) {
            if (source.hasOwnProperty(property)) {
                if (!source.cloning && source[property] && typeof(source[property]) === 'object') {
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
makeSingleton(CopyPaste);

CopyPaste.events = {
    DUPLICATE : "duplicate",
    COPY_MODEL : "copy-model",
    PASTE_MODEL : "paste-model"
};

export class Memento {

    constructor() {
        this.opened = false;
        this._undoTrx = new List();
        this._undoTrx.push(new Map());
        this._redoTrx = new List();
        this._before = new List();
        this._after = new List();
        this._finalizer = new List();
        this._keyboardCommands();
    }

    addBefore(beforeFunction) {
        this._before.add(beforeFunction);
    }

    addAfter(afterFunction) {
        this._before.add(afterFunction);
    }

    addFinalizer(afterFunction) {
        this._before.add(afterFunction);
    }

    _keyboardCommands() {
        Anchor.instance.addEventListener(KeyboardEvents.KEY_UP, event => {
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

    _rollback(trx) {
        this.opened = false;
        for (let before of this._before) {
            before();
        }
        let inverse = new Map();
        for (let element of trx.keys()) {
            inverse.set(element, this.__memento(element));
        }
        for (let element of trx.keys()) {
            this.__revert(element, trx.get(element));
        }
        for (let element of trx.keys()) {
            element._recover && element._recover(trx.get(element));
        }
        for (let finalizer of this._finalizer) {
            finalizer();
        }
        for (let after of this._before) {
            after();
        }
        this.opened = true;
        return inverse;
    }

    undo() {
        if (!Context.isReadOnly()) {
            let current = this._undoTrx.pop();
            if (current.size === 0) {
                current = this._undoTrx.pop();
            }
            if (current) {
                let redo = this._rollback(current);
                this._redoTrx.push(redo);
                this._fire(Memento.events.UNDO);
            }
            this._undoTrx.push(new Map());
        }
        return this;
    }

    redo() {
        if (!Context.isReadOnly()) {
            let current = this._redoTrx.pop();
            if (current) {
                let undo = this._rollback(current);
                if (this._current().size === 0) {
                    this._undoTrx.pop();
                }
                this._undoTrx.push(undo);
                this._fire(Memento.events.REDO);
            }
        }
        return this;
    }

    cancel() {
        if (!Context.isReadOnly()) {
            let current = this._undoTrx.pop();
            if (current.size === 0) {
                current = this._undoTrx.pop();
            }
            if (current) {
                this._rollback(current);
                this._fire(Memento.events.UNDO);
            }
            this._undoTrx.push(new Map());
        }
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
makeSingleton(Memento);

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
        Memento.instance.keep(element);
    }
};

export function baseSelectionPredicate(element) {
    let layer = element.canvasLayer;
    return layer && layer instanceof BaseLayer;
}

export function glassSelectionPredicate(element) {
    let layer = element.canvasLayer;
    return layer && layer instanceof GlassLayer;
}
Context.selectPredicate = baseSelectionPredicate;

export function onCanvasLayer(canvasLayer) {
    return function(element) {
        return element.canvasLayer === canvasLayer;
    }
}

export class Selection {

    constructor() {
        this._selection = new ESet();
        Canvas.instance.addObserver(this);
    }

    get selectFilter() {
        if (!this._selectFilter) {
            this.selectFilter = defineShadow("_select_", Colors.RED);
        }
        return this._selectFilter;
    }

    set selectFilter(filter) {
        this._selectFilter = filter;
        Canvas.instance.addFilter(filter);
    }

    _notified(source, event, value) {
        if (event === Events.ZOOM) {
            let zoom = Canvas.instance.zoom;
            this.selectFilter.feDropShadow.stdDeviation = [5/zoom, 5/zoom];
        }
    }

    selected(element) {
        return this._selection.has(element);
    }

    selectOnly(...elements) {
        this.unselectAll(onCanvasLayer(Canvas.instance.baseLayer));
        let result = false;
        for (let element of elements) {
            if (this.select(element)) {
                result = true;
            }
        }
        return result;
    }

    selectionMark(element) {
        if (element.selectionMark !== undefined) return element.selectionMark;
        while (element) {
            let selectionMark = element.contentSelectionMark;
            if (selectionMark!==undefined) return selectionMark;
            element = element.support;
        }
        return null;
    }

    /**
     * Changes selection mark in an authoritarian way (used when element comes in glass for example).
     * @param element element to update.
     * @param selectFilter selection mark to set.
     */
    _setSelectionMark(element, selectFilter) {
        element.selectFrame && (element.selectFrame.filter = this.selectionMark(element));
    }

    _select(element) {
        if (!this._selection.has(element)) {
            this._selection.add(element);
            this._setSelectionMark(element);
            element.select && element.select();
            this._fire(Events.SELECT, element);
        }
        return true;
    }

    select(element) {
        let selectable = element.selectable;
        if (selectable) {
            return this._select(selectable);
        }
        return false;
    }

    _unsetSelectionMark(element) {
        element.selectFrame && (element.selectFrame.filter = null);
    }

    _unselect(element) {
        if (this._selection.has(element)) {
            this._selection.delete(element);
            element.unselect && element.unselect();
            this._unsetSelectionMark(element);
            this._fire(Events.UNSELECT, element);
        }
        return true;
    }

    unselect(element) {
        let selectable = element.selectable;
        if (selectable) {
            return this._unselect(selectable);
        }
        return false;
    }

    unselectAll(predicate=onCanvasLayer(Canvas.instance.baseLayer)) {
        assert(predicate);
        for (let element of [...this._selection]) {
            if (predicate(element)) {
                this._unselect(element);
            }
        }
    }

    selection(predicate=Context.selectPredicate) {
        return new ESet([...this._selection].filter(predicate));
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
        else {
            if (unselectAllowed) {
                this.unselectAll(onCanvasLayer(element.canvasLayer));
            }
        }
    }

}
makeObservable(Selection);
makeNotCloneable(Selection);
makeSingleton(Selection, false);

export class ElementGroup {
    constructor(elements) {
        this._content = new ESet();
        for (let element of elements.values()) {
            this._content.add(element);
            assert(element.groupable);
            element.group = this;
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

    dismiss() {
        for (let part of this._content) {
            Selection.instance._elements.delete(part);
        }
        for (let part of this._content) {
            if (part instanceof ElementGroup) {
                Selection.instance._registerGroup(part);
            }
        }
    }

    clone(duplicata) {
        let copy = CopyPaste.clone(this, duplicata);
        if (!copy._group) {
            Selection.instance._registerGroup(copy);
        }
        return copy;
    }
}

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
        let content = new ESet();
        let elements = this.selection();
        element && elements.add(element);
        for (let element of elements) {
            let group = this.getGroup(element);
            if (!group) {
                content.add(element);
            } else {
                content.add(group);
                this._elements.delete(element);
            }
            if (!this.selected(element)) {
                this.select(element);
            }
        }
        let group = new ElementGroup(content);
        this._registerGroup(group);
    }

    ungroup(element) {
        Memento.register(this);
        let elements = this.selection();
        element && elements.add(element);
        let result = this._groupSet(elements);
        for (let group of result) {
            if (group instanceof ElementGroup) {
                group.dismiss();
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
        let group = this.getGroup(element);
        if (group) {
            for (let part of group.elements()) {
                super.unselect(part);
            }
        } else {
            super.unselect(element);
        }
    }

    _groupSet(elements) {
        let result = new ESet();
        for (let element of elements) {
            let group = this._elements.get(element);
            if (!group) {
                if (!element.groupable) return null;
                result.add(element);
            } else {
                result.add(group);
            }
        }
        return result;
    }

    groupSelection(predicate=Context.selectPredicate) {
        let result = this._groupSet(this.selection(predicate));
        return result ? [] : [...result.values()];
    }

    groupable(element, predicate=Context.selectPredicate) {
        let elements = this.selection(predicate);
        element && elements.add(element);
        let result = this._groupSet(elements);
        return result && result.size>1;
    }

    ungroupable(element, predicate=Context.selectPredicate) {
        let elements = this.selection(predicate);
        element && elements.add(element);
        let result = this._groupSet(elements);
        if (!result || result.size===0) return false;
        for (let element of result) {
            if (!(element instanceof ElementGroup)) {
                return false;
            }
        }
        return true;
    }

}
makeNotCloneable(Groups);

export class Layer {

    constructor(title, checked, action) {
        this._title = title;
        this._checked = checked;
        this._action = action;
    }

    get title() {
        return this._title;
    }

    get checked() {
        return this._checked;
    }

    get action() {
        return function(checked=this.checked, elements) {
            this._action(checked, elements);
            this._checked = checked;
            Layers.instance._fire(Layers.events.ACTIVATE, this);
        }.bind(this);
    }

}

export class Layers {

    constructor() {
        this._layers = new List();
        CopyPaste.instance.addObserver(this);
    }

    addLayer(layer) {
        this._layers.add(layer);
        return this;
    }

    get layers() {
        return this._layers;
    }

    update(elements) {
        for (let layer of this.layers) {
            layer.action(layer.checked, elements);
        }
        return this;
    }

    _notified(source, event, elements) {
        if (source===CopyPaste.instance && event===CopyPaste.events.DUPLICATE) {
            this.update(elements);
        }
    }
}
makeObservable(Layers);
makeNotCloneable(Layers);
makeSingleton(Layers);
Layers.events = {
    ACTIVATE : "activate"
};