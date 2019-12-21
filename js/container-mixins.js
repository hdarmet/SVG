import {
    assert, defineGetProperty, defineMethod, extendMethod, proposeGetProperty, replaceGetProperty, proposeMethod,
    replaceMethod
} from "./misc.js";
import {
    Cloning, Events, Memento, makeCloneable, MutationObservers, CloneableObject
} from "./toolkit.js";
import {
    Group
} from "./graphics.js";
import {
    makeGentleDropTarget
} from "./core-mixins.js";
import {
    ESet, List
} from "./collections.js";

export function makePartsOwner(superClass) {

    if (!superClass.prototype._initParts) {

        extendMethod(superClass, $init=>
            function _init(...args) {
                $init.call(this, ...args);
                this._partsSupport = this._initParts();
                this._addPartsToTray();
            }
        );

        defineMethod(superClass,
            function _addPartsToTray() {
                let next = this._decorationsSupport || this._content || this._floatingContent;
                next ? this._tray.insert(next, this._partsSupport) : this._tray.add(this._partsSupport);
            }
        );

        defineMethod(superClass,
            function _initParts() {
                let partsSupport = new Group();
                partsSupport.cloning = Cloning.NONE;
                return partsSupport;
            }
        );

        extendMethod(superClass, $finalize=>
            function finalize() {
                $finalize.call(this);
                if (this._parts) {
                    for (let child of this._parts) {
                        child.finalize();
                    }
                }
            }
        );

        defineMethod(superClass,
            function _addPart(element) {
                if (!this._parts) {
                    this._parts = new List();
                    this._parts.cloning = Cloning.NONE;
                }
                // IMPORTANT : DOM update before this._children update !
                this._partsSupport.add(element._root);
                this._parts.add(element);
                element._parent = this;
            }
        );

        defineGetProperty(superClass,
            function parts() {
                return this._parts ? new List(...this._parts) : new List();
            }
        );

        extendMethod(superClass, $cloning=>
            function _cloning(duplicata) {
                let copy = $cloning.call(this, duplicata);
                for (let child of this.parts) {
                    copy._addPart(child.duplicate(duplicata));
                }
                return copy;
            }
        );

        defineGetProperty(superClass,
            function hasParts() {
                return true;
            }
        );

        extendMethod(superClass, $accept=>
            function accept(visitor) {
                $accept.call(this, visitor);
                for (let child of this.parts) {
                    visitor.visit(child);
                }
                return this;
            }
        );
    }

}

export function makePart(superClass) {

    defineGetProperty(superClass,
        function owner() {
            let parent = this.parent;
            if (parent) {
                let owner = parent.owner;
                return owner ? owner : parent;
            }
            return null;
        }
    );

    replaceGetProperty(superClass,
        function selectable() {
            return this.owner.selectable;
        }
    );

    defineGetProperty(superClass,
        function menuOptions () {
            let ownerMenuOptions = this.owner.menuOptions;
            if (ownerMenuOptions) {
                if (this._menuOptions) {
                    return new List(...ownerMenuOptions, ...this._getOwnMenuOptions());
                }
                return ownerMenuOptions;
            }
            else {
                return this._getOwnMenuOptions();
            }
        }
    );


    if (!superClass.prototype._acceptDrop) {
        makeGentleDropTarget(superClass);
    }

    proposeGetProperty(superClass,
        function isPart() {
            return true;
        }
    );

}

export function makeContainer(superClass) {

    assert(!superClass.prototype._initContent);

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._content = this._initContent();
            this._addContentToTray();
        }
    );

    defineMethod(superClass,
        function _addContentToTray() {
            let next = this._floatingContent;
            next ? this._tray.insert(next, this._content) : this._tray.add(this._content);
        }
    );

    defineMethod(superClass,
        function _initContent() {
            let content = new Group();
            content.cloning = Cloning.NONE;
            return content;
        }
    );

    extendMethod(superClass, $finalize=>
        function finalize() {
            finalize.call(this);
            if (this._children) {
                for (let child of this._children) {
                    child.finalize();
                }
            }
        }
    );

    defineMethod(superClass,
        function __clearChildren() {
            this._content.clear()
        }
    );

    defineMethod(superClass,
        function __addChild(element) {
            this._content.add(element._root);
        }
    );

    defineMethod(superClass,
        function __insertChild(previous, element) {
            this._content.insert(previous._root, element._root);
        }
    );

    defineMethod(superClass,
        function __replaceChild(previous, element) {
            this._content.replace(previous._root, element._root);
        }
    );

    defineMethod(superClass,
        function __removeChild(element) {
            this._content.remove(element._root);
        }
    );

    defineMethod(superClass,
        function _addChild(element) {
            if (!this._children) {
                this._children = new List();
                this._children.cloning = Cloning.NONE;
            }
            // IMPORTANT : DOM update before this._children update !
            this.__addChild(element);
            this._children.add(element);
            element._parent = this;
        }
    );

    defineMethod(superClass,
        function addChild(element) {
            if (element.parent !== this) {
                if (element.parent) {
                    element.detach();
                }
                Memento.register(this);
                Memento.register(element);
                this._addChild(element);
                this._fire(Events.ADD, element);
                element._fire(Events.ATTACH, this);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _insertChild(previous, element) {
            if (this._children) {
                this.__insertChild(previous, element);
                // IMPORTANT : DOM update before this._children update !
                this._children.insert(previous, element);
                element._parent = this;
            }
        }
    );

    defineMethod(superClass,
        function insertChild(previous, element) {
            if (previous.parent === this) {
                let added = false;
                if (element.parent && element.parent !== this) {
                    element.detach();
                    added = true;
                }
                Memento.register(this);
                Memento.register(element);
                this._insertChild(previous, element);
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
        }
    );

    defineMethod(superClass,
        function _replaceChild(previous, element) {
            if (!this._children) {
                this._children = new List();
            }
            // IMPORTANT : DOM update before this._children update !
            this.__replaceChild(previous, element);
            this._children.replace(previous, element);
            previous._parent = null;
            element._parent = this;
        }
    );

    defineMethod(superClass,
        function replaceChild(previous, element) {
            if (previous.parent === this) {
                let added = false;
                if (element.parent && element.parent !== this) {
                    element.detach();
                    added = true;
                }
                Memento.register(this);
                Memento.register(previous);
                Memento.register(element);
                this._replaceChild(previous, element);
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
        }
    );

    defineMethod(superClass,
        function _removeChild(element) {
            if (this._children) {
                // IMPORTANT : DOM update before this._children update !
                this.__removeChild(element);
                this._children.remove(element);
                element._parent = null;
                if (this._children.size === 0) {
                    delete this._children;
                }
            }
        }
    );

    defineMethod(superClass,
        function removeChild(element) {
            if (element.parent === this) {
                Memento.register(this);
                Memento.register(element);
                this._removeChild(element);
                this._fire(Events.REMOVE, element);
                element._fire(Events.DETACH, this);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _clearChildren(element) {
            if (this._children) {
                // IMPORTANT : DOM update before this._children update !
                this.__clearChildren();
                for (let element of this._children) {
                    element._parent = null;
                }
                delete this._children;
            }
        }
    );

    defineMethod(superClass,
        function clearChildren() {
            if (this._children) {
                Memento.register(this);
                let children = this._children;
                for (let element of children) {
                    Memento.register(element);
                }
                this._clearChildren();
                for (let element of children) {
                    this._fire(Events.REMOVE, element);
                    element._fire(Events.DETACH, this);
                }
            }
            return this;
        }
    );

    extendMethod(superClass, $detachChild=>
        function detachChild(element) {
            if ($detachChild && $detachChild.call(this, element)) return true;
            if (!this.containsChild(element)) return false;
            this.removeChild(element);
            return true;
        }
    );

    defineMethod(superClass,
        function _shiftChild(element, x, y) {
        }
    );

    extendMethod(superClass, $shift=>
        function _shift(element, x, y) {
            if ($shift && $shift.call(this, element, x, y)) return true;
            if (!this.containsChild(element)) return false;
            this._shiftChild(element, x, y);
            return true;
        }
    );

    defineMethod(superClass,
        function containsChild(element) {
            return this._children && this._children.contains(element);
        }
    );

    defineGetProperty(superClass,
        function content() {
            return this._content;
        }
    );

    defineGetProperty(superClass,
        function children() {
            return this._children ? new List(...this._children) : new List();
        }
    );

    defineMethod(superClass,
        function _memorizeContent(memento) {
            if (this._children) {
                memento._children = new List(...this._children);
            }
        }
    );

    defineMethod(superClass,
        function _revertContent(memento) {
            this.__clearChildren();
            if (memento._children) {
                this._children = new List(...memento._children);
                for (let child of this._children) {
                    this.__addChild(child);
                }
            }
            else {
                delete this._children;
            }
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            this._memorizeContent(memento);
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._revertContent(memento);
            return this;
        }
    );

    extendMethod(superClass, $cloning=>
        function _cloning(duplicata) {
            let copy = $cloning.call(this, duplicata);
            for (let child of this.children) {
                copy._addChild(child.duplicate(duplicata));
            }
            return copy;
        }
    );

    defineGetProperty(superClass,
        function isContainer() {
            return true;
        }
    );

    extendMethod(superClass, $accept=>
        function accept(visitor) {
            $accept.call(this, visitor);
            for (let child of this.children) {
                visitor.visit(child);
            }
            return this;
        }
    );

}

export function makeFloatingContainer(superClass) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._floatingContent = this._initFloatingContent();
            this._addFloatingToTray();
        }
    );

    defineMethod(superClass,
        function _addFloatingToTray() {
            this._tray.add(this._floatingContent);
        }
    );

    defineMethod(superClass,
        function _initFloatingContent() {
            let content = new Group();
            content.cloning = Cloning.NONE;
            return content;
        }
    );

    extendMethod(superClass, $finalize=>
        function finalize() {
            $finalize.call(this);
            if (this._floatingChildren) {
                for (let child of this._floatingChildren) {
                    child.finalize();
                }
            }
        }
    );

    defineMethod(superClass,
        function __clearFloating() {
            this._floatingContent.clear()
        }
    );

    defineMethod(superClass,
        function __addFloating(element) {
            this._floatingContent.add(element._root);
        }
    );

    defineMethod(superClass,
        function __insertFloating(previous, element) {
            this._floatingContent.insert(previous._root, element._root);
        }
    );

    defineMethod(superClass,
        function __replaceFloating(previous, element) {
            this._floatingContent.replace(previous._root, element._root);
        }
    );

    defineMethod(superClass,
        function __removeFloating(element) {
            this._floatingContent.remove(element._root);
        }
    );

    defineMethod(superClass,
        function _addFloating(element) {
            if (!this._floatingChildren) {
                this._floatingChildren = new List();
                this._floatingChildren.cloning = Cloning.NONE;
            }
            // IMPORTANT : DOM update before this._floatingChildren update !
            this.__addFloating(element);
            this._floatingChildren.add(element);
            element._parent = this;
        }
    );

    defineMethod(superClass,
        function addFloating(element) {
            if (element.parent !== this) {
                if (element.parent) {
                    element.detach();
                }
                Memento.register(this);
                Memento.register(element);
                this._addFloating(element);
                this._fire(Events.ADD_FLOATING, element);
                element._fire(Events.ATTACH, this);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _insertFloating(previous, element) {
            if (this._floatingChildren) {
                this.__insertFloating(previous, element);
                // IMPORTANT : DOM update before this._children update !
                this._floatingChildren.insert(previous, element);
                element._parent = this;
            }
        }
    );

    defineMethod(superClass,
        function insertFloating(previous, element) {
            if (previous.parent === this) {
                let added = false;
                if (element.parent && element.parent !== this) {
                    element.detach();
                    added = true;
                }
                Memento.register(this);
                Memento.register(element);
                this._insertFloating(previous, element);
                if (added) {
                    this._fire(Events.ADD_FLOATING, element);
                    element._fire(Events.ATTACH, this);
                }
                else {
                    this._fire(Events.DISPLACE_FLOATING, element);
                    element._fire(Events.DISPLACED, this);
                }
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _replaceFloating(previous, element) {
            if (!this._floatingChildren) {
                this._floatingChildren = new List();
            }
            // IMPORTANT : DOM update before this._children update !
            this.__replaceFloating(previous, element);
            this._floatingChildren.replace(previous, element);
            previous._parent = null;
            element._parent = this;
        }
    );

    defineMethod(superClass,
        function replaceFloating(previous, element) {
            if (previous.parent === this) {
                let added = false;
                if (element.parent && element.parent !== this) {
                    element.detach();
                    added = true;
                }
                Memento.register(this);
                Memento.register(previous);
                Memento.register(element);
                this._replaceFloating(previous, element);
                this._fire(Events.REMOVE_FLOATING, previous);
                previous._fire(Events.DETACH, this);
                if (added) {
                    this._fire(Events.ADD_FLOATING, element);
                    element._fire(Events.ATTACH, this);
                }
                else {
                    this._fire(Events.DISPLACE_FLOATING, element);
                    element._fire(Events.DISPLACED, this);
                }
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _removeFloating(element) {
            if (this._floatingChildren) {
                // IMPORTANT : DOM update before this._children update !
                this.__removeFloating(element);
                this._floatingChildren.remove(element);
                element._parent = null;
                if (this._floatingChildren.size === 0) {
                    delete this._floatingChildren;
                }
            }
        }
    );

    defineMethod(superClass,
        function removeFloating(element) {
            if (element.parent === this) {
                Memento.register(this);
                Memento.register(element);
                this._removeFloating(element);
                this._fire(Events.REMOVE_FLOATING, element);
                element._fire(Events.DETACH, this);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function _clearFloating() {
            if (this._floatingChildren) {
                // IMPORTANT : DOM update before this._children update !
                this.__clearFloating();
                for (let element of this._floatingChildren) {
                    element._parent = null;
                }
                delete this._floatingChildren;
            }
        }
    );

    defineMethod(superClass,
        function clearFloating() {
            if (this._floatingChildren) {
                Memento.register(this);
                let children = this._floatingChildren;
                for (let element of children) {
                    Memento.register(element);
                }
                this._clear();
                for (let element of children) {
                    this._fire(Events.REMOVE_FLOATING, element);
                    element._fire(Events.DETACH, this);
                }
            }
            return this;
        }
    );

    extendMethod(superClass, $detachChild=>
        function detachChild(element) {
            if ($detachChild && $detachChild.call(this, element)) return true;
            if (!this.containsFloating(element)) return false;
            this.removeFloating(element);
            return true;
        }
    );

    defineMethod(superClass,
        function _shiftFloating(element, x, y) {
        }
    );

    extendMethod(superClass, $shift=>
        function shift(element, x, y) {
            if ($shift && $shift.call(this, element, x, y)) return true;
            if (!this.containsFloating(element)) return false;
            this._shiftFloating(element, x, y);
            return true;
        }
    );

    defineMethod(superClass,
        function containsFloating(element) {
            return this._floatingChildren && this._floatingChildren.contains(element);
        }
    );

    defineGetProperty(superClass,
        function floatingContent() {
            return this._floatingContent;
        }
    );

    defineGetProperty(superClass,
        function floatingChildren() {
            return this._floatingChildren ? new List(...this._floatingChildren) : new List();
        }
    );

    defineMethod(superClass,
        function _memorizeFloatingContent(memento) {
            if (this._floatingChildren) {
                memento._floatingChildren = new List(...this._floatingChildren);
            }
        }
    );

    defineMethod(superClass,
        function _revertFloatingContent(memento) {
            this.__clearFloating();
            if (memento._floatingChildren) {
                this._floatingChildren = new List(...memento._floatingChildren);
                for (let child of this._floatingChildren) {
                    this.__addFloating(child);
                }
            }
            else {
                delete this._floatingChildren;
            }
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            this._memorizeFloatingContent(memento);
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._revertFloatingContent(memento);
            return this;
        }
    );

    extendMethod(superClass, $cloning=>
        function _cloning(duplicata) {
            let copy = $cloning.call(this, duplicata);
            for (let child of this.floatingChildren) {
                copy._addFloating(child.duplicate(duplicata));
            }
            return copy;
        }
    );

    defineGetProperty(superClass,
        function isFloatingContainer() {
            return true;
        }
    );

    extendMethod(superClass, $accept=>
        function accept(visitor) {
            $accept.call(this, visitor);
            for (let child of this.floatingChildren) {
                visitor.visit(child);
            }
            return this;
        }
    );

}

/**
 * Make a container class a support : (already) container instances then accept other elements to be dropped on.
 * <p> Note that the element must be a container (of any type) to give value to this trait.
 * @param superClass class to be enhanced.
 */
export function makeContainerASupport(superClass) {

    defineGetProperty(superClass,
        function isSupport() {
            return true;
        }
    );

    proposeMethod(superClass,
        function _acceptDrop(element) {
            return true;
        }
    );

    replaceMethod(superClass,
        function _dropTarget(element) {
            return this;
        }
    );

    extendMethod(superClass, $executeDrop=>
        function _executeDrop(element, dragSet, initialTarget) {
            if (!$executeDrop || !$executeDrop.call(this, element, dragSet, initialTarget)) {
                this.addChild(element);
            }
            return true;
        }
    );

    extendMethod(superClass, $unexecuteDrop=>
        function _unexecuteDrop(element) {
            if (!$unexecuteDrop || !$unexecuteDrop.call(this, element)) {
                this._addChild(element);
            }
            return true;
        }
    );

    extendMethod(superClass, $receiveDrop=>
        function _receiveDrop(element, dragSet, initialTarget) {
            $receiveDrop && $receiveDrop.call(this, element, dragSet, initialTarget);
        }
    );

    extendMethod(superClass, $revertDrop=>
        function _revertDrop(element) {
            $revertDrop && $revertDrop.call(this, element);
        }
    );

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

    defineGetProperty(superClass,
        function isSandBox() {
            return true;
        }
    );

}

export function makeSandBox(superClass) {

    makeSupport(superClass);
    makeContainerASandBox(superClass);

}

export function makeContainerMultiLayered(superClass, {layers}) {

    let defaultLayer = layers[0];

    extendMethod(superClass, $initContent=>
        function _initContent() {
            let content = new Group();
            content.cloning = Cloning.NONE;
            this._layers = new CloneableObject();
            for (let layer of layers) {
                this._layers[layer] = new Group();
                content.add(this._layers[layer]);
            }
            $initContent && $initContent.call(this);
            return content;
        }
    );

    replaceMethod(superClass,
        function __clearChildren() {
            for (let layer of layers) {
                this._layers[layer].clear();
            }
        }
    );

    replaceMethod(superClass,
        function __addChild(element) {
            let layer = this._getLayer(element);
            this._layers[layer].add(element._root);
        }
    );

    /**
     * Find the first element that follow a given child in the container and that belongs to a given layer. This
     * private method is used to replace or insert an element in place of (or before) another one that belongs to
     * another layer.
     * @param element starting point of the search
     * @param layer layer of the requested element
     * @returns {*}
     * @private
     */
    defineMethod(superClass,
        function _findNextOnLayer(element, layer) {
            let elemIdx = this._children.indexOf(element);
            if (elemIdx === -1) return null;
            for (let index = elemIdx + 1; index < this._children.length; index++) {
                if (this._getLayer(this._children[index]) === layer) return this._children[index];
            }
            return null;
        }
    );

    replaceMethod(superClass,
        function __insertChild(previous, element) {
            let previousLayer = this._getLayer(previous);
            let layer = this._getLayer(element);
            if (layer === previousLayer) {
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
        }
    );

    replaceMethod(superClass,
        function __replaceChild(previous, element) {
            let previousLayer = this._getLayer(previous);
            let layer = this._getLayer(element);
            if (layer === previousLayer) {
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
        }
    );

    replaceMethod(superClass,
        function __removeChild(element) {
            let layer = this._getLayer(element);
            this._layers[layer].remove(element._root);
        }
    );

    extendMethod(superClass, $getLayer=>
        function _getLayer(element) {
            let layer = $getLayer ? $getLayer.call(this, element) : null;
            if (!layer) {
                layer = element.getLayer && element.getLayer(this);
                if (!layer) layer = defaultLayer;
            }
            if (!this._layers[layer]) layer = defaultLayer;
            return layer;
        }
    );

    extendMethod(superClass, $cloning=>
        function _cloning(duplicata) {
            let copy = $cloning.call(this, duplicata);
            for (let layer of layers) {
                copy._content.add(copy._layers[layer]);
            }
            return copy;
        }
    );

    defineMethod(superClass,
        function getLayerNode(layer) {
            return this._layers[layer];
        }
    );

}

export function makeMultiLayeredContainer(superClass, {layers}) {
    makeContainer(superClass);
    makeContainerMultiLayered(superClass, {layers});
}

export function makeLayersWithContainers(superClass, {layersBuilder}) {

    assert(layersBuilder);

    let defaultLayer;
    let layers = layersBuilder();

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._content = this._initContent();
            this._addContentToTray();
        }
    );

    defineMethod(superClass,
        function _addContentToTray() {
            let next = this._decorationsSupport || this._floatingContent;
            next ? this._tray.insert(next, this._content) : this._tray.add(this._content);
        }
    );

    defineMethod(superClass,
        function _initContent() {
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
        }
    );

    extendMethod(superClass, $finalize=>
        function finalize() {
            $finalize.call(this);
            for (let layer of this._layers) {
                layer.finalize();
            }
        }
    );

    defineMethod(superClass,
        function clearChildren() {
            for (let layer in layers) {
                this._layers[layer].clear();
            }
            return this;
        }
    );

    defineMethod(superClass,
        function addChild(element) {
            let layer = this._getLayer(element);
            this._layers[layer].add(element);
            return this;
        }
    );

    defineMethod(superClass,
        function insertChild(previous, element) {
            let previousLayer = this._getLayer(previous);
            let layer = this._getLayer(element);
            if (layer === previousLayer) {
                this._layers[layer].insert(previous, element);
            }
            else {
                this._layers[layer].add(element);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function replaceChild(previous, element) {
            let previousLayer = this._getLayer(previous);
            let layer = this._getLayer(element);
            if (layer === previousLayer) {
                this._layers[layer].replace(previous, element);
            }
            else {
                this._layers[previousLayer].remove(previous);
                this._layers[layer].add(element);
            }
            return this;
        }
    );

    defineMethod(superClass,
        function removeChild(element) {
            let layer = this._getLayer(element);
            this._layers[layer].remove(element);
            return this;
        }
    );

    defineMethod(superClass,
        function containsChild(element) {
            let layer = this._getLayer(element);
            return this._layers[layer].contains(element);
        }
    );

    defineMethod(superClass,
        function _shiftChild(element, x, y) {
        }
    );

    extendMethod(superClass, $shift=>
        function _shift(element, x, y) {
            if (shift && shift.call(this, element, x, y)) return true;
            if (!this.containsChild(element)) return false;
            this._shiftChild(element, x, y);
            return true;
        }
    );

    defineMethod(superClass,
        function getElementsInLayers(elements) {
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
        }
    );

    extendMethod(superClass, $hover=>
        function hover(elements) {
            hover && hover.call(this, elements);
            let elementsInLayers = this.getElementsInLayers(elements);
            for (let layer of elementsInLayers.keys()) {
                if (this._layers[layer].hover) {
                    this._layers[layer].hover(elementsInLayers.get(layer));
                }
            }
        }
    );

    defineMethod(superClass,
        function showLayer(layer) {
            this._layers[layer].pedestal.add(this._layers[layer]._root);
        }
    );

    defineMethod(superClass,
        function hideLayer(layer) {
            this._layers[layer].pedestal.remove(this._layers[layer]._root);
        }
    );

    defineMethod(superClass,
        function hidden(layer) {
            return !!this._layers[layer]._root.parent;
        }
    );

    defineGetProperty(superClass,
        function children() {
            let result = new List();
            for (let layer in this._layers) {
                result.push(...this._layers[layer].children);
            }
            return result;
        }
    );

    defineMethod(superClass,
        function layerChildren(layer) {
            return this._layers[layer].children;
        }
    );

    defineMethod(superClass,
        function _acceptDrop(element) {
            let layer = this._getLayer(element);
            return this._layers[layer]._acceptDrop(element);
        }
    );

    extendMethod(superClass, $getLayer=>
        function _getLayer(element) {
            let layer = getLayer ? getLayer.call(this, element) : null;
            if (!layer) {
                layer = element.getLayer && element.getLayer(this);
                if (!layer) layer = defaultLayer;
            }
            if (!this._layers[layer]) layer = defaultLayer;
            return layer;
        }
    );

    defineGetProperty(superClass,
        function content() {
            return this._content;
        }
    );

}

export function makeLayered(superClass, {layer}) {

    extendMethod(superClass, $getLayer=>
        function getLayer(target) {
            if ($getLayer) {
                let layer = $getLayer.call(this, target);
                if (layer) return layer;
            }
            return layer;
        }
    );

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
            _rootChildren: [...this._root.children],
            _matrix: this._root._matrix
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
            addChild(element) {
                that._support._memorizeElementContent(element);
                proto.add.callChild(this, element);
            },
            insertChild(previous, element) {
                that._support._memorizeElementContent(element);
                proto.insertChild.call(this, previous, element);
            },
            replaceChild(previous, element) {
                that._support._memorizeElementContent(element);
                proto.replaceChild.call(this, previous, element);
            },
            removeChild(element) {
                that._support._memorizeElementContent(element);
                proto.removeChild.call(this, element);
            },
            clearChildren() {
                for (let element of that.elements) {
                    that._support._memorizeElementContent(element);
                }
                proto.clearChildren.call(this);
            },
            _addChild(element) {
                proto._addChild.call(this, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _insertChild(previous, element) {
                proto._insertChild.call(this, previous, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _replaceChild(previous, element) {
                that._support._takeOutElementContent(previous);
                that._support._removeEmptyLevels();
                proto._replaceChild.call(this, previous, element);
                that._support._takeInElementContent(element, this, that._zIndex + 1);
            },
            _removeChild(element) {
                that._support._takeOutElementContent(element);
                that._support._removeEmptyLevels();
                proto._removeChild.call(this, element);
            },
            _clearChildren() {
                for (let element of pedestal.elements) {
                    that._support._takeOutElementContent(element);
                }
                that._support._removeEmptyLevels();
                proto._clearChildren.call(this);
            },
            __addChild(element) {
                pedestal.add(element);
            },
            __insertChild(previous, element) {
                pedestal.insert(previous, element);
            },
            __replaceChild(previous, element) {
                pedestal.replace(previous, element);
            },
            __removeChild(element) {
                pedestal.remove(element);
            },
            __clearChildren() {
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
            __pass__: true,
            __proto__: proto,
            constructor: proto.constructor
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

        let action = mutations => {
            let updates = new ESet();
            for (let mutation of mutations) {
                if (mutation.type === Mutation.ATTRIBUTES && mutation.attributeName === "transform") {
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
            MutationObservers.instance.disconnect(this._host);
            for (let pedestal of roots) {
                pedestal.refresh();
            }
            MutationObservers.instance.observe(this._host, action, this._host._content._node, config);
        };
        MutationObservers.instance.observe(this._host, action, this._host._content._node, config);
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
        for (let idx = this._levels.length; idx <= index; idx++) {
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
                    element._addChild(child);
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
                        element._addChild(child);
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
        for (let index = this._levels.length - 1; index > 0; index--) {
            if (this._levels[index].empty) {
                this._host._content.remove(this._levels[index]);
                this._levels.length -= 1;
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
        let index = 0;
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

    replaceMethod(superClass,
        function _initContent() {
            this._content = new Group();
            this._content.cloning = Cloning.NONE;
            this._zIndexSupport = new ZIndexSupport(this);
            return this._content;
        }
    );

    extendMethod(superClass, $addChild=>
        function addChild(element) {
            Memento.register(this._zIndexSupport);
            this._zIndexSupport._memorizeElementContent(element);
            return $addChild.call(this, element);
        }
    );

    extendMethod(superClass, $insertChild=>
        function insertChild(previous, element) {
            Memento.register(this._zIndexSupport);
            this._zIndexSupport._memorizeElementContent(element);
            return $insertChild.call(this, previous, element);
        }
    );

    extendMethod(superClass, $replaceChild=>
        function replaceChild(previous, element) {
            Memento.register(this._zIndexSupport);
            this._zIndexSupport._memorizeElementContent(element);
            return $replaceChild.call(this, previous, element);
        }
    );

    extendMethod(superClass, $removeChild=>
        function removeChild(element) {
            Memento.register(this._zIndexSupport);
            this._zIndexSupport._memorizeElementContent(element);
            return $removeChild.call(this, element);
        }
    );

    extendMethod(superClass, $clearChildren=>
        function clearChildren() {
            Memento.register(this._zIndexSupport);
            for (let element of this._children) {
                this._zIndexSupport._memorizeElementContent(element);
            }
            return $clearChildren.call(this);
        }
    );

    extendMethod(superClass, $addChild=>
        function _addChild(element) {
            this._zIndexSupport._addChild($addChild, element);
        }
    );

    extendMethod(superClass, $insertChild=>
        function _insertChild(previous, element) {
            this._zIndexSupport._insertChild($insertChild, previous, element);
        }
    );

    extendMethod(superClass, $replaceChild=>
        function _replaceChild(previous, element) {
            this._zIndexSupport._replaceChild($replaceChild, previous, element);
        }
    );

    extendMethod(superClass, $removeChild=>
        function _removeChild(element) {
            this._zIndexSupport._removeChild($removeChild, element);
        }
    );

    extendMethod(superClass, $clearChildren=>
        function _clearChildren() {
            this._zIndexSupport._clearChildren($clearChildren);
        }
    );

    replaceMethod(superClass,
        function __addChild(element) {
            this._zIndexSupport.__addChild(element);
        }
    );

    replaceMethod(superClass,
        function __insertChild(previous, element) {
            this._zIndexSupport.__insertChild(previous, element);
        }
    );

    replaceMethod(superClass,
        function __replaceChild(previous, element) {
            this._zIndexSupport.__replacechild(previous, element);
        }
    );

    replaceMethod(superClass,
        function __removeChild(element) {
            this._zIndexSupport.__removeChild(element);
        }
    );

    replaceMethod(superClass,
        function __clearChildren() {
            this._content.clearChildren();
            this._zIndexSupport.__clearChildren();
        }
    );

    replaceMethod(superClass,
        function _memorizeContent(memento) {
            Memento.register(this._zIndexSupport);
        }
    );

    replaceMethod(superClass,
        function _revertContent(memento) {
        }
    );

    proposeGetProperty(superClass,
        function isZIndex() {
            return true;
        }
    );

}

export function makeZindexContainer(superClass) {
    makeContainer(superClass);
    makeContainerZindex(superClass);
}

export function makeZindexSupport(superClass) {
    makeSandBox(superClass);
    makeContainerZindex(superClass);
}
