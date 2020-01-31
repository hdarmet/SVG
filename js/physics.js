'use strict';

import {
    always, assert, defineMethod, replaceMethod, defineGetProperty, extendMethod, defined
} from "./misc.js";
import {
    List, ESet, SpatialLocator, dichotomousSearch
} from "./collections.js";
import {
    Matrix2D
} from "./geometry.js";
import {
    defer, Colors, Line, computePosition, Group, Fill, Translation, Rect, Text, TextAnchor, AlignmentBaseline
} from "./graphics.js";
import {
    Canvas, Memento, Events, makeObservable, Context, Cloning, computeGridStep
} from "./toolkit.js";
import {
    TextDecoration
} from "./standard-mixins.js";
import {
    Arrow
} from "./svgtools.js";
import {
    Decoration
} from "./core-mixins.js";

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
            defer(()=>{
                this.refresh();
            });
            /*
            win.setTimeout(, 0);
            */
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

    managedElements(elements) {
        let managedElements = new List();
        for (let element of elements) {
            if (this.accept(element)) {
                managedElements.add(element);
            }
        }
        return managedElements;
    }

    hover(elements) {
        let managedElements = this.managedElements(elements);
        this._hover(managedElements);
        this._refresh();
        this._host._fire(Physic.events.REFRESH_HOVER, this, managedElements);
        return this;
    }

    refresh() {
        this._triggered = false;
        this._refresh();
        this._host._fire(Physic.events.REFRESH, this);
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
Physic.events = {
    REFRESH : "refresh",
    REFRESH_HOVER : "refresh-hover"
};

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
        elements = this.managedElements(elements);
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

    extendMethod(superClass, $acceptDrop=>
        function _acceptDrop(element, dragSet) {
            if (!this.accept(element)) {
                return false;
            }
            return $acceptDrop.call(this, element, dragSet);
        }
    );

}

export function addPhysicToContainer(superClass, {physicBuilder}) {

    assert(defined(superClass, function _initContent(){}));

    extendMethod(superClass, $initContent=>
        function _initContent(...args) {
            let result = $initContent.call(this, ...args);
            this._initPhysic();
            return result;
        }
    );

    defineMethod(superClass,
        function _initPhysic() {
            this._physic = physicBuilder.call(this);
            return this;
        }
    );

    defineGetProperty(superClass,
        function physic() {
            return this._physic;
        }
    );

    extendMethod(superClass, $addChild=>
        function _addChild(element) {
            $addChild.call(this, element);
            this.physic.add(element);
        }
    );

    extendMethod(superClass, $shiftChild=>
        function _shiftChild(element, x, y) {
            $shiftChild.call(this, element, x, y);
            this.physic.move(element);
        }
    );

    extendMethod(superClass, $insertChild=>
        function _insertChild(previous, element) {
            $insertChild.call(this, previous, element);
            this.physic.add(element);
        }
    );

    extendMethod(superClass, $replaceChild=>
        function _replaceChild(previous, element) {
            $replaceChild.call(this, previous, element);
            this.physic.add(element);
            this.physic.remove(element);
        }
    );

    extendMethod(superClass, $removeChild=>
        function _removeChild(element) {
            $removeChild.call(this, element);
            this.physic.remove(element);
        }
    );

    extendMethod(superClass, $hover=>
        function hover(elements) {
            $hover && $hover.call(this, elements);
            this.physic.hover(elements);
            return this;
        }
    );

    extendMethod(superClass, $setsize=>
        function _setSize(width, height) {
            $setsize && $setsize.call(this, width, height);
            this.physic.resize(width, height);
        }
    );

    extendMethod(superClass, $recover=>
        function _recover(memento) {
            $recover && $recover.call(this, memento);
            this.physic.reset();
        }
    );

    extendMethod(superClass, $acceptDrop=>
        function _acceptDrop(element, dragSet) {
            if ($acceptDrop && !$acceptDrop.call(this, element, dragSet)) return false;
            return this.physic._acceptDrop(element, dragSet);
        }
    );

    extendMethod(superClass, $receiveDrop=>
        function _receiveDrop(element, dragSet) {
            $receiveDrop && $receiveDrop.call(this, element, dragSet);
            this.physic._receiveDrop(element, dragSet);
        }
    );

}

export function makeAbstractPositioningPhysic(superClass) {

    replaceMethod(superClass,
        function _init(...args) {
            this._elements = new ESet();
        }
    );

    replaceMethod(superClass,
        function _refresh() {
            for (let element of this._elements) {
                this._refreshElement(element);
            }
            if (this._hoveredElements) {
                for (let element of this._hoveredElements) {
                    this._refreshHoverElement(element);
                }
            }
            this._elements.clear();
        }
    );

    replaceMethod(superClass,
        function _reset() {
            this._elements = this._acceptedElements(this._host.children);
        }
    );

    replaceMethod(superClass,
        function _hover(elements) {
            this._hoveredElements = new List(...elements);
        }
    );

    replaceMethod(superClass,
        function _add(element) {
            this._elements.add(element);
        }
    );

}

export function makePositioningPhysic(superClass, {
    positionsBuilder,
    clipBuilder = element => {
        return {x: element.lx, y: element.ly};
    }
}) {

    assert(positionsBuilder);
    makeAbstractPositioningPhysic(superClass);

    defineMethod(superClass,
        function _elementPosition(element) {
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
        }
    );

    defineMethod(superClass,
        function _refreshHoverElement(element) {
            let position = this._elementPosition(element);
            if (this._acceptPosition(element, position)) {
                element.move(position.x, position.y);
            }
        }
    );

    defineMethod(superClass,
        function _refreshElement(element) {
            let position = this._elementPosition(element);
            if (this._acceptPosition(element, position)) {
                element.move(position.x, position.y);
                element._positioned && element._positioned(this, position);
            }
        }
    );

    defineMethod(superClass,
        function _acceptPosition(element, position) {
            return element._acceptPosition ? element._acceptPosition(this, position) : !!position;
        }
    );

    replaceMethod(superClass,
        function _acceptDrop(element, dragSet) {
            if (this.accept(element)) {
                let position = this._elementPosition(element);
                return this._acceptPosition(element, position);
            }
            return true;
        }
    );

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
    extendMethod(superClass, $add=>
        function add(element) {
            if (this._addAttachments(element)) {
                delete this._attachments;
            }
            $add.call(this, element);
        }
    );

    defineMethod(superClass,
        function _addAttachments(element) {
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
        }
    );

    extendMethod(superClass, $reset=>
        function _reset() {
            delete this._attachmentsProviders;
            for (let element of this._host.children) {
                this._addAttachments(element);
            }
            this._attachments = null;
            $reset.call(this);
        }
    );

    extendMethod(superClass, $remove=>
        function remove(element) {
            if (slotProviderPredicate.call(this, element)) {
                if (this._attachmentsProviders) {
                    this._attachmentsProviders.remove(element);
                    delete this._attachments;
                }
            }
            $remove.call(this, element);
        }
    );

    extendMethod(superClass, $move=>
        function move(element) {
            if (slotProviderPredicate.call(this, element)) {
                delete this._attachments;
            }
            $move.call(this, element);
        }
    );

    extendMethod(superClass, $resize=>
        function _resize(width, height) {
            this._attachments = null;
            $resize.call(this, width, height);
        }
    );

    defineMethod(superClass,
        function getAttachment(x, y) {
            let attachments = this._attachments.find(x, y, Attachments.MARGIN);
            return attachments.length>0 ? attachments[0] : null;
        }
    );

    defineMethod(superClass,
        function findPosition(element) {
            if (!this._attachments) {
                this._attachments = this._collectAttachments();
            }
            let positions = new List();
            let range = Attachments.RANGE;
            let {x, y} = clipBuilder(element);
            for (let attachment of this._attachments.find(x, y, range)) {
                positions.add({
                    x:attachment.lx,
                    y:attachment.ly,
                    attachment: attachment
                });
            }
            return positions;
        }
    );

    defineMethod(superClass,
        function _collectAttachments() {
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
    );
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
        this._root.matrix = Matrix2D.translate(x, y);
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

    defineMethod(superClass,
        function _addClips(...clips) {
            if (!this._clips) {
                this._clips = new List(...clips);
            }
            else {
                this._clips.push(...clips);
            }
        }
    );

    defineMethod(superClass,
        function _clearClips() {
            delete this._clips;
        }
    );

    defineMethod(superClass,
        function addClips(...clips) {
            if (clips.length) {
                Memento.register(this);
                this._addClips(...clips);
            }
        }
    );

    defineMethod(superClass,
        function clearClips() {
            if (this._clips) {
                Memento.register(this);
                this._clearClips();
            }
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            if (this._clips) {
                memento._clips = new List(...this._clips);
            }
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            if (memento._clips) {
                this._clips = new List(...memento._clips);
            }
            else if (this._clips) {
                delete this._clips;
            }
        }
    );

    extendMethod(superClass, $cloning=>
        function __cloning(duplicata) {
            let copy = $cloning.call(this, duplicata);
            for (let index=0; index<this._clips.length; index++) {
                duplicata.set(this._clips[index], copy._clips[index]);
            }
            return copy;
        }
    );

    extendMethod(superClass, $cloned=>
        function _cloned(copy, duplicata) {
            $cloned && $cloned.call(this, copy, duplicata);
            for (let clip of copy._clips) {
                clip.cloned(duplicata);
            }
        }
    );

    defineGetProperty(superClass,
        function isClipOnCapable() {
            return true;
        }
    );

    defineGetProperty(superClass,
        function clips() {
            return new List(...this._clips);
        }
    );

    defineMethod(superClass,
        function _acceptPosition(physic, position) {

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
        }
    );

    defineMethod(superClass,
        function _positioned(physic, position) {
            let dx = position.x-this.lx;
            let dy = position.y-this.ly;
            for (let index=0; index<this._clips.length; index++) {
                let clip = this._clips[index];
                let slot = physic.getAttachment(clip.lx+dx, clip.ly+dy);
                slot.plug(clip);
            }
        }
    );

}

export function makeSlotsOwner(superClass) {

    defineMethod(superClass,
        function _addSlots(...slots) {
            if (!this._slots) {
                this._slots = new List(...slots);
            }
            else {
                this._slots.push(...slots);
            }
        }
    );

    defineMethod(superClass,
        function _clearSlots() {
            delete this._slots;
        }
    );

    defineMethod(superClass,
        function addSlots(...slots) {
            if (slots.length) {
                Memento.register(this);
                this._addSlots(...slots);
            }
        }
    );

    defineMethod(superClass,
        function clearSlots() {
            if (this._slots) {
                Memento.register(this);
                this._clearSlots();
            }
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            if (this._slots) {
                memento._slots = new List(...this._slots);
            }
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            if (memento._slots) {
                this._slots = new List(...memento._slots);
            }
            else if (this._slots) {
                delete this._slots;
            }
        }
    );

    extendMethod(superClass, $cloned=>
        function _cloned(copy, duplicata) {
            $cloned && $cloned.call(this, copy, duplicata);
            for (let slot of copy._slots) {
                slot.cloned(duplicata);
            }
        }
    );

    defineGetProperty(superClass,
        function slots() {
            return new List(...this._slots);
        }
    );

    defineGetProperty(superClass,
        function attachments() {
            return this.slots;
        }
    );

    replaceMethod(superClass,
        function _dropTarget() {
            return this.parent;
        }
    );

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

export function makeCenteredAnchorage(superClass) {

    defineGetProperty(superClass,
        function anchors() {
            return {
                x:[{pos:this.lx, distance:0}],
                y:[{pos:this.ly, distance:0}]
            };
        }
    );

}

export function makeHorizontalAnchorage(superClass) {

    defineGetProperty(superClass,
        function anchors() {
            return {
                x:[{pos:this.lx, distance:0}]
            };
        }
    );

}

export function makeVerticalAnchorage(superClass) {

    defineGetProperty(superClass,
        function anchors() {
            return {
                y:[{pos:this.ly, distance:0}]
            };
        }
    );

}

export function makeBoundedAnchorage(superClass) {

    defineGetProperty(superClass,
        function anchors() {
            let lgeom = this.localGeometry();
            let lx = this.lx;
            let ly = this.ly;
            return {
                x:[{pos:lgeom.left, distance:lgeom.left-lx}, {pos:lx, distance:0}, {pos:lgeom.right, distance:lgeom.right-lx}],
                y:[{pos:lgeom.top, distance:lgeom.top-ly}, {pos:ly, distance:0}, {pos:lgeom.bottom, distance:lgeom.bottom-ly}]
            };
        }
    );

}

/**
 * Positioning physic that promote valid locations according to rules. A "Rule" is a dynamically computed position on
 * X or Y axis. The rule's position may depend on the element itself, especially its current shape and location.
 * @param superClass class to enhance.
 * @param rulesBuilder function that generates rules.
 * @param anchorsBuilder function that returns element's "anchors" : remarkable points in element's geometry (like
 * centers or corners). These points are those this physic will try to line up with rules's locations.
 * @returns {*}
 */
export function makeRulesPhysic(superClass, {
    rulesBuilder,
    anchorsBuilder = element => element.anchors
}) {

    makeAbstractPositioningPhysic(superClass);

    /**
     * Looks for the most suited element location, according to rules and element's anchorage points: rules are computed
     * and compared to anchorage points. The minimal distance found is selected.
     * @returns an object containing 4 data:
     * <ul>
     *     <li> x: selected location on X axis for the center of the element (even if chosen anchorage point is not
     *     the center).
     *     <li> attachmentX: an informative value that refers to the "element", the rulesBuilder method used to generate
     *     the selected rule. Not used by this physic.
     *     <li> y: selected location on Y axis for the center of the element (even if chosen anchorage point is not
     *     the center).
     *     <li> attachmentY: an informative value that refers to the "element", the rulesBuilder method used to generate
     *     the selected rule. Not used by this physic.
     * </ul>
     */
    defineMethod(superClass,
        function _elementPosition(element) {

            /**
             * Select a rule according to element's anchorage point on a given axis.
             * @param epos anchorage points of processed element
             * @param rules rules to check
             * @returns {*}
             */
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
                return pos !== null ? {pos, attachment} : null;
            }

            let {x: ex, y: ey} = anchorsBuilder(element);
            let {x: rx, y: ry} = rulesBuilder.call(this, element);
            let x = getPosition(ex, rx);
            let y = getPosition(ey, ry);
            if (x !== null || y !== null) {
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
        }
    );

    /**
     * Adjust the location of a dragged element to fit the most suited location given by this physic rules.
     * @param element dragged element
     * @private
     */
    defineMethod(superClass,
        function _refreshHoverElement(element) {
            let position = this._elementPosition(element);
            if (this._acceptPosition(element, position)) {
                let x = position.x!==undefined ? position.x : element.lx;
                let y = position.y!==undefined ? position.y : element.ly;
                element.move(x, y);
            }
        }
    );

    /**
     * Adjust the locations of all dragged elements that hover this physic's host. These locations are adjusted to fit
     * the most suited locations given by this physic rules.
     */
    replaceMethod(superClass,
        function _refresh() {
            if (this._hoveredElements) {
                for (let element of this._hoveredElements) {
                    this._refreshHoverElement(element);
                }
            }
            this._elements.clear();
        }
    );

    /**
     * Asks the element if it accepts the location proposed by this physic. If not, the element will not be moved. If
     * the element does not own a _acceptPosition method, the proposed location is automatically accepted.
     * @param element element to check
     * @param position position to check
     * @returns {boolean}
     * @private
     */
    defineMethod(superClass,
        function _acceptPosition(element, position) {
            return element._acceptPosition ? element._acceptPosition(this, position) : !!position;
        }
    );

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

    defineGetProperty(superClass,
        function rules() {
            return {
                x: [{pos: this.lx, anchor: this}],
                y: [{pos: this.ly, anchor: this}]
            }
        }
    );

}

export function makeBoundedRuler(superClass) {

    defineGetProperty(superClass,
        function rules() {
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
    );

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

    defineGetProperty(superClass,
        function rules() {
            if (!this._rules) {
                this._rules = this._collectRules();
            }
            return this._rules;
        }
    );

    extendMethod(superClass, $add=>
        function add(element) {
            if (this._addRules(element)) {
                delete this._rules;
            }
            $add.call(this, element);
        }
    );

    defineMethod(superClass,
        function _addRules(element) {
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
        }
    );

    extendMethod(superClass, $reset=>
        function _reset() {
            delete this._rulesProviders;
            for (let element of this._host.children) {
                this._addRules(element);
            }
            this._rules = null;
            $reset.call(this);
        }
    );

    extendMethod(superClass, $remove=>
        function remove(element) {
            if (rulerPredicate.call(this, element)) {
                if (this._rulesProviders) {
                    this._rulesProviders.remove(element);
                    delete this._rules;
                }
            }
            $remove.call(this, element);
        }
    );

    extendMethod(superClass, $move=>
        function move(element) {
            if (rulerPredicate.call(this, element)) {
                delete this._rules;
            }
            $move.call(this, element);
        }
    );

    extendMethod(superClass, $resize=>
        function _resize(width, height) {
            delete this._rules;
            $resize.call(this, width, height);
        }
    );

    defineMethod(superClass,
        function _findRules(element) {
            let range = Attachments.RANGE / Canvas.instance.zoom;
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
        }
    );

    defineMethod(superClass,
        function findRules(element) {
            if (this._accept(element)) {
                return this._findRules(element);
            }
            else {
                return {x:new List(), y:new List()};
            }
        }
    );

    defineMethod(superClass,
        function _collectRules() {
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
                rules.x = this._extendsRules(-this._host.width/2, this._host.width/2, rules.x);
                rules.y = this._extendsRules(-this._host.height/2, this._host.height/2, rules.y);
            }
            return rules;
        }
    );

    defineMethod(superClass,
        function _extendsRules(start, end, rules) {
            let extendedRules = new List();
            let previous = start;
            for (let index=0; index<rules.length; index++) {
                let current = rules[index].pos;
                let next = index < rules.length-1 ? rules[index+1].pos : end;
                if (next !== current) {
                    if (current - previous > next - current) {
                        extendedRules.add({pos: current * 2 - next, reference:current});
                    }
                    extendedRules.add(rules[index]);
                    if (current - previous < next - current) {
                        extendedRules.add({pos: current * 2 - previous, reference:current});
                    }
                    previous = current;
                }
            }
            return extendedRules;
        }
    );
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
        assert(rulesPhysic.rules);
        this._physic = rulesPhysic;
        this._rules = new Group();
        this._arrows = new Group();
        Canvas.instance.addObserver(this);
    }

    _init() {
        this.refresh();
    }

    refresh() {

        function getLevel(start, levels, rule) {
            let minPos = Math.min(rule.reference*2-rule.pos, rule.pos, rule.reference);
            let maxPos = Math.min(rule.reference*2-rule.pos, rule.pos, rule.reference);
            for (let index=0; index<levels.length; index++) {
                let level = levels[index];
                if (level.pos<minPos) {
                    level.pos = maxPos;
                    return level.level;
                }
            }
            let level = start+10*levels.length;
            levels.add({level, pos:maxPos});
            return level;
        }

        let zoom = Canvas.instance.zoom;
        this._rules.clear();
        this._arrows.clear();
        this._root.attrs({stroke:Colors.RED, fill:Fill.NONE});
        let wLevels = new List({level:-this._element.width/2+10, pos:-this.element._height/2});
        let hLevels = new List({level:-this._element.height/2+10, pos:-this.element._width/2});
        for (let x of this._physic.rules.x) {
            let line = new Line(x.pos, -this._element.height/2, x.pos, this._element.height/2);
            this._rules.add(line);
            if (x.reference !== undefined) {
                let height = getLevel(-this._element.height/2+10, hLevels, x);
                let arrow = new Arrow(x.pos, height, x.reference, height,
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE],
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE]);
                this._arrows.add(arrow);
                arrow = new Arrow(x.reference*2-x.pos, height, x.reference, height,
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE],
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE]);
                this._arrows.add(arrow);
            }
        }
        for (let y of this._physic.rules.y) {
            let line = new Line(-this._element.width/2, y.pos, this._element.width/2, y.pos);
            this._rules.add(line);
            if (y.reference !== undefined) {
                let width = getLevel(-this._element.width/2+10, wLevels, y);
                let arrow = new Arrow(width, y.pos, width, y.reference,
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE],
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE]);
                this._arrows.add(arrow);
                arrow = new Arrow(width, y.reference*2-y.pos, width, y.reference,
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE],
                    [RulesDecoration.HEAD_SIZE, RulesDecoration.HEAD_SIZE]);
                this._arrows.add(arrow);
            }
        }
        this._adjustAspect(zoom);
    }

    _adjustAspect(zoom) {
        for (let line of this._rules.children) {
            line.attrs({stroke_width:0.5/zoom, stroke_dasharray:[1/zoom, 1/zoom]});
        }
        for (let arrow of this._arrows.children) {
            arrow.setLeftHeadGeometry(RulesDecoration.HEAD_SIZE/zoom, RulesDecoration.HEAD_SIZE/zoom);
            arrow.setRightHeadGeometry(RulesDecoration.HEAD_SIZE/zoom, RulesDecoration.HEAD_SIZE/zoom);
            arrow.attrs({stroke_width:0.5/zoom, stroke_dasharray:[1/zoom, 1/zoom]});
        }
    }

    _setElement(element) {
        super._setElement(element);
        element._addObserver(this);
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
                if (this._shown) {
                    this._askForRefresh();
                }
            }
            else if (event===Events.HOVER) {
                if (this._checksElements(value)) {
                    if (!this._shown) {
                        this._shown = true;
                        if (!this._root.contains(this._rules)) {
                            this._root.add(this._rules);
                            this._root.add(this._arrows);
                            this._askForRefresh();
                        }
                    }
                }
                else {
                    if (this._shown) {
                        this._shown = false;
                        if (this._root.contains(this._rules)) {
                            this._root.remove(this._rules);
                            this._root.remove(this._arrows);
                        }
                    }
                }
            }
        }
        else if (source===Canvas.instance && event===Events.ZOOM) {
            this._adjustAspect(Canvas.instance.zoom);
        }
    }

    clone(duplicata) {
        return new RulesDecoration(duplicata.get(this._physic));
    }

}
RulesDecoration.HEAD_SIZE = 5;

export function makeGridPhysic(superClass, {
    anchorsBuilder = element => {
        return element.anchors;
    }
}, computeStep = computeGridStep) {

    makeRulesPhysic(superClass, {
        rulesBuilder:function(element) {
            return this._findPositions(element);
        },
        anchorsBuilder
    });

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            Canvas.instance.addObserver(this);
        }
    );

    extendMethod(superClass, $notified=>
        function _notified(source, event, ...args) {
            $notified && $notified.call(this, source, event, ...args);
            if (source===Canvas.instance && event===Events.ZOOM) {
                this.refresh();
            }
        }
    );

    defineMethod(superClass,
        function _getStep() {
            let zoom = Canvas.instance.zoom;
            if (!this._step || this._stepZoom !== zoom) {
                this._step = computeStep();
                this._stepZoom = zoom;
            }
            return this._step;
        }
    );

    defineMethod(superClass,
        function _findPositions(element) {
            let step = this._getStep().step;
            let positions = {
                x:new List(),
                y:new List()
            };
            let anchors = anchorsBuilder.call(this, element);
            for (let anchor of anchors.x) {
                let pos = (anchor.pos+this.host.width/2)/step;
                positions.x.add({pos:Math.floor(pos)*step-this.host.width/2});
                positions.x.add({pos:Math.ceil(pos)*step-this.host.width/2});
            }
            for (let anchor of anchors.y) {
                let pos = (this.host.height/2-anchor.pos)/step;
                positions.y.add({pos:-Math.floor(pos)*step+this.host.height/2});
                positions.y.add({pos:-Math.ceil(pos)*step+this.host.height/2});
            }
            return positions;
        }
    );

    defineMethod(superClass,
        function findPositions(element) {
            if (this._accept(element)) {
                return this._findPositions(element, range);
            }
            else {
                return {x:new List(), y:new List()};
            }
        }
    );

}

export function createGridPhysic({predicate, anchorsBuilder}) {
    class GridPhysic extends Physic {
        constructor(host, ...args) {
            super(host, predicate, ...args);
        }
    }
    makeGridPhysic(GridPhysic, {anchorsBuilder});
    return GridPhysic;
}

export class RulerDecoration extends Decoration {

    constructor(rulesPhysic) {
        super();
        assert(rulesPhysic._getStep);
        this._physic = rulesPhysic;
        this._rulers = new Group();
        Canvas.instance.addObserver(this);
    }

    _init() {
        this.refresh();
    }

    _createRuler(element) {

        function computeX(inc, step) {
            let lx = (element.lx+this._physic.host.width/2)*Context.scale;
            let graduationValue = inc*step.scale+lx;
            return {value:Math.round(graduationValue), label:Math.round(graduationValue)/step.unitFactor};
        }

        function computeY(inc, step) {
            let ly = (this._physic.host.height/2-element.ly)*Context.scale;
            let graduationValue = ly-inc*step.scale;
            return {value:Math.round(graduationValue), label:Math.round(graduationValue)/step.unitFactor};
        }

        function drawVerticalGraduation(inc, step) {
            let graduationSize = 10/zoom;
            let graduation = computeX.call(this, inc, step);
            if (graduation.value>=0 && graduation.value<=this._physic.host.width*Context.scale) {
                if ((graduation.value % step.ref < 0.001) || (step.case === 1 && graduation.value % (step.ref / 2) < 0.001)) {
                    ruler.add(new Line(inc * step.step, -graduationSize * 2, inc * step.step, +graduationSize * 2));
                    let text = new Text(inc * step.step, 0, graduation.label).attrs({
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
                    ruler.add(new Line(inc * step.step, -graduationSize, inc * step.step, +graduationSize));
                }
            }
        }

        function drawHorizontalGraduation(inc, step) {
            let graduationSize = 10/zoom;
            let graduation = computeY.call(this, inc, step);
            if (graduation.value>=0 && graduation.value<=this._physic.host.height*Context.scale) {
                if (graduation.value % step.ref < 0.001) {
                    ruler.add(new Line(-graduationSize * 2, inc * step.step, graduationSize * 2, inc * step.step));
                    let text = new Text(graduationSize * 2.1, inc * step.step, graduation.label).attrs({
                        fill: Colors.RED, font_size: 12 / zoom,
                        text_anchor: TextAnchor.START, alignment_baseline: AlignmentBaseline.MIDDLE
                    });
                    ruler.add(text);
                }
                else {
                    ruler.add(new Line(-graduationSize, inc * step.step, graduationSize, inc * step.step));
                }
            }
        }

        function drawHorizontalAxis(zoom, step, ruler) {
            let margin = 50;
            let horizontalSize = Math.max(element.width/2 + margin/zoom, step.step*10);
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
                drawVerticalGraduation.call(this, inc, step);
                drawVerticalGraduation.call(this, -inc, step);
            }
        }

        function drawVerticalAxis(zoom, step, ruler) {
            let margin = 50;
            let verticalSize = Math.max(element.height/2 + margin/zoom, step.step*10);
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
                drawHorizontalGraduation.call(this, inc, step);
                drawHorizontalGraduation.call(this, -inc, step);
            }
        }

        let zoom = Canvas.instance.zoom;
        let step = this._physic._getStep(zoom);
        let ruler = new Translation().attrs({fill:Colors.RED, stroke_width:1/zoom, stroke:Colors.RED, z_index:2000});
        drawHorizontalAxis.call(this, zoom, step, ruler);
        drawVerticalAxis.call(this, zoom, step, ruler);
        ruler.set(element.lx, element.ly);
        return ruler;
    }

    _setElement(element) {
        super._setElement(element);
        element._addObserver(this);
    }

    refresh() {
        this._rulers.clear();
        if (this._hoveredElements) {
            for (let dragged of this._hoveredElements) {
                this._rulers.add(this._createRuler(dragged));
            }
        }
    }

    _notified(source, event, value, elements) {
        if (source===this._element) {
            if (event===Physic.events.REFRESH_HOVER && value===this._physic) {
                this._hoveredElements = elements;
                if (this._hoveredElements.length) {
                    if (!this._shown) {
                        this._shown = true;
                        this._root.add(this._rulers);
                    }
                    this.refresh();
                }
                else if (!this._hoveredElements.length) {
                    if (this._shown) {
                        this._shown = false;
                        this._root.remove(this._rulers);
                    }
                }
            }
        }
        else if (source===Canvas.instance && event===Events.ZOOM) {
            if (this._shown) {
                this.refresh();
            }
        }
    }

    clone(duplicata) {
        return new RulerDecoration(duplicata.get(this._physic));
    }

}
