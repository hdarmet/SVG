'use strict';

import {
    evaluate, same, always
} from "./misc.js";
import {
    List, AVLTree, ESet, SpatialLocator
} from "./collections.js";
import {
    Box, Matrix
} from "./geometry.js";
import {
    win, Colors, Line, computePosition, Group
} from "./graphics.js";
import {
    Memento, CloneableObject, Events, makeObservable, Context, glassSelectionPredicate
} from "./toolkit.js";
import {
    Decoration, TextDecoration
} from "./base-element.js";

export class Physic {

    constructor(host, predicate, ...args) {
        this._host = host;
        this._predicate = predicate;
        this._init(...args);
        this._triggered = false;
    }

    get host() {
        return this._host;
    }

    _init(...args) {}

    _trigger() {
        if (!this._triggered) {
            this._triggered = true;
            win.setTimeout(()=>{
                this.refresh();
            }, 0);
        }
    }

    resize(width, height) {
        this._trigger();
        this._resize(width, height);
        return this;
    }

    reset() {
        this._trigger();
        this._reset();
        return this;
    }

    _managedElements(elements) {
        let managedElements = new List();
        for (let element of elements) {
            if (this.accept(element)) {
                managedElements.add(element);
            }
        }
        return managedElements;
    }

    hover(elements) {
        this._hover(this._managedElements(elements));
        this._refresh();
        return this;
    }

    refresh() {
        try {
            this._refresh();
        }
        finally {
            this._triggered = false;
        }
        return this;
    }

    add(element) {
        if (this.accept(element)) {
            this._trigger();
            this._add(element);
        }
        return this;
    }

    remove(element) {
        if (this.accept(element)) {
            this._trigger();
            this._remove(element);
        }
        return this;
    }

    move(element) {
        if (this.accept(element)) {
            this._trigger();
            this._move(element);
        }
        return this;
    }

    accept(element) {
        return this._predicate.call(this, element);
    }

    _acceptedElements(elements) {
        let accepted = new ESet();
        for (let element of elements) {
            if (this.accept(element)) {
                accepted.add(element);
            }
        }
        return accepted;
    };

    clone(duplicata) {
        let copy = new this.constructor(duplicata.get(this._host));
        copy._trigger();
        return copy;
    }

    _reset() {}
    _refresh() {}
    _hover(elements) {}
    _add() {}
    _remove() {}
    _move() {}
    _resize() {}
    _acceptDrop(element, dragSet) { return true; }
    _receiveDrop(element, dragSet) { return this; }
}

export class PhysicSelector extends Physic {

    constructor(host, predicate) {
        super(host, predicate);
        this._physics = new List();
    }

    get host() {
        return this._host;
    }

    _trigger() {
        throw new Error("Should not be inovoked.");
    }

    resize(width, height) {
        for (let physic of this._physics) {
            physic.resize(width, height);
        }
        return this;
    }

    register(physic) {
        this._physics.add(physic);
        return this;
    }

    reset() {
        for (let physic of this._physics) {
            physic.reset();
        }
        return this;
    }

    hover(elements) {
        elements = this._managedElements(elements);
        for (let physic of this._physics) {
            physic.hover(elements);
        }
        return this;
    }

    refresh() {
        throw new Error("Should not be invoked.");
    }

    add(element) {
        if (this.accept(element)) {
            for (let physic of this._physics) {
                physic.add(element);
            }
        }
        return this;
    }

    remove(element) {
        if (this.accept(element)) {
            for (let physic of this._physics) {
                physic.remove(element);
            }
        }
        return this;
    }

    move(element) {
        if (this.accept(element)) {
            for (let physic of this._physics) {
                physic.move(element);
            }
        }
        return this;
    }

    _reset() {
        throw new Error("Should not be invoked.");
    }
    _refresh() {
        throw new Error("Should not be invoked.");
    }
    _hover(elements) {
        throw new Error("Should not be invoked.");
    }
    _add() {
        throw new Error("Should not be invoked.");
    }
    _remove() {
        throw new Error("Should not be invoked.");
    }
    _move() {
        throw new Error("Should not be invoked.");
    }
    _resize() {
        throw new Error("Should not be invoked.");
    }

    _acceptDrop(element, dragSet) {
        for (let physic of this._physics) {
            if (physic.accept(element)) {
                if (!physic._acceptDrop(element, dragSet)) return false;
            }
        }
        return true;
    }

    _receiveDrop(element, dragSet) {
        for (let physic of this._physics) {
            if (physic.accept(element)) {
                physic._receiveDrop(element);
                return this;
            }
        }
        return this;
    }

    clone(duplicata) {
        let copy = new this.constructor(duplicata.get(this._host), this._predicate);
        for (let physic of this._physics) {
            let physicCopy = duplicata.get(physic);
            if (!physicCopy) {
                physicCopy = physic.clone(duplicata)
                duplicata.set(physic, physicCopy);
            }
            copy.register(physicCopy);
        }
        return copy;
    }

}

export function makePhysicExclusive(superClass) {

    let acceptDrop = superClass.prototype._acceptDrop;
    superClass.prototype._acceptDrop = function(element, dragSet) {
        if (!this.accept(element)) {
            return false;
        }
        return acceptDrop.call(this, element, dragSet);
    }

}

export function addPhysicToContainer(superClass, {physicBuilder}) {

    console.assert(superClass.prototype._initContent);

    let initContent = superClass.prototype._initContent;
    superClass.prototype._initContent = function(...args) {
        let result = initContent.call(this, ...args);
        this._initPhysic();
        return result;
    };

    superClass.prototype._initPhysic = function() {
        this._physic = physicBuilder.call(this);
        return this;
    };

    Object.defineProperty(superClass.prototype, "physic", {
        configurable:true,
        get() {
            return this._physic;
        }
    });
    let add = superClass.prototype._add;
    superClass.prototype._add = function(element) {
        add.call(this, element);
        this.physic.add(element);
    };

    let shift = superClass.prototype._shift;
    superClass.prototype._shift = function(element, x, y) {
        shift.call(this, element, x, y);
        this.physic.move(element);
    };

    let insert = superClass.prototype._insert;
    superClass.prototype._insert = function(previous, element) {
        insert.call(this, previous, element);
        this.physic.add(element);
    };

    let replace = superClass.prototype._replace;
    superClass.prototype._replace = function(previous, element) {
        replace.call(this, previous, element);
        this.physic.add(element);
        this.physic.remove(element);
    };

    let remove = superClass.prototype._remove;
    superClass.prototype._remove = function(element) {
        remove.call(this, element);
        this.physic.remove(element);
    };

    let hover = superClass.prototype.hover;
    superClass.prototype.hover = function(elements) {
        hover && hover.call(this, elements);
        this.physic.hover(elements);
        return this;
    };

    let setsize = superClass.prototype._setSize;
    superClass.prototype._setSize = function(width, height) {
        setsize && setsize.call(this, width, height);
        this.physic.resize(width, height);
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        let recover = superClass.prototype._recover;
        superClass.prototype._recover = function (memento) {
            if (recover) recover.call(this, memento);
            this.physic.reset();
        }
    }

    let acceptDrop = superClass.prototype._acceptDrop;
    superClass.prototype._acceptDrop = function(element, dragSet) {
        if (acceptDrop && !acceptDrop.call(this, element, dragSet)) return false;
        return this.physic._acceptDrop(element, dragSet);
    };

    let receiveDrop = superClass.prototype._receiveDrop;
    superClass.prototype._receiveDrop = function(element, dragSet) {
        receiveDrop && receiveDrop.call(this, element, dragSet);
        this.physic._receiveDrop(element, dragSet);
    };

}

export function makeAbstractPositioningPhysic(superClass) {

    superClass.prototype._init = function(...args) {
        this._elements = new ESet();
    };

    superClass.prototype._refresh = function() {
        for (let element of this._elements) {
            this._refreshElement(element);
        }
        if (this._hoveredElements) {
            for (let element of this._hoveredElements) {
                this._refreshHoverElement(element);
            }
            this._hoveredElements.clear();
        }
        this._elements.clear();
    };

    superClass.prototype._reset = function() {
        this._elements = this._acceptedElements(this._host.children);
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
    };

    return superClass;
}

export function makePositioningPhysic(superClass, {
    positionsBuilder,
    clipBuilder = element => {
        return {x: element.lx, y: element.ly};
    }
}) {

    console.assert(positionsBuilder);
    makeAbstractPositioningPhysic(superClass);

    superClass.prototype._elementPosition = function(element) {
        let {x, y} = clipBuilder(element);
        let distance = Infinity;
        let position = null;
        let positions = positionsBuilder.call(this, element);
        for (let _position of positions) {
            let _distance = (_position.x-x)*(_position.x-x)+(_position.y-y)*(_position.y-y);
            if (_distance<distance) {
                distance = _distance;
                position = _position;
            }
        }
        return position ? {
            x:position.x-x+element.lx,
            y:position.y-y+element.ly,
            attachment:position.attachment
        } : null;
    };

    superClass.prototype._refreshHoverElement = function(element) {
        let position = this._elementPosition(element);
        if (this._acceptPosition(element, position)) {
            element.move(position.x, position.y);
        }
    };

    superClass.prototype._refreshElement = function(element) {
        let position = this._elementPosition(element);
        if (this._acceptPosition(element, position)) {
            element.move(position.x, position.y);
            element._positioned && element._positioned(this, position);
        }
    };

    superClass.prototype._acceptPosition = function(element, position) {
        return element._acceptPosition ? element._acceptPosition(this, position) : !!position;
    };

    superClass.prototype._acceptDrop = function(element, dragSet) {
        let position = this._elementPosition(element);
        return this._acceptPosition(element,  position);
    };

    return superClass;
}

export function createPositioningPhysic({
    predicate = always,
    positionsBuilder, clipBuilder})
{
    class PositioningPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makePositioningPhysic(PositioningPhysic, {positionsBuilder, clipBuilder});
    return PositioningPhysic;
}

export function makePositioningContainer(superClass, {predicate, positionsBuilder, clipBuilder}) {
    let ContainerPhysic = createPositioningPhysic({predicate, positionsBuilder, clipBuilder});
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

export const Attachments = {
    SECTOR_THRESHOLD : 10,
    SECTOR_MIN_SIZE : 10,
    RANGE : 20,
    MARGIN: 0.0001
};

export function makeAttachmentPhysic(superClass, {slotProviderPredicate = element=>true, clipBuilder}) {

    makePositioningPhysic(superClass, {
        positionsBuilder:function(element) {
            return this.findPosition(element);
        },
        clipBuilder
    });

    /**
     * Add method is redefined in order to process slot provider elements which are NOT accepted as managed elements
     * (ie. clips owner elements) by the physic.
     * @type {add|*}
     */
    let add = superClass.prototype.add;
    superClass.prototype.add = function(element) {
        if (this._addAttachments(element)) {
            delete this._attachments;
        }
        add.call(this, element);
    };

    superClass.prototype._addAttachments = function(element) {
        if (slotProviderPredicate.call(this, element)) {
            if (!this._attachmentsProviders) {
                this._attachmentsProviders = new List(element);
            }
            else {
                this._attachmentsProviders.add(element);
            }
            return true;
        }
        return false;
    };

    let reset = superClass.prototype._reset;
    superClass.prototype._reset = function() {
        delete this._attachmentsProviders;
        for (let element of this._host.children) {
            this._addAttachments(element);
        }
        this._attachments = null;
        reset.call(this);
    };

    let remove = superClass.prototype.remove;
    superClass.prototype.remove = function(element) {
        if (slotProviderPredicate.call(this, element)) {
            if (this._attachmentsProviders) {
                this._attachmentsProviders.remove(element);
                delete this._attachments;
            }
        }
        remove.call(this, element);
    };

    let move = superClass.prototype.move;
    superClass.prototype.move = function(element) {
        if (slotProviderPredicate.call(this, element)) {
            delete this._attachments;
        }
        move.call(this, element);
    };

    let resize = superClass.prototype._resize;
    superClass.prototype._resize = function(width, height) {
        this._attachments = null;
        resize.call(this, width, height);
    };

    superClass.prototype.getAttachment = function(x, y) {
        let attachments = this._attachments.find(x, y, Attachments.MARGIN);
        return attachments.length>0 ? attachments[0] : null;
    };

    superClass.prototype.findPosition = function(element) {
        if (!this._attachments) {
            this._attachments = this._collectAttachments();
        }
        let positions = new List();
        let {x, y} = clipBuilder(element);
        for (let attachment of this._attachments.find(x, y, Attachments.RANGE)) {
            positions.add({
                x:attachment.lx,
                y:attachment.ly,
                attachment: attachment
            });
        }
        return positions;
    };

    superClass.prototype._collectAttachments = function() {
        let attachments = new SpatialLocator(
            this._host.width, this._host.height,
            Attachments.SECTOR_THRESHOLD, Attachments.SECTOR_MIN_SIZE,
            function(attachment) {
                return {
                    x:attachment.lx,
                    y:attachment.ly
                };
            });
        if (this._attachmentsProviders) {
            for (let element of this._attachmentsProviders) {
                for (let attachment of element.attachments) {
                    attachments.add(attachment);
                }
            }
        }
        return attachments;
    }
}

export function createAttachmentPhysic({predicate, slotProviderPredicate, clipBuilder}) {
    class AttachmentPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeAttachmentPhysic(AttachmentPhysic, {slotProviderPredicate, clipBuilder});
    return AttachmentPhysic;
}

export function makeAttachmentContainer(superClass, {predicate, slotProviderPredicate, clipBuilder}) {
    let ContainerPhysic = createAttachmentPhysic({predicate, slotProviderPredicate, clipBuilder});
    addPhysicToContainer(superClass, {
        physicBuilder:function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

Events.PLUG = "plug";
Events.UNPLUG = "unplug";

export class Clip {

    constructor(owner, x, y) {
        this._x = x;
        this._y = y;
        this._owner = owner;
    }

    clone(duplicata) {
        return new Clip(duplicata.get(this._owner), this._x, this._y);
    }

    get position() {
        return this._position;
    }

    set position(position) {
        if (position !== this._position) {
            Memento.register(this);
            if (position) {
                this._position = position;
            }
            else {
                delete this._position;
            }
            this._fire(Events.MOVED, position);
        }
        return this;
    }

    cloned(duplicata) {
        let copy = duplicata.get(this);
        if (this._slot) {
            let slotCopy = duplicata.get(this._slot);
            if (slotCopy) {
                copy._slot = slotCopy;
                copy._owner.addObserver(slotCopy._owner);
            }
        }
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get lx() {
        return this._owner.lx + this._x;
    }

    get ly() {
        return this._owner.ly + this._y;
    }

    _memento() {
        return {
            _x : this._x,
            _y : this._y,
            _owner : this._owner,
            _slot : this._slot
        }
    }

    _revert(memento) {
        this._x = memento._x;
        this._y = memento._y;
        this._owner = memento._owner;
        if (memento._slot) {
            this._slot = memento._slot;
        }
        else {
            delete this._slot;
        }
    }

}
makeObservable(Clip);

export class ClipDecoration extends Decoration {

    constructor(box, clip) {
        super();
        this._box = box;
        this._clip = clip;
    }

    _init() {
        this._root.add(new Line(0, -ClipDecoration.SIZE/2, 0, ClipDecoration.SIZE/2));
        this._root.add(new Line(-ClipDecoration.SIZE/2, 0, ClipDecoration.SIZE/2, 0));
        this._root.stroke = Colors.LIGHT_GREY;
        this._root.stroke_width = ClipDecoration.STROKE_WIDTH;
        let {x, y} = computePosition(this._element._root, this._box._root, this._clip.x, this._clip.y);
        this._root.matrix = Matrix.translate(x, y);
    }

    clone(duplicata) {
        let boxCopy = duplicata.get(this._box);
        let clipCopy = duplicata.get(this._clip);
        let copy = new ClipDecoration(boxCopy, clipCopy);
        return copy;
    }
}
ClipDecoration.STROKE_WIDTH = 0.25;
ClipDecoration.SIZE = 6;

export class ClipPositionDecoration extends TextDecoration {

    constructor(clip, specs, fontProperties) {
        super(clip, function() {
            let slot = this.position;
            let index = slot ? slot.index : undefined;
            return index===undefined ? "" : ""+index;
        }, specs, fontProperties);
        clip._addObserver(this);
    }

    _notified(source, event) {
        if (source===this.clip) {
            this.refresh();
        }
    }

    get clip() {
        return this._labelOwner;
    }

    clone(duplicata) {
        let element = duplicata.get(this._element);
        let clipCopy = duplicata.get(this.clip);
        let copy = new ClipPositionDecoration(clipCopy, this._specs, this._fontProperties);
        copy._element = element;
        return copy;
    }
}

export class Slot {

    constructor(owner, x, y) {
        this._x = x;
        this._y = y;
        this._owner = owner;
    }

    clone(duplicata) {
        return new Slot(duplicata.get(this._owner), this._x, this._y);
    }

    cloned(duplicata) {
        let copy = duplicata.get(this);
        if (this._clip) {
            let clipCopy = duplicata.get(this._clip);
            if (clipCopy) {
                copy._clip = clipCopy;
            }
        }
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get lx() {
        return this._owner.lx + this._x;
    }

    get ly() {
        return this._owner.ly + this._y;
    }

    plug(clip) {
        if (clip && clip !== this._clip) {
            Memento.register(this);
            Memento.register(clip);
            this._clip = clip;
            clip._slot = this;
            this._fire(Events.PLUG, clip);
            clip._fire(Events.PLUG, this);
            clip._owner.addObserver(this);
        }
        return this;
    }

    unplug() {
        if (this._clip) {
            Memento.register(this);
            Memento.register(this._clip);
            this._clip._owner.removeObserver(this);
            delete this._clip._slot;
            let clip = this._clip;
            delete this._clip;
            this._fire(Events.UNPLUG, clip);
            clip._fire(Events.UNPLUG, this);
        }
    }

    get available() {
        return !this._clip;
    }

    _notified(source, type, value) {
        if (type === Events.DETACH && this._clip && source === this._clip._owner) {
            this.unplug();
        }
    }

    _memento() {
        return {
            _x : this.x,
            _y : this.y,
            _owner : this._owner,
            _clip : this._clip
        }
    }

    _revert(memento) {
        this._x = memento._x;
        this._y = memento._y;
        this._owner = memento._owner;
        if (memento._slot) {
            this._slot = memento._slot;
        }
        else {
            delete this._slot;
        }
    }

}
makeObservable(Slot);

export function makeClipsOwner(superClass) {

    superClass.prototype._addClips = function(...clips) {
        if (!this._clips) {
            this._clips = new List(...clips);
        }
        else {
            this._clips.push(...clips);
        }
    };

    superClass.prototype._clearClips = function() {
        delete this._clips;
    };

    superClass.prototype.addClips = function(...clips) {
        if (clips.length) {
            Memento.register(this);
            this._addClips(...clips);
        }
    };

    superClass.prototype.clearClips = function() {
        if (this._clips) {
            Memento.register(this);
            this._clearClips();
        }
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        if (this._clips) {
            memento._clips = new List(...this._clips);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        if (memento._clips) {
            this._clips = new List(...memento._clips);
        }
        else if (this._clips) {
            delete this._clips;
        }
    };

    let cloning = superClass.prototype.__cloning;
    superClass.prototype.__cloning = function(duplicata) {
        let copy = cloning.call(this, duplicata);
        for (let index=0; index<this._clips.length; index++) {
            duplicata.set(this._clips[index], copy._clips[index]);
        }
        return copy;
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        for (let clip of copy._clips) {
            clip.cloned(duplicata);
        }
    };

    Object.defineProperty(superClass.prototype, "clips", {
        configurable: true,
        get: function () {
            return new List(...this._clips);
        }
    });

    superClass.prototype._acceptPosition = function(physic, position) {

        function refusePosition() {
            for (let index = 0; index < this._clips.length; index++) {
                this._clips[index].position = null;
            }
            return false;
        }

        if (position) {
            let dx = position.x - this.lx;
            let dy = position.y - this.ly;
            let attachments = new List();
            for (let index = 0; index < this._clips.length; index++) {
                let clip = this._clips[index];
                let attachment = physic.getAttachment(clip.lx + dx, clip.ly + dy);
                attachments[index] = attachment;
                if (!attachment) {
                    return refusePosition.call(this);
                }
            }
            for (let index = 0; index < this._clips.length; index++) {
                this._clips[index].position = attachments[index];
            }
            return true;
        }
        else {
            return refusePosition.call(this);
        }
    };

    superClass.prototype._positioned = function(physic, position) {
        let dx = position.x-this.lx;
        let dy = position.y-this.ly;
        for (let index=0; index<this._clips.length; index++) {
            let clip = this._clips[index];
            let slot = physic.getAttachment(clip.lx+dx, clip.ly+dy);
            slot.plug(clip);
        }
    }

}

export function makeSlotsOwner(superClass) {

    superClass.prototype._addSlots = function(...slots) {
        if (!this._slots) {
            this._slots = new List(...slots);
        }
        else {
            this._slots.push(...slots);
        }
    };

    superClass.prototype._clearSlots = function() {
        delete this._slots;
    };

    superClass.prototype.addSlots = function(...slots) {
        if (slots.length) {
            Memento.register(this);
            this._addSlots(...slots);
        }
    };

    superClass.prototype.clearSlots = function() {
        if (this._slots) {
            Memento.register(this);
            this._clearSlots();
        }
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        if (this._slots) {
            memento._slots = new List(...this._slots);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        if (memento._slots) {
            this._slots = new List(...memento._slots);
        }
        else if (this._slots) {
            delete this._slots;
        }
    };

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        for (let slot of copy._slots) {
            slot.cloned(duplicata);
        }
    };

    Object.defineProperty(superClass.prototype, "slots", {
        configurable: true,
        get: function () {
            return new List(...this._slots);
        }
    });

    Object.defineProperty(superClass.prototype, "attachments", {
        configurable: true,
        get: function () {
            return this.slots;
        }
    });

    superClass.prototype._dropTarget = function() {
        return this.parent;
    }

}

export function createSlotsAndClipsPhysic({predicate, slotProviderPredicate}) {
    return createAttachmentPhysic({
        predicate, slotProviderPredicate,
        clipBuilder:function(element) {
            return {x: element.clips[0].lx, y: element.clips[0].ly};
        }});
}

export function makeSlotsAndClipsContainer(superClass, {predicate, slotProviderPredicate}) {
    let ContainerPhysic = createSlotsAndClipsPhysic({predicate, slotProviderPredicate});
    addPhysicToContainer(superClass, {
        physicBuilder:function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

export function insertionSort(array, comparator = (a, b) => a - b) {
    let delta = array.length && array[0].removed ? 1 : 0;
    for (let index = 1; index < array.length; index++) {
        let tmp = array[index];
        if (tmp.removed) {
            delta++;
        } else {
            let idx2 = index - delta;
            while (idx2 > 0 && comparator(array[idx2 - 1], tmp) > 0) {
                array[idx2] = array[idx2 - 1];
                idx2 = idx2 - 1;
            }
            array[idx2] = tmp;
        }
    }
    array.length -= delta;
}

let COLLISION_MARGIN = 0.0001;
let ADJUST_MARGIN = 40;

export function dichotomousSearch(array, value, comparator = (a, b) => a - b) {
    let start = 0;
    let end = array.length - 1;

    while (start <= end) {
        let half = Math.floor((start + end) / 2);
        let cmp = comparator(value, array[half]);
        if (cmp === 0) return half;
        else if (cmp > 0) start = half + 1;
        else end = half - 1;
    }
    return start;
}

export function makeCenteredAnchorage(superClass) {

    Object.defineProperty(superClass.prototype, "anchors", {
        configurable:true,
        get() {
            return {
                x:[{pos:this.lx, distance:0}],
                y:[{pos:this.ly, distance:0}]
            };
        }
    });

}

export function makeHorizontalAnchorage(superClass) {

    Object.defineProperty(superClass.prototype, "anchors", {
        configurable:true,
        get() {
            return {
                x:[{pos:this.lx, distance:0}]
            };
        }
    });

}

export function makeVerticalAnchorage(superClass) {

    Object.defineProperty(superClass.prototype, "anchors", {
        configurable:true,
        get() {
            return {
                y:[{pos:this.ly, distance:0}]
            };
        }
    });

}

export function makeBoundedAnchorage(superClass) {

    Object.defineProperty(superClass.prototype, "anchors", {
        configurable:true,
        get() {
            let lgeom = this.localGeometry();
            let lx = this.lx;
            let ly = this.ly;
            return {
                x:[{pos:lgeom.left, distance:lgeom.left-lx}, {pos:lx, distance:0}, {pos:lgeom.right, distance:lgeom.right-lx}],
                y:[{pos:lgeom.top, distance:lgeom.top-ly}, {pos:ly, distance:0}, {pos:lgeom.bottom, distance:lgeom.bottom-ly}]
            };
        }
    });

}

export function makeRulesPhysic(superClass, {
    rulesBuilder,
    anchorsBuilder = element => element.anchors
}) {

    makeAbstractPositioningPhysic(superClass);

    superClass.prototype._elementPosition = function(element) {

        function getPosition(epos, rules) {
            let distance = Infinity;
            let pos = null;
            let attachment = null;
            for (let _pos of epos) {
                for (let _rule of rules) {
                    let _distance = _rule.pos - _pos.pos;
                    if (_distance < distance) {
                        distance = _distance;
                        pos = _rule.pos + _pos.distance;
                        attachment = _rule.attachment;
                    }
                }
            }
            return pos ? {pos, attachment} : null;
        }

        let {x:ex, y:ey} = anchorsBuilder(element);
        let {x:rx, y:ry} = rulesBuilder.call(this, element);
        let x = getPosition(ex, rx);
        let y = getPosition(ey, ry);
        if (x!==null || y!=null) {
            let position = {};
            if (x) {
                position.x = x.pos;
                position.attachmentX = x.attachment;
            }
            if (y) {
                position.y = y.pos;
                position.attachmentY = y.attachment;
            }
            return position;
        }
        return null;
    };

    superClass.prototype._refreshHoverElement = function(element) {
        let position = this._elementPosition(element);
        if (this._acceptPosition(element, position)) {
            let x = position.x!==undefined ? position.x : element.lx;
            let y = position.y!==undefined ? position.y : element.ly;
            element.move(x, y);
        }
    };

    superClass.prototype._refreshElement = function(element) {
        let position = this._elementPosition(element);
        if (this._acceptPosition(element, position)) {
            let x = position.x!==undefined ? position.x : element.lx;
            let y = position.y!==undefined ? position.y : element.ly;
            element.move(x, y);
            element._positioned && element._positioned(this, position);
        }
    };

    superClass.prototype._acceptPosition = function(element, position) {
        return element._acceptPosition ? element._acceptPosition(this, position) : !!position;
    };

    return superClass;
}

export function createRulesPhysic({predicate = always, rulesBuilder, anchorsBuilder})
{
    class RulesPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeRulesPhysic(RulesPhysic, {rulesBuilder, anchorsBuilder});
    return RulesPhysic;
}

export function makeRulesContainer(superClass, {predicate, rulesBuilder, anchorsBuilder}) {
    let ContainerPhysic = createRulesPhysic({predicate, rulesBuilder, anchorsBuilder});
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

export function makeCenteredRuler(superClass) {

    Object.defineProperty(superClass.prototype, "rules", {
        configurable:true,
        get() {
            return {
                x: [{pos: this.lx, anchor: this}],
                y: [{pos: this.ly, anchor: this}]
            }
        }
    });

}
export function makeBoundedRuler(superClass) {

    Object.defineProperty(superClass.prototype, "rules", {
        configurable:true,
        get() {
            let lgeom = this.localGeometry();
            let lx = this.lx;
            let ly = this.ly;
            return {
                x: [
                    {pos: lgeom.left, anchor: this},
                    {pos: lx, anchor: this},
                    {pos: lgeom.right, anchor: this
                }],
                y: [
                    {pos: lgeom.top, anchor: this},
                    {pos: ly, anchor: this},
                    {pos: lgeom.bottom, anchor: this
                }]
            }
        }
    });

}

export function makeRulersPhysic(superClass, {
    rulerPredicate = always,
    rulersBuilder = element=> {
        return element.rules;
    },
    anchorsBuilder = element => {
        return element.anchors;
    }
}) {

    makeRulesPhysic(superClass, {
        rulesBuilder:function(element) {
            return this._findRules(element);
        },
        anchorsBuilder
    });

    Object.defineProperty(superClass.prototype, "rules", {
        configurable:true,
        get() {
            if (!this._rules) {
                this._rules = this._collectRules();
            }
            return this._rules;
        }
    });

    let add = superClass.prototype.add;
    superClass.prototype.add = function(element) {
        if (this._addRules(element)) {
            delete this._rules;
        }
        add.call(this, element);
    };

    superClass.prototype._addRules = function(element) {
        if (this.accept.call(this, element) && rulerPredicate.call(this, element)) {
            if (!this._rulesProviders) {
                this._rulesProviders = new List(element);
            }
            else {
                this._rulesProviders.add(element);
            }
            return true;
        }
        return false;
    };

    let reset = superClass.prototype._reset;
    superClass.prototype._reset = function() {
        delete this._rulesProviders;
        for (let element of this._host.children) {
            this._addRules(element);
        }
        this._rules = null;
        reset.call(this);
    };

    let remove = superClass.prototype.remove;
    superClass.prototype.remove = function(element) {
        if (rulerPredicate.call(this, element)) {
            if (this._rulesProviders) {
                this._rulesProviders.remove(element);
                delete this._rules;
            }
        }
        remove.call(this, element);
    };

    let move = superClass.prototype.move;
    superClass.prototype.move = function(element) {
        if (rulerPredicate.call(this, element)) {
            delete this._rules;
        }
        remove.call(this, element);
    };

    let resize = superClass.prototype._resize;
    superClass.prototype._resize = function(width, height) {
        delete this._rules;
        resize.call(this, width, height);
    };

    superClass.prototype._findRules = function(element, range=Attachments.RANGE) {
        let allRules = this.rules;
        let rules = {
            x:new List(),
            y:new List()
        };
        let anchors = anchorsBuilder.call(this, element);
        for (let anchor of anchors.x) {
            let index = dichotomousSearch(allRules.x, anchor.pos-range);
            while(index>=0 && index<allRules.x.length && allRules.x[index].pos<=anchor.pos+range) {
                if (allRules.x[index].pos>=anchor.pos-range) {
                    rules.x.add(allRules.x[index]);
                }
                index++;
            }
        }
        for (let anchor of anchors.y) {
            let index = dichotomousSearch(allRules.y, anchor.pos-range);
            while(index>=0 && index<allRules.y.length && allRules.y[index].pos<=anchor.pos+range) {
                if (allRules.y[index].pos>=anchor.pos-range) {
                    rules.y.add(allRules.y[index]);
                }
                index++;
            }
        }
        return rules;
    };

    superClass.prototype.findRules = function(element, range=Attachments.RANGE) {
        if (this._accept(element)) {
            return this._findRules(element, range);
        }
        else {
            return {x:new List(), y:new List()};
        }
    };

    superClass.prototype._collectRules = function() {
        let rules = {
          x:new List(),
          y:new List()
        };
        if (this._rulesProviders) {
            for (let element of this._rulesProviders) {
                let _rules = rulersBuilder.call(this, element);
                if (_rules.x) {
                    for (let _rule of _rules.x) {
                        rules.x.add(_rule);
                    }
                }
                if (_rules.y) {
                    for (let _rule of _rules.y) {
                        rules.y.add(_rule);
                    }
                }
            }
            rules.x.sort((r1, r2)=>r1.pos-r2.pos);
            rules.y.sort((r1, r2)=>r1.pos-r2.pos);
        }
        return rules;
    }
}

export function createRulersPhysic({predicate, rulerPredicate, anchorsBuilder}) {
    class RulersPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeRulersPhysic(RulersPhysic, {rulerPredicate, anchorsBuilder});
    return RulersPhysic;
}

export function makeRulersContainer(superClass, {predicate, rulerPredicate, anchorsBuilder}) {
    let ContainerPhysic = createRulersPhysic({predicate, rulerPredicate, anchorsBuilder});
    addPhysicToContainer(superClass, {
        physicBuilder:function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

export class RulesDecoration extends Decoration {

    constructor(rulesPhysic) {
        super();
        console.assert(rulesPhysic.rules);
        this._physic = rulesPhysic;
        this._rules = new Group();
        Context.canvas.addObserver(this);
    }

    _init() {
        this.refresh();
    }

    refresh() {
        this._rules.clear();
        for (let x of this._physic.rules.x) {
            let line = new Line(x.pos, -this._element.height/2, x.pos, this._element.height/2);
            line.attrs({stroke:Colors.RED});
            this._rules.add(line);
        }
        for (let y of this._physic.rules.y) {
            let line = new Line(-this._element.width/2, y.pos, this._element.width/2, y.pos);
            line.attrs({stroke:Colors.RED});
            this._rules.add(line);
        }
        this._adjustLinesAspect(Context.canvas.zoom);
    }

    _adjustLinesAspect(zoom) {
        for (let line of this._rules.children) {
            line.attrs({stroke_width:1/zoom, stroke_dasharray:[6/zoom, 4/zoom]});
        }
    }

    _setElement(element) {
        super._setElement(element);
        element.addObserver(this);
    }

    _checksElements(elements) {
        for (let element of elements) {
            if (this._physic.accept(element)) return true;
        }
        return false;
    }

    _notified(source, event, value) {
        if (source===this._element) {
            if (event===Events.ADD || event===Events.REMOVE || event===Events.MOVE) {
                this.refresh();
            }
            else if (event===Events.HOVER) {
                if (this._checksElements(value)) {
                    if (!this._root.contains(this._rules)) this._root.add(this._rules);
                }
                else {
                    if (this._root.contains(this._rules)) this._root.remove(this._rules);
                }
            }
        }
        else if (source===Context.canvas && event===Events.ZOOM) {
            this._adjustLinesAspect(Context.canvas.zoom);
        }
    }

    clone(duplicata) {
        return new RulesDecoration(duplicata.get(this._physic));
    }

}

export class SAPRecord {

    constructor(element, sweepAndPrune, ...args) {
        this._sweepAndPrune = sweepAndPrune;
        this.createBounds(element, ...args);
    }

    _createBound(element) {
        let geometry = this._element.localGeometry;
        let widthSlim = same(geometry.left, geometry.right);
        let heightSlim = same(geometry.top, geometry.bottom);
        let bound = {
            left: {first: true, value: geometry.left, slim:widthSlim, element, index: -1, opened: new ESet([element])},
            right: {first: false, value: geometry.right, slim:widthSlim, element, index: -1, opened: new ESet()},
            top: {first: true, value: geometry.top, slim:heightSlim, element, index: -1, opened: new ESet([element])},
            bottom: {first: false, value: geometry.bottom, slim:heightSlim, element, index: -1, opened: new ESet()}
        };
        bound.left.index = this._sweepAndPrune._xAxis.length;
        bound.right.index = this._sweepAndPrune._xAxis.length + 1;
        this._sweepAndPrune._xAxis.push(bound.left, bound.right);
        bound.top.index = this._sweepAndPrune._yAxis.length;
        bound.bottom.index = this._sweepAndPrune._yAxis.length + 1;
        this._sweepAndPrune._yAxis.push(bound.top, bound.bottom);
        this._sweepAndPrune._xAxis.dirty = 2;
        this._sweepAndPrune._yAxis.dirty = 2;
        return bound;
    }

    createBounds(element) {
        this._element = element;
        this._x = this._element.lx;
        this._y = this._element.ly;
        this._bound = this._createBound(element);
    }

    get bounds() {
        return new List(this._bound);
    }

    _removeBound(bound) {
        bound.left.removed = true;
        bound.right.removed = true;
        bound.top.removed = true;
        bound.bottom.removed = true;
    }

    remove() {
        this._removeBound(this._bound);
        this._sweepAndPrune._xAxis.dirty = 2;
        this._sweepAndPrune._yAxis.dirty = 2;
    }

    _updateBound(bound) {
        let geometry = this._element.localGeometry;
        this._bound.left.value = geometry.left;
        this._bound.right.value = geometry.right;
        this._bound.top.value = geometry.top;
        this._bound.bottom.value = geometry.bottom
    }

    update() {
        this._x = this._element.lx;
        this._y = this._element.ly;
        this._updateBound(this._bound);
        if (!this._sweepAndPrune._xAxis.dirty) {
            this._sweepAndPrune._xAxis.dirty=1;
        } else {
            this._sweepAndPrune._xAxis.dirty++;
        }
        if (!this._sweepAndPrune._yAxis.dirty) {
            this._sweepAndPrune._yAxis.dirty=1;
        } else {
            this._sweepAndPrune._yAxis.dirty++;
        }
    }

    left(element) {
        return this._bound.left.value;
    }

    right(element) {
        return this._bound.right.value;
    }

    top(element) {
        return this._bound.top.value;
    }

    bottom(element) {
        return this._bound.bottom.value;
    }

    x(element) {
        return this._x;
    }

    y(element) {
        return this._y;
    }

}

export class SweepAndPrune {

    constructor() {
        this._elements = new Map();
        this._xAxis = new List();
        this._yAxis = new List();
    }

    clear() {
        this._elements.clear();
        this._xAxis.clear();
        this._yAxis.clear();
    }

    get elements() {
        return this._elements.keys();
    }

    left(element) {
        let record = this._getRecord(element);
        return record ? record.left(element) : null;
    }

    right(element) {
        let record = this._getRecord(element);
        return record ? record.right(element) : null;
    }

    top(element) {
        let record = this._getRecord(element);
        return record ? record.top(element) : null;
    }

    bottom(element) {
        let record = this._getRecord(element);
        return record ? record.bottom(element) : null;
    }

    has(element) {
        return this._elements.has(element);
    }

    add(element) {
        if (!this.has(element)) {
            let record = this._createRecord(element);
            this._elements.set(element, record);
            return true;
        }
        return false;
    }

    remove(element) {
        if (this.has(element)) {
            let record = this._getRecord(element);
            record.remove();
            this._elements.delete(element);
            return true;
        }
        return false;
    }

    update(element) {

        let updateOnAxis = (axis, startBoundary, endBoundary) => {
            // 1st case : the starting bound is moved back
            let index = startBoundary.index;
            while (index > 0 && this._comparator(axis[index - 1], startBoundary) > 0) {
                let otherBoundary = axis[index - 1];
                axis[index - 1] = startBoundary;
                axis[index] = otherBoundary;
                startBoundary.index = index - 1;
                otherBoundary.index = index;
                otherBoundary.opened.add(startBoundary.element);
                if (otherBoundary.first) {
                    startBoundary.opened.delete(otherBoundary.element);
                } else {
                    startBoundary.opened.add(otherBoundary.element);
                }
                index--;
            }

            // 2nd case : the ending bound is moved forward
            index = endBoundary.index;
            while (
                index < axis.length - 1 &&
                this._comparator(axis[index + 1], endBoundary) < 0
                ) {
                let otherBoundary = axis[index + 1];
                axis[index + 1] = endBoundary;
                axis[index] = otherBoundary;
                endBoundary.index = index + 1;
                otherBoundary.index = index;
                otherBoundary.opened.add(endBoundary.element);
                if (otherBoundary.first) {
                    endBoundary.opened.add(otherBoundary.element);
                } else {
                    endBoundary.opened.delete(otherBoundary.element);
                }
                index++;
            }

            // 3nd case : the starting bound is moved forward
            index = startBoundary.index;
            while (
                index < axis.length - 1 &&
                this._comparator(axis[index + 1], startBoundary) < 0
                ) {
                let otherBoundary = axis[index + 1];
                axis[index + 1] = startBoundary;
                axis[index] = otherBoundary;
                startBoundary.index = index + 1;
                otherBoundary.index = index;
                otherBoundary.opened.delete(startBoundary.element);
                if (otherBoundary.first) {
                    startBoundary.opened.add(otherBoundary.element);
                } else {
                    startBoundary.opened.delete(otherBoundary.element);
                }
                index++;
            }

            // last case : the ending bound is moved back
            index = endBoundary.index;
            while (index > 0 && this._comparator(axis[index - 1], endBoundary) > 0) {
                let otherBoundary = axis[index - 1];
                axis[index - 1] = endBoundary;
                axis[index] = otherBoundary;
                endBoundary.index = index - 1;
                otherBoundary.index = index;
                otherBoundary.opened.delete(endBoundary.element);
                if (otherBoundary.first) {
                    endBoundary.opened.delete(otherBoundary.element);
                } else {
                    endBoundary.opened.add(otherBoundary.element);
                }
                index--;
            }
        };

        evaluate("SAP update element collisions", () => {
            let record = this._getRecord(element);
            record.update();
            if (this._xAxis.dirty >= 2 || this._yAxis.dirty >= 2) {
                this.updateInternals();
            } else {
                for (let bound of record.bounds) {
                    updateOnAxis(this._xAxis, bound.left, bound.right);
                    updateOnAxis(this._yAxis, bound.top, bound.bottom);
                }
                delete this._xAxis.dirty;
                delete this._yAxis.dirty;
            }
        });
    }

    _createRecord(element) {
        return new SAPRecord(element, this);
    }

    _getRecord(element) {
        return this._elements.get(element);
    }

    elementsInPoint(x, y) {
        this.updateInternals();
        let collectedOnX = new ESet();
        let index = dichotomousSearch(this._xAxis, x, (v, b) => v - b.value);
        if (index > 0) {
            for (let element of this._xAxis[index - 1].opened) {
                // Verify that element may collide only on x axis because if element not selected here, it cannot be
                // processed thereafter
                if (!element.mayNotCollide) {
                    collectedOnX.add(element);
                }
            }
        }
        let result = new List();
        index = dichotomousSearch(this._yAxis, y, (v, b) => v - b.value);
        if (index > 0) {
            for (let element of this._yAxis[index - 1].opened) {
                if (collectedOnX.delete(element)) {
                    result.add(element);
                }
            }
        }
        return result;
    }

    elementBox(element) {
        this.updateInternals();
        let record = this._getRecord(element);
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        let bottom = record.bottom(element);
        return new Box(left, top, right-left, bottom-top)
    }

    elementsInBox(left, top, right, bottom) {
        this.updateInternals();
        let collectedOnX = new ESet();
        let index = dichotomousSearch(this._xAxis, left, (v, b) => v - b.value);
        if (index > 0 && index < this._xAxis.length && this._xAxis[index].value > left) index--;
        while ( this._xAxis[index] && this._xAxis[index].value < right) {
            for (let element of this._xAxis[index].opened) {
                // Verify that element may collide only on x axis because if element not selected here, it cannot be
                // processed thereafter
                if (!element.mayNotCollide) {
                    collectedOnX.add(element);
                }
            }
            index++;
        }
        let result = new List();
        index = dichotomousSearch(this._yAxis, top, (v, b) => v - b.value);
        if (index > 0 && index < this._yAxis.length && this._yAxis[index].value > top) index--;
        while (this._yAxis[index] && this._yAxis[index].value < bottom) {
            for (let element of this._yAxis[index].opened) {
                if (collectedOnX.delete(element)) {
                    result.add(element);
                }
            }
            index++;
        }
        return result;
    }

    _comparator(e1, e2) {
        let diff = e1.value - e2.value;
        if (diff) return diff;
        // Same value... more complicated...
        // Same element = slim element : first bound is before last bound
        if (e1.element === e2.element) {
            return e1.first ? -1 : 1;
        }
        // Not same element
        else if (e1.first === e2.first) {
            // if an "element" is slim (width=0 or height=0), it is before or after the other element but cannot be
            // "inside" the "fat" element
            let e1w = e1.slim === e1.first ? 0 : 1; // XOR slim and first
            let e2w = e2.slim === e2.first ? 0 : 1;
            return e1w - e2w;
        }
        // Deux éléments avec des bornes différentes : la "fin" de l'un précède le "début" de l'autre (afin qu'ils apparaissent disjoints)
        else {
            return e1.first ? 1 : -1;
        }
    }

    updateInternals() {
        if (this._xAxis.dirty) {
            insertionSort(this._xAxis, this._comparator);
            for (let index = 0; index < this._xAxis.length; index++) {
                this._xAxis[index].index = index;
            }
            let opened = new List();
            for (let boundary of this._xAxis) {
                if (boundary.first) {
                    opened.add(boundary.element);
                    boundary.opened = new ESet(opened);
                } else {
                    opened.remove(boundary.element);
                    boundary.opened = new ESet(opened);
                }
            }
            delete this._xAxis.dirty;
        }
        if (this._yAxis.dirty) {
            insertionSort(this._yAxis, this._comparator);
            for (let index = 0; index < this._yAxis.length; index++) {
                this._yAxis[index].index = index;
            }
            let opened = new List();
            for (let boundary of this._yAxis) {
                if (boundary.first) {
                    opened.add(boundary.element);
                    boundary.opened = new ESet(opened);
                } else {
                    opened.remove(boundary.element);
                    boundary.opened = new ESet(opened);
                }
            }
            delete this._yAxis.dirty;
        }
    }

    collideWith(box) {
        let result = this.elementsInBox(
            box.left+COLLISION_MARGIN,
            box.top+COLLISION_MARGIN,
            box.right-COLLISION_MARGIN,
            box.bottom-COLLISION_MARGIN
        );
        return result;
    }

    near(element, left=1, top=1, right=1, bottom=1) {
        let record = this._getRecord(element);
        if (!record) return new List();
        let result = this.elementsInBox(
            record.left(element) -left,
            record.top(element) -top,
            record.right(element) +right,
            record.bottom(element) +bottom
        );
        result.remove(element);
        return result;
    }
}

export function makeCollisionPhysic(superClass) {

    superClass.prototype._init = function(...args) {
        this._elements = new ESet();
        this._supportSAP = new SweepAndPrune();
        this._dragAndDropSAP = new SweepAndPrune();
    };

    superClass.prototype._refresh = function() {
        //this._supportSAP.updateInternals();
    };

    superClass.prototype._reset = function() {
        this._elements = this._acceptedElements(this._host.children);
        this._supportSAP.clear();
        for (let element of this._elements) {
            this._supportSAP.add(element);
        }
    };

    superClass.prototype.hover = function(elements) {
        this._hover(this._managedElements(elements));
    };

    superClass.prototype._hover = function(elements) {
        this._hoveredElements = new List(...elements);
        let inSAP = this._acceptedElements(this._dragAndDropSAP.elements);
        for (let element of this._hoveredElements) {
            if (inSAP.has(element)) {
                inSAP.delete(element);
                this._dragAndDropSAP.update(element);
            }
            else {
                this._dragAndDropSAP.add(element);
            }
        }
        for (let element of inSAP) {
            this._dragAndDropSAP.remove(element);
        }
        this._dragAndDropSAP.updateInternals();
        this._avoidCollisionsForElements(this._hoveredElements);
    };

    superClass.prototype._add = function(element) {
        this._elements.add(element);
        this._supportSAP.add(element);
    };

    superClass.prototype._remove = function(element) {
        this._elements.delete(element);
        this._supportSAP.remove(element);
    };

    superClass.prototype._move = function(element) {
        this._supportSAP.update(element);
    };

    superClass.prototype._draggedCollideWith = function(element, exclude) {
        let elementBox = this._dragAndDropSAP.elementBox(element);
        let collisions = new List(
            ...this._supportSAP.collideWith(elementBox),
            ...this._dragAndDropSAP.collideWith(elementBox)
        );
        let result = new List();
        for (let target of collisions) {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (!exclude.has(target) &&
                elementBox.intersects(sweepAndPrune.elementBox(target))) {
                result.add(target);
            }
        }
        return result;
    };

    superClass.prototype.sweepAndPrune = function(element) {
        if (this._dragAndDropSAP.has(element)) {
            return this._dragAndDropSAP;
        }
        else {
            return this._supportSAP;
        }
    };

    /**
     * Fix the position of a DRAGGED element (NEVER an element already contained by the host of the physic) so this
     * element (if possible...) does not collide with another one (dragged of already on host).
     * @param element element to fix
     * @param exclude elements to exclude from processing (these element are those that are not already processed so
     * their positions are not relevant).
     * @private
     */
    superClass.prototype._avoidCollisionsForElement = function(element, exclude) {

        /**
         * Set the fixed position of the element and update physics internal structures accordingly. Note that this
         * element is ALWAYS a DnD'ed one.
         * @param element element to displace.
         * @param x new X ccords of the element
         * @param y new Y coords of the element.
         */
        let put = (element, x, y) => {
            // setLocation(), not move(), on order to keep the DnD fluid (floating elements not correlated).
            element.setLocation(x, y);
            this._dragAndDropSAP.update(element);
        };

        /**
         * Get a proposition on the X axis. This proposition is the nearest position between the one given by "mouse"
         * toward the "original" (= lasted valid) position of the element.
         * @param target element to "avoid".
         * @param ox original position
         * @param hx the proposition.
         * @returns {*}
         */
        let adjustOnX = (target, ox, hx) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (ox > hx) {
                let rx = sweepAndPrune.right(target) + element.width / 2;
                return ox+COLLISION_MARGIN < rx || same(rx, hx) ? null : rx;
            } else if (ox < hx) {
                let rx = sweepAndPrune.left(target) - element.width / 2;
                return ox-COLLISION_MARGIN > rx || same(rx, hx) ? null : rx;
            } else return null;
        };

        /**
         * Get a proposition on the Y axis. This proposition is the nearest position between the one given by "mouse"
         * toward the "original" (= lasted valid) position of the element.
         * @param target element to "avoid".
         * @param oy original position
         * @param hy the proposition.
         * @returns {*}
         */
        let adjustOnY = (target, oy, hy) => {
            let sweepAndPrune = this.sweepAndPrune(target);
            if (oy > hy) {
                let ry = sweepAndPrune.bottom(target) + element.height / 2;
                return oy < ry || same(ry, hy) ? null : ry;
            } else if (oy+COLLISION_MARGIN < hy) {
                let ry = sweepAndPrune.top(target) - element.height / 2;
                return oy-COLLISION_MARGIN > ry || same(ry, hy) ? null : ry;
            } else return null;
        };

        let adjust = function(targets) {
            for (let target of targets) {
                let fx = adjustOnX(target, ox, hx);
                let fy = adjustOnY(target, oy, hy);
                if (fx!==null || fy!==null) {
                    return {fx, fy};
                }
            }
            return { fx:null, fy:null };
        };

        exclude.add(element);
        let sx = element.lx, sy = element.ly;
        let hx = sx, hy = sy;
        let finished = false;
        let originMatrix = this._host.global;
        let invertedMatrix = originMatrix.invert();
        // Coords of last valid position of the element (we have to "go" in this direction...)
        let ox = invertedMatrix.x(element._drag.validX, element._drag.validY);
        let oy = invertedMatrix.y(element._drag.validX, element._drag.validY);
        // In order to avoid (= bug ?) infinite loop
        let cycleCount = 0;
        while (!finished && cycleCount < 100) {
            cycleCount++;
            let targets = this._draggedCollideWith(element, exclude);
            if (targets.length > 0) {
                // Get a proposition
                let {fx, fy} = adjust(targets);
                // First case : we have to choice between X and Y : we get the smallest
                if (fx !== null && fy !== null) {
                    let dx = hx > fx ? hx - fx : fx - hx;
                    let dy = hy > fy ? hy - fy : fy - hy;
                    if (dx > dy) {
                        hy = fy;
                    } else {
                        hx = fx;
                    }
                // 2nd case : only one dimension is available
                } else if (fx !== null) {
                    hx = fx;
                } else if (fy !== null) {
                    hy = fy;
                } else {
                    // Last case : no proposition is available. We revert to last valid position
                    hx = ox;
                    hy = oy;
                    finished = true;
                }
                put(element, hx, hy);
            } else {
                finished = true;
            }
        }
        // If final position is "too far" from "mouse" position, revert to mouse position, but mark element drag as
        // invalid.
        if (Math.abs(hx - sx) > ADJUST_MARGIN || Math.abs(hy - sy) > ADJUST_MARGIN) {
            put(element, sx, sy, true);
            element._drag.invalid = true;
        } else {
            // Fixing accepted: update drag infos.
            element._drag.validX = element.gx;
            element._drag.validY = element.gy;
            delete element._drag.invalid;
        }
        exclude.delete(element);
    };

    superClass.prototype._avoidCollisionsForElements = function(elements) {
        let exclude = new ESet(elements);
        for (let element of elements) {
            evaluate("avoid collision for element", () => {
                this._avoidCollisionsForElement(element, exclude);
            });
        }
    };

    return superClass;
}

export class PhysicBorder {

    constructor(physic, x, y, width, height) {
        this._physic = physic;
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }

    get lx() {
        return this._x();
    }

    get ly() {
        return this._y();
    }

    get localGeometry() {
        return new Box(this._x()-this._width()/2, this._y()-this._height()/2, this._width(), this._height());
    }
}

export function addBordersToCollisionPhysic(superClass, {bordersCollide}) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        if (bordersCollide.left || bordersCollide.all) {
            this._addLeftBorder();
        }
        if (bordersCollide.right || bordersCollide.all) {
            this._addRightBorder();
        }
        if (bordersCollide.top || bordersCollide.all) {
            this._addTopBorder();
        }
        if (bordersCollide.bottom || bordersCollide.all) {
            this._addBottomBorder();
        }
        this._trigger();
    };

    superClass.prototype._addLeftBorder = function() {
        this._leftBorder = new PhysicBorder(
            this,
            () => -this.host.width / 2,
            () => 0,
            () => 0,
            () => this.host.height
        );
        this._supportSAP.add(this._leftBorder);
        return this;
    };

    superClass.prototype._addRightBorder = function() {
        this._rightBorder = new PhysicBorder(
            this,
            () => this.host.width / 2,
            () => 0,
            () => 0,
            () => this.host.height
        );
        this._supportSAP.add(this._rightBorder);
        return this;
    };

    superClass.prototype._addTopBorder = function() {
        this._topBorder = new PhysicBorder(
            this,
            () => 0,
            () => -this.host.height / 2,
            () => this.host.width,
            () => 0
        );
        this._supportSAP.add(this._topBorder);
        return this;
    };

    superClass.prototype._addBottomBorder = function() {
        this._bottomBorder = new PhysicBorder(
            this,
            () => 0,
            () => this.host.height / 2,
            () => this.host.width,
            () => 0
        );
        this._supportSAP.add(this._bottomBorder);
        return this;
    };

    let reset = superClass.prototype._reset;
    superClass.prototype._reset = function() {
        reset.call(this);
        this._leftBorder && this._supportSAP.add(this._leftBorder);
        this._rightBorder && this._supportSAP.add(this._rightBorder);
        this._topBorder && this._supportSAP.add(this._topBorder);
        this._bottomBorder && this._supportSAP.add(this._bottomBorder);
    };

}

export function createCollisionPhysic({predicate}) {
    class CollisionPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeCollisionPhysic(CollisionPhysic);
    return CollisionPhysic;
}

export function makeCollisionContainer(superClass, {predicate, bordersCollide = null}) {
    let ContainerPhysic = createCollisionPhysic({predicate});
    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, {bordersCollide});
    }
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });
    return superClass;
}

class Ground {

    constructor(physic) {
        this._physic = physic;
        this._segments = new AVLTree((s1, s2)=>{
            let value = s1.right-s2.right;
            return value ? value : s1.id-s2.id;
        });
    }

    duplicate() {
        let duplicates = new Ground(this._physic);
        duplicates._segments = new AVLTree(this._segments);
        return duplicates;
    }

    process(element, update=true) {

        function setCarriedBy(element, under, supports) {
            element._fall.carriers = new ESet(supports);
            for (let support of under) {
                if (!support._fall.under) support._fall.under = new ESet();
                support._fall.under.add(element);
            }
            for (let support of supports) {
                if (!support._fall.carried) support._fall.carried = new ESet();
                support._fall.carried.add(element);
            }
        }

        function filterInside(segments, left, right) {
            let it = segments.inside({right:left+COLLISION_MARGIN, id:0}, null);
            let insideSegments = [];
            let segment = it.next().value;
            while (segment && segment.left+COLLISION_MARGIN < right) {
                insideSegments.push(segment);
                segment = it.next().value;
            }
            return insideSegments;
        }

        let id = 1;
        let record = this._physic._supportSAP._getRecord(element);
        let left = record.left(element);
        let right = record.right(element);
        let top = record.top(element);
        let ground = this._physic._host.bottom;
        let supports = new ESet();
        let under = new ESet();
        for (let segment of filterInside(this._segments, left, right)) {
            under.add(segment.element);
            if (same(segment.top, ground)) {
                supports.add(segment.element);
            }
            else if (segment.top < ground) {
                ground = segment.top;
                supports = new ESet([segment.element]);
            }
            if (segment.left < left) {
                this._segments.insert({
                    left:segment.left, right:left, id:id++, top:segment.top, element:segment.element
                });
            }
            if (segment.right > right) {
                segment.left = right;
            }
            else {
                this._segments.delete(segment);
            }
        }
        if (update && this._physic._canFall(element)) {
            let ly = ground - (record.bottom(element) - record.y(element));
            if (ly !== element.ly) {
                element.setLocation(record.x(element), ly);
                this._physic._supportSAP.update(element);
                top = record.top(element);
            }
        }
        setCarriedBy(element, under, supports);
        this._segments.insert({left, right, id:id++, top, element});
    }

}

export function addGravitationToCollisionPhysic(superClass, {
    gravitationPredicate = element=>true,
    carryingPredicate = (carrier, carried, dx, dy)=>true
}={}) {

    superClass.prototype._setCarried = function(elements) {
        for (let element of elements) {
            if (element.isCarriable && element._fall.carriers) {
                for (let support of element._fall.carriers) {
                    let dx = element.lx-support.lx;
                    let dy = element.ly-support.ly;
                    if (support.isCarrier && carryingPredicate(support, element, dx, dy)) {
                        support.addCarried(element);
                    }
                }
            }
            delete element._fall;
        }
    };

    superClass.prototype._canFall = function(element) {
        return gravitationPredicate.call(this, element);
    };

    superClass.prototype._letFall = function(elements, ground) {

        let comparator = (e1, e2)=> {
            let b1 = this._supportSAP.bottom(e1);
            let b2 = this._supportSAP.bottom(e2);
            return b2-b1;
        };

        elements.sort(comparator);
        for (let element of elements) {
            ground.process(element);
        }
    };

    superClass.prototype._processElements = function() {
        let elements = new List(...this._elements);
        for (let element of elements) {
            element._clearCarried && element._clearCarried();
            element._clearCarriedBy && element._clearCarriedBy();
            element._fall = {};
        }
        this._letFall(elements, new Ground(this));
        this._setCarried(elements);
    };

    let refresh = superClass.prototype._refresh;
    superClass.prototype._refresh = function() {
        refresh.call(this);
        this._processElements();
    };

    return superClass;
}

export function createGravitationPhysic({predicate, gravitationPredicate, carryingPredicate}) {
    class GravitationPhysic extends createCollisionPhysic({predicate}) {

        constructor(host, ...args) {
            super(host, ...args);
        }
    }
    addGravitationToCollisionPhysic(GravitationPhysic, {gravitationPredicate, carryingPredicate});
    return GravitationPhysic;
}

export function makeGravitationContainer(superClass, {
    predicate, gravitationPredicate, carryingPredicate, bordersCollide = null
}) {
    let ContainerPhysic = createGravitationPhysic({predicate, gravitationPredicate, carryingPredicate});
    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, {bordersCollide});
    }

    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });

    return superClass;
}

export function makeCarrier(superClass) {

    Object.defineProperty(superClass.prototype, "isCarrier", {
        configurable:true,
        get() {
            return true;
        }
    });

    Object.defineProperty(superClass.prototype, "carried", {
        configurable:true,
        get() {
            return this._carried ? this._carried.keys() : [];
        }
    });

    superClass.prototype.addCarried = function(element) {
        if (element.__addCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._addCarried(element);
        }
    };

    superClass.prototype.removeCarried = function(element) {
        if (element.__removeCarriedBy) {
            Memento.register(this);
            Memento.register(element);
            this._removeCarried(element);
        }
    };

    superClass.prototype.__addCarried = function(element, record) {
        if (!this._carried) {
            this._carried = new Map();
        }
        this._carried.set(element, record);
    };

    superClass.prototype.__removeCarried = function(element) {
        if (this._carried) {
            this._carried.delete(element);
            if (!this._carried.size) {
                delete this._carried;
            }
        }
    };

    superClass.prototype._addCarried = function(element) {
        this.__addCarried(element, new CloneableObject({
            dx:element.lx-this.lx,
            dy:element.ly-this.ly
        }));
        element.__addCarriedBy(this);
    };

    superClass.prototype._removeCarried = function(element) {
        this.__removeCarried(element);
        element.__removeCarriedBy(this);
    };

    superClass.prototype._clearCarried = function() {
        delete this._carried;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function(extension) {
        let elemExtension = getExtension ? getExtension.call(this, extension) : new ESet();
        extension = extension ? extension.merge(elemExtension) : elemExtension;
        if (this._carried) {
            for (let element of this._carried.keys()) {
                if (!extension.has(element)) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension(extension)) {
                            extension.add(child);
                        }
                    }
                }
            }
        }
        return extension
    };

    let move = superClass.prototype.move;
    superClass.prototype.move = function(x, y) {
        if (move.call(this, x, y)) {
            if (this._carried) {
                for (let element of this._carried.keys()) {
                    let record = this._carried.get(element);
                    if (element.support === this.support) {
                        element.move(this.lx + record.dx, this.ly + record.dy);
                    }
                }
            }
            return true;
        }
        return false;
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._carried.get(element);
                copy.__addCarried(childCopy, record);
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                let record = this._carried.get(element);
                element.__addCarriedBy(this, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._carried) {
            for (let element of this._carried.keys()) {
                this.removeCarried(element);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._carried) {
            memento._carried = new Map(this._carried);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._carried) {
            this._carried = new Map(memento._carried);
        }
        else {
            delete this._carried;
        }
        return this;
    };

    return superClass;
}

export function makeCarriable(superClass) {

    Object.defineProperty(superClass.prototype, "isCarriable", {
        configurable:true,
        get() {
            return true;
        }
    });

    Object.defineProperty(superClass.prototype, "carriers", {
        configurable:true,
        get() {
            return this._carriedBy ? this._carriedBy.keys() : [];
        }
    });

    superClass.prototype._clearCarriedBy = function() {
        delete this._carriedBy;
    };

    superClass.prototype.__addCarriedBy = function(element, record) {
        if (!this._carriedBy) {
            this._carriedBy = new Map();
        }
        this._carriedBy.set(element, record);
    };

    superClass.prototype.__removeCarriedBy = function(element) {
        if (this._carriedBy) {
            this._carriedBy.delete(element);
            if (!this._carriedBy.size) {
                delete this._carriedBy;
            }
        }
    };

    superClass.prototype.clearCarriedBy = function() {
        if (this._carriedBy) {
            for (let support of [...this._carriedBy.keys()]) {
                support.removeCarried(this);
            }
        }
    };

    let draggedFrom = superClass.prototype._draggedFrom;
    superClass.prototype._draggedFrom = function(support, dragSet) {
        draggedFrom && draggedFrom.call(this, support, dragSet);
        if (this._carriedBy) {
            for (let support of [...this._carriedBy.keys()]) {
                if (!dragSet.has(support)) {
                    support.removeCarried(this);
                }
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                let record = this._carriedBy.get(element);
                element.__addCarried(this, record);
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._carriedBy.get(element);
                copy.__addCarriedBy(childCopy, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._carriedBy) {
            for (let element of this._carriedBy.keys()) {
                element.removeCarried(this);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._carriedBy) {
            memento._carriedBy = new Map(this._carriedBy);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._carriedBy) {
            this._carriedBy = new Map(memento._carriedBy);
        }
        else {
            delete this._carriedBy;
        }
        return this;
    };

    return superClass;
}

export const Glue = {
    NONE:0,         // Elements should not be glued
    EXTEND:1,       // Elements should be glued. This element must add glued element to its extension
    BREAK:2         // Elements should be glued. This element must not add glued element to its extension
};

export function makeDroppedElementsToGlue(superClass, {gluingStrategy=(element1, element2)=>Glue.EXTEND}={}) {

    let receiveDrop = superClass.prototype._receiveDrop;
    superClass.prototype._receiveDrop = function(element, dragSet) {
        receiveDrop.call(this);
        if (element.isGlueable) {
            let alreadyGlued = element.getGlued(true, true, true, true);
            let gluedElements = this._supportSAP.near(element, 1, 1, 1, 1);
            for (let neighbour of gluedElements) {
                if (!alreadyGlued.has(neighbour)) {
                    if (gluingStrategy(element, neighbour)!==Glue.NONE) {
                        element.glue(neighbour, gluingStrategy);
                    }
                }
                else {
                    alreadyGlued.delete(neighbour);
                }
            }
            for (let neighbour of alreadyGlued) {
                element.unglue(neighbour);
            }
        }
    };

    return superClass;
}

export function makeGlueable(superClass) {

    Object.defineProperty(superClass.prototype, "isGlueable", {
        configurable:true,
        get() {
            return true;
        }
    });

    superClass.prototype.__glue = function(element, record) {
        if (!this._gluedWith) {
            this._gluedWith = new Map();
        }
        this._gluedWith.set(element, record);
    };

    superClass.prototype.__unglue = function(element) {
        if (this._gluedWith) {
            this._gluedWith.delete(element);
            if (!this._gluedWith.size) {
                delete this._gluedWith;
            }
        }
    };

    superClass.prototype._glue = function(element, strategy) {
        this.__glue(element, this._createRecord(element, strategy));
        element.__glue(this, element._createRecord(this, strategy));
    };

    superClass.prototype._unglue = function(element) {
        this.__unglue(element);
        element.__unglue(this);
    };

    superClass.prototype.glue = function(element, strategy=(element1, element2)=>Glue.EXTEND) {
        if (element.isGlueable && (!this._gluedWith || !this._gluedWith.has(element))) {
            Memento.register(this);
            Memento.register(element);
            this._glue(element, strategy);
        }
    };

    superClass.prototype.unglue = function(element) {
        if (element.isGlueable && this._gluedWith && this._gluedWith.has(element)) {
            Memento.register(this);
            Memento.register(element);
            this._unglue(element);
        }
    };

    superClass.prototype._createRecord = function(element, strategy) {
        return new CloneableObject({
            dx: element.lx - this.lx,
            dy: element.ly - this.ly,
            strategy
        })
    };

    superClass.prototype.clearGlued = function() {
        if (this._gluedWith) {
            for (let element of [...this._gluedWith.keys()]) {
                this.unglue(element);
            }
        }
    };

    Object.defineProperty(superClass.prototype, "gluedWith", {
        configurable:true,
        get() {
            return this._gluedWith ? this._gluedWith.keys() : [];
        }
    });

    superClass.prototype.getGlued = function(left = true, top = true, right = true, bottom = true) {
        let gluedWidth = new ESet();
        if (this._gluedWith) {
            let tlx = this.lx, tly = this.ly, tw = this.width/2-COLLISION_MARGIN, th = this.height/2-COLLISION_MARGIN;
            for (let neighbour of this._gluedWith) {
                let nlx = neighbour.lx, nly = neighbour.ly,
                    nw = neighbour.width / 2 - COLLISION_MARGIN, nh = neighbour.height / 2 - COLLISION_MARGIN;
                if (left && nlx + nw <= tlx - tw) gluedWidth.add(neighbour);
                else if (top && nly + nh <= tly - th) gluedWidth.add(neighbour);
                else if (right && nlx - nw >= tlx + tw) gluedWidth.add(neighbour);
                else if (bottom && nly - nh >= tly + th) gluedWidth.add(neighbour);
            }
        }
        return gluedWidth;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function(extension) {
        let elemExtension = getExtension ? getExtension.call(this, extension) : new ESet();
        extension = extension ? extension.merge(elemExtension) : elemExtension;
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                let record = this._gluedWith.get(element);
                if (!extension.has(element) && record.strategy(this, element, record.dx, record.dy)===Glue.EXTEND) {
                    extension.add(element);
                    if (element.getExtension) {
                        for (let child of element.getExtension(extension)) {
                            extension.add(child);
                        }
                    }
                }
            }
        }
        return extension
    };

    let draggedFrom = superClass.prototype._draggedFrom;
    superClass.prototype._draggedFrom = function(support, dragSet) {
        draggedFrom && draggedFrom.call(this, support, dragSet);
        if (this._gluedWith) {
            for (let element of [...this._gluedWith.keys()]) {
                let record = this._gluedWith.get(element);
                if (record.strategy(this, element, record.dx, record.dy)!==Glue.EXTEND && !dragSet.has(element)) {
                    this.unglue(element);
                }
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                element.__glue(this, element._createRecord(this));
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._gluedWith.get(element);
                copy.__glue(childCopy, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._gluedWith) {
            for (let element of this._gluedWith.keys()) {
                element.removeCarried(this);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._gluedWith) {
            memento._gluedWith = new Map(this._gluedWith);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._gluedWith) {
            this._gluedWith = new Map(memento._gluedWith);
        }
        else {
            delete this._gluedWith;
        }
        return this;
    };

    return superClass;
}

export function addGlueToGravitationPhysic(
    superClass) {

    addGravitationToCollisionPhysic(superClass);

    superClass.prototype._getBlocks = function (elements) {

        function setToBlock(blocks, element, block) {
            block.elements.add(element);
            blocks.set(element, block);
            element._fall.block = block;
        }

        let blocks = new Map();
        for (let element of elements) {
            let block = element._fall.block;
            if (!block) {
                block = {
                    elements : new ESet(),
                    bottom : this._supportSAP.bottom(element)
                };
                setToBlock(blocks, element, block);
            }
            if (element.isGlueable) {
                for (let neighbour of element.gluedWith) {
                    let nblock = neighbour._fall.block;
                    if (nblock) {
                        for (let friend of nblock.elements) {
                            setToBlock(blocks, friend, block);
                        }
                    }
                    else {
                        setToBlock(blocks, neighbour, block);
                    }
                }
            }
        }
        return [...new ESet(blocks.values())];
    };

    superClass.prototype._processBlock = function(block) {

        function ascend(element, dy, carrier) {
            if (same(dy, 0)) {
                if (carrier) {
                    element._fall.carriers ? element._fall.carriers.add(carrier) : element._fall.carriers = new ESet([carrier]);
                    carrier._fall.carried ? carrier._fall.carried.add(element) : carrier._fall.carried = new ESet([element]);
                }
            }
            else if (dy > 0) {
                let ly = element.ly - dy;
                let ely = ly - element._fall.ly;
                if (element._fall.block.dy>ely) {
                    element._fall.block.dy = ely;
                }
                element.setLocation(element.lx, ly);
                this._supportSAP.update(element);
                if (element._fall.under) {
                    for (let carried of element._fall.under) {
                        let mdy = this._supportSAP.top(element)-this._supportSAP.bottom(carried);
                        ascend.call(this, carried, -mdy, element);
                    }
                }
                if (carrier) {
                    element._fall.carriers = new ESet([carrier]);
                    carrier._fall.carried = new ESet([element]);
                }
            }
        }

        for (let element of block.elements) {
            let dy = element.ly-element._fall.ly-block.dy;
            ascend.call(this, element, dy, null);
        }
    };

    superClass.prototype._processElements = function() {
        function computeBlockFall(block) {
            block.dy = Infinity;
            for (let element of block.elements) {
                let dy = element.ly - element._fall.ly;
                if (dy<block.dy) block.dy = dy;
            }
        }

        let elements = new List(...this._elements);
        for (let element of elements) {
            element._clearCarried && element._clearCarried();
            element._clearCarriedBy && element._clearCarriedBy();
            element._fall = {ly: element.ly};
        }
        let blocks = this._getBlocks(elements);
        this._letFall(elements, new Ground(this));
        for (let block of blocks) {
            computeBlockFall(block);
        }
        blocks.sort((b1, b2)=>b1.dy - b2.dy);
        for (let block of blocks) {
            this._processBlock(block);
        }
        this._setCarried(this._elements);
    };

    return superClass;
}

export function createStickyGravitationPhysic({
    predicate, gravitationPredicate, carryingPredicate, gluingStrategy
}) {

    class StickyGravitationPhysic extends createGravitationPhysic({
        predicate, gravitationPredicate, carryingPredicate
    }) {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    addGlueToGravitationPhysic(StickyGravitationPhysic);
    if (gluingStrategy) {
        makeDroppedElementsToGlue(StickyGravitationPhysic, {gluingStrategy});
    }
    return StickyGravitationPhysic;
}

export function makeStickyGravitationContainer(superClass, {
    predicate, gravitationPredicate, carryingPredicate,
    gluingStrategy = null,
    bordersCollide
}) {
    class ContainerPhysic extends createStickyGravitationPhysic({
        predicate, gravitationPredicate, carryingPredicate, gluingStrategy
    }) {}

    if (bordersCollide) {
        addBordersToCollisionPhysic(ContainerPhysic, bordersCollide);
    }
    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return new ContainerPhysic(this);
        }
    });
    return superClass;
}
