
import {
    AlignmentBaseline, Attrs, collectProperties, Colors, Group, Rect, Text, TextAnchor, Translation, Visibility, win
} from "./graphics.js";
import {
    Context, Memento, CloneableObject, Events, Canvas, CopyPaste
} from "./toolkit.js";
import {
    isNumber, assert
} from "./misc.js";
import {
    Matrix
} from "./geometry.js";
import {
    ESet
} from "./collections.js";
import {
    Decoration
} from "./core-mixins.js";

export function makeFillUpdatable(superClass) {

    superClass.prototype._initFill = function (data) {
        this._setFillColor(data.fillColor || Colors.NONE);
    };

    Object.defineProperty(superClass.prototype, "fillColor", {
        configurable: true,
        get: function () {
            return this._fillColor;
        },
        set: function (fillColor) {
            Memento.register(this);
            this._setFillColor(fillColor);
        }
    });

    superClass.prototype._setFillColor = function (fillColor) {
        this._fillColor = fillColor;
        this._shape.child.attrs({fill: fillColor});
    };

    let superMemento = superClass.prototype._memento;
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

    if (!superClass.prototype.hasOwnProperty("fillUpdatable")) {
        Object.defineProperty(superClass.prototype, "fillUpdatable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }
}

export function makeStrokeUpdatable(superClass) {

    superClass.prototype._initStroke = function (data) {
        this._setStrokeColor(data.strokeColor || this._strokeColor || Colors.BLACK);
        this._setStrokeWidth(data.strokeWidth || this._strokeWidth || 1);
    };

    Object.defineProperty(superClass.prototype, "strokeColor", {
        configurable: true,
        get: function () {
            return this._strokeColor;
        },
        set: function (strokeColor) {
            Memento.register(this);
            this._setStrokeColor(strokeColor);
        }
    });

    Object.defineProperty(superClass.prototype, "strokeWidth", {
        configurable: true,
        get: function () {
            return this._strokeWidth;
        },
        set: function (strokeWidth) {
            Memento.register(strokeWidth);
            this._setStrokeWidth(strokeWidth);
        }
    });

    superClass.prototype._setStrokeColor = function (strokeColor) {
        this._strokeColor = strokeColor;
        this._shape.child.attrs({stroke: strokeColor});
    };

    superClass.prototype._setStrokeWidth = function (strokeWidth) {
        this._strokeWidth = strokeWidth;
        this._shape.child.attrs({stroke_width: strokeWidth});
    };

    let superMemento = superClass.prototype._memento;
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

    if (!superClass.prototype.hasOwnProperty("strokeUpdatable")) {
        Object.defineProperty(superClass.prototype, "strokeUpdatable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }
}

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
                x = -this._element.width / 2 + TextDecoration.MARGIN;
                textAnchor = TextAnchor.START;
            } else if (x === TextDecoration.RIGHT) {
                x = this._element.width / 2 - TextDecoration.MARGIN;
                textAnchor = TextAnchor.END;
            } else if (x === TextDecoration.MIDDLE) {
                x = 0;
                textAnchor = TextAnchor.MIDDLE;
            } else {
                assert(isNumber(x));
            }
            return {x, textAnchor};
        }

        function getY(specs) {
            let {y} = specs;
            let alignmentBaseline = AlignmentBaseline.MIDDLE;
            if (y === TextDecoration.TOP) {
                y = -this._element.height / 2 + TextDecoration.MARGIN;
                alignmentBaseline = AlignmentBaseline.BEFORE_EDGE;
            } else if (y === TextDecoration.TOP) {
                y = this._element.height / 2 - TextDecoration.MARGIN;
                alignmentBaseline = AlignmentBaseline.AFTER_EDGE;
            } else if (y === TextDecoration.MIDDLE) {
                y = 0;
                alignmentBaseline = AlignmentBaseline.MIDDLE;
            } else {
                assert(isNumber(y));
            }
            return {y, alignmentBaseline};
        }

        let {x, textAnchor} = getX.call(this, this._specs);
        let {y, alignmentBaseline} = getY.call(this, this._specs);
        let attrs = collectProperties(this._specs, this._fontProperties);
        let text = new Text(0, 0, this._labelGetter.call(this._labelOwner)).attrs({
                stroke: Colors.NONE, text_anchor: textAnchor, alignment_baseline: alignmentBaseline, ...attrs
            }
        );
        this._root.add(text);
        this._root.matrix = Matrix.translate(x, y);
    }

    refresh() {
        this._root.clear();
        this._init();
    }

    clone(duplicata) {
        let labelOwner = duplicata.get(this._labelOwner);
        return new TextDecoration(labelOwner, this._labelGetter, {...this._specs}, {...this._fontProperties});
    }

}
TextDecoration.MARGIN = 2;
TextDecoration.LEFT = "left";
TextDecoration.RIGHT = "right";
TextDecoration.MIDDLE = "middle";
TextDecoration.TOP = "top";
TextDecoration.BOTTOM = "bottom";

export class HighlightShape {

    constructor(host) {
        this._host = host;
        this._root = new Group();
        this._init();
    }

    _init() {
        if (this._host.highlight) {
            let width = this._host.width;
            let height = this._host.height;
            let highlight = new Rect(-width / 2, -height / 2, width, height)
                .attrs({fill: this._host.highlight, opacity: HighlightShape.OPACITY});
            this._root.add(highlight);
        }
    }

    refresh() {
        this._root.clear();
        this._init();
    }

    clone(duplicata) {
        let host = duplicata.get(this._host);
        let copy = {};
        copy.__proto__ = HighlightShape.prototype;
        copy._host = host;
        copy._root = duplicata.get(this._root);
        host._highlightShape = copy;
        return copy;
    }

}
HighlightShape.OPACITY = 0.2;

export function makeHighlightable(superClass) {

    let finish = superClass.prototype._finish;
    superClass.prototype._finish = function (...args) {
        finish.call(this, ...args);
        this._highlightShape = new HighlightShape(this);
        this._shape.add(this._highlightShape._root);
    };

    superClass.prototype._buildShapeStructure = function () {
        let shape = new Group();
        let shapeContent = new Group();
        shape.add(shapeContent);
        return shape;
    };

    Object.defineProperty(superClass.prototype, "_shapeContent", {
        configurable: true,
        get() {
            return this._shape.child;
        }
    });

    Object.defineProperty(superClass.prototype, "highlight", {
        configurable: true,
        get() {
            return this._highlight;
        },
        set(highlight) {
            Memento.register(this);
            this._setHighlight(highlight);
            if (this.hasParts) {
                for (let part of this._parts) {
                    part.highlight = highlight;
                }
            }
            return this;
        }
    });

    let setHighlight = superClass.prototype._setHighlight;
    superClass.prototype._setHighlight = function (highlight) {
        this._highlight = highlight;
        this._highlightShape.refresh();
        setHighlight && setHighlight.call(this, highlight);
        return this;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        memento._highlight = this._highlight;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        this._highlight = memento._highlight;
        return this;
    };

    Object.defineProperty(superClass.prototype, "highlightable", {
        configurable: true,
        get() {
            return true;
        }
    });

    superClass.prototype.showHighlight = function () {
        this._highlightShape._root.visibility = null;
        return this;
    };

    superClass.prototype.hideHighlight = function () {
        this._highlightShape._root.visibility = Visibility.HIDDEN;
        return this;
    };

    return superClass;
}

export function makeGroupable(superClass) {

    Object.defineProperty(superClass.prototype, "group", {
        configurable: true,
        get() {
            return this._group;
        },
        set(group) {
            Memento.register(this);
            this._group = group;
            return this;
        }
    });

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        memento._group = this._group;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        this._group = memento._group;
        return this;
    };

    if (!superClass.prototype.hasOwnProperty("groupable")) {
        Object.defineProperty(superClass.prototype, "groupable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    return superClass;
}

export function makeLockable(superClass) {

    let superInit = superClass.prototype._init;
    superClass.prototype._init = function (...args) {
        superInit.call(this, ...args);
        this._showLocking();
    };

    superClass.prototype._showLocking = function () {
        if (this.lock) {
            this._root.stroke = Colors.LIGHT_GREY;
        }
        else {
            this._root.stroke = Colors.BLACK;
        }
    };

    Object.defineProperty(superClass.prototype, "lock", {
        configurable: true,
        get() {
            return this._lock;
        },
        set(lock) {
            Memento.register(this);
            this._lock = lock;
            this._showLocking();
            return this;
        }
    });

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        memento._lock = this._lock;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        this._lock = memento._lock;
        this._showLocking();
        return this;
    };

    if (!superClass.prototype.hasOwnProperty("lockable")) {
        Object.defineProperty(superClass.prototype, "lockable", {
            configurable: true,
            get() {
                return true;
            }
        });
    }

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        if (!duplicata.get(this.parent)) {
            copy._lock = false;
        }
        this._showLocking();
    };

    return superClass;
}

export class Mark {

    constructor(shape, rank) {
        this._shape = shape;
        this._rank = rank;
    }

    get shape() {
        return this._shape;
    }
}

export class MarksDecoration extends Decoration {

    constructor(specs) {
        super();
        this._specs = {...specs};
        this._marks = new ESet();
    }

    add(...marks) {
        for (let mark of marks) {
            this._marks.add(mark);
        }
        this._init();
    }

    remove(...marks) {
        for (let mark of marks) {
            this._marks.delete(mark);
        }
        this._init();
    }

    _init() {

        function getX(specs) {
            let {x, markWidth} = specs;
            if (x === MarksDecoration.LEFT) {
                x = -this._element.width / 2 + MarksDecoration.MARGIN;
            } else if (x === MarksDecoration.RIGHT) {
                x = this._element.width / 2 - MarksDecoration.MARGIN;
                markWidth = -markWidth;
            } else {
                assert(isNumber(x));
            }
            return {x, markWidth};
        }

        function getY(specs) {
            let {y, markHeight} = specs;
            if (y === MarksDecoration.TOP) {
                y = -this._element.height / 2 + MarksDecoration.MARGIN;
            } else if (x === MarksDecoration.BOTTOM) {
                y = this._element.height / 2 - MarksDecoration.MARGIN;
                markHeight = -markHeight;
            } else {
                assert(isNumber(y));
            }
            return {y, markHeight};
        }

        this._root.clear();
        let marks = [...this._marks].sort((m1, m2) => m1.rank - m2.rank);
        let {x, markWidth} = getX.call(this, this._specs);
        let {y, markHeight} = getY.call(this, this._specs);
        let px = x + markWidth / 2;
        let py = y + markHeight / 2;
        for (let mark of marks) {
            let shape = mark.shape.clone();
            let pedestal = new Translation(px, py);
            px += markWidth;
            pedestal.add(shape);
            this._root.add(pedestal);
        }
    }

    refresh() {
        this._root.clear();
        this._init();
    }

    clone(duplicata) {
        let decoration = new MarksDecoration(this._specs);
        decoration._marks = new ESet(this._marks);
        return decoration;
    }

}
MarksDecoration.MARGIN = 1;
MarksDecoration.LEFT = "left";
MarksDecoration.RIGHT = "right";
MarksDecoration.TOP = "top";
MarksDecoration.BOTTOM = "bottom";

function adjustFollowers(canvasLayer) {
    let followers = canvasLayer._followers;
    if (followers) {
        for (let follower of followers) {
            let record = follower._followed.record;
            let followed = follower._followed.element;
            let targetGlobal = followed.global.mult(record.matrix);
            let matrix = follower.support.global.invert().mult(targetGlobal);
            if (!matrix.equals(follower.matrix)) {
                follower._matrix = matrix;
            }
        }
    }
}

function adjustAllFollowers() {
    adjustFollowers(Canvas.instance.baseLayer);
    adjustFollowers(Canvas.instance.glassLayer);
}

function updateFollowers(canvasLayer) {
    let followers = canvasLayer._followers;
    if (followers) {
        for (let follower of followers) {
            let record = follower._followed.record;
            let followed = follower._followed.element;
            let targetGlobal = followed.global.mult(record.matrix);
            let matrix = follower.support.global.invert().mult(targetGlobal);
            if (!matrix.equals(follower.matrix)) {
                follower.matrix = matrix;
            }
        }
    }
}

function baseFollowersUpdater() {
    updateFollowers(Canvas.instance.baseLayer);
}

function glassFollowersUpdater() {
    updateFollowers(Canvas.instance.glassLayer);
}

export function makeFollowed(superClass) {

    Object.defineProperty(superClass.prototype, "isFollowed", {
        configurable:true,
        get() {
            return true;
        }
    });

    Object.defineProperty(superClass.prototype, "followers", {
        configurable:true,
        get() {
            return this._followers ? this._followers.keys() : [];
        }
    });

    superClass.prototype.addFollower = function(element) {
        if (element.isFollower) {
            Memento.register(this);
            Memento.register(element);
            if (element.followed) {
                Memento.register(element.followed);
            }
            this._addFollower(element);
            this._fire(Events.ADD_FOLLOWER, element);
            element._fire(Events.ADD_FOLLOWER, this);
        }
    };

    superClass.prototype.moveFollower = function(element) {
        if (element.isFollower) {
            Memento.register(this);
            Memento.register(element);
            this._moveFollower(element);
            this._fire(Events.MOVE_FOLLOWER, element);
            element._fire(Events.MOVE_FOLLOWER, this);
        }
    };

    superClass.prototype.removeFollower = function(element) {
        if (element.isFollower) {
            Memento.register(this);
            Memento.register(element);
            this._removeFollower(element);
            this._fire(Events.REMOVE_FOLLOWER, element);
            element._fire(Events.REMOVE_FOLLOWER, this);
        }
    };

    superClass.prototype.__addFollower = function(element, record) {
        if (!this._followers) {
            this._followers = new Map();
        }
        this._followers.set(element, record);
    };

    superClass.prototype.__moveFollower = function(element, record) {
        this._followers.set(element, record);
    };

    superClass.prototype.__removeFollower = function(element) {
        if (this._followers) {
            this._followers.delete(element);
            if (!this._followers.size) {
                delete this._followers;
            }
        }
    };

    superClass.prototype.isFollowedBy = function(element) {
        return this._followers && this._followers.has(element);
    };

    superClass.prototype._addFollower = function(element) {
        let record = new CloneableObject({
            matrix: this.global.invert().mult(element.global)
        });
        this.__addFollower(element, record);
        if (element.followed) {
            element.followed.__removeFollower(element);
        }
        element.__setFollowed(this, record);
    };

    superClass.prototype._moveFollower = function(element) {
        let record = new CloneableObject({
            matrix: this.global.invert().mult(element.global)
        });
        this.__moveFollower(element, record);
        element.__moveFollowed(this, record);
    };

    superClass.prototype._removeFollower = function(element) {
        this.__removeFollower(element);
        element.__setFollowed(null);
    };

    superClass.prototype._clearFollowers = function() {
        delete this._followers;
    };

    let getExtension = superClass.prototype.getExtension;
    superClass.prototype.getExtension = function(extension) {
        let elemExtension = getExtension ? getExtension.call(this, extension) : new ESet();
        extension = extension ? extension.merge(elemExtension) : elemExtension;
        if (this._followers) {
            for (let element of this._followers.keys()) {
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

    let cancelDrop = superClass.prototype._cancelDrop;
    superClass.prototype._cancelDrop = function(dragOperation) {
        cancelDrop && cancelDrop.call(this, dragOperation);
        if (this._followers) {
            for (let element of this._followers.keys()) {
                if (!dragOperation.dropCancelled(element)) {
                    dragOperation.cancelDrop(element);
                }
            }
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._followers) {
            for (let element of this._followers.keys()) {
                let childCopy = duplicata.get(element);
                let record = this._followers.get(element);
                copy.__addFollower(childCopy, record);
            }
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn && revertDroppedIn.call(this);
        if (this._followers) {
            for (let element of this._followers.keys()) {
                let record = this._followers.get(element);
                element.__setFollowed(this, record);
            }
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._followers) {
            for (let element of this._followers.keys()) {
                this.removeFollower(element);
            }
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._followers) {
            memento._followers = new Map(this._followers);
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (memento._followers) {
            this._followers = new Map(memento._followers);
        }
        else {
            delete this._followers;
        }
        return this;
    };

    Context.addStarter(()=>{
        Memento.instance.addFinalizer(adjustAllFollowers);
        Canvas.instance.baseLayer.addMutationsCallback(baseFollowersUpdater);
        Canvas.instance.glassLayer.addMutationsCallback(glassFollowersUpdater);
    });

    return superClass;
}

export function makeFollower(superClass) {

    Object.defineProperty(superClass.prototype, "isFollower", {
        configurable:true,
        get() {
            return true;
        }
    });

    Object.defineProperty(superClass.prototype, "followed", {
        configurable:true,
        get() {
            return this._followed ? this._followed.element : undefined;
        }
    });

    superClass.prototype._registerFollower = function(canvasLayer) {
        this._unregisterFollower();
        if (!canvasLayer._followers) {
            canvasLayer._followers = new ESet();
        }
        canvasLayer._followers.add(this);
        this._followed.layer = canvasLayer;
    };

    superClass.prototype.__unregisterFollower = function(canvasLayer) {
        if (canvasLayer && canvasLayer._followers) {
            canvasLayer._followers.delete(this);
            if (canvasLayer._followers.size===0) {
                delete canvasLayer._followers;
            }
            delete this._followed.layer;
        }
    };

    superClass.prototype._unregisterFollower = function() {
        let canvasLayer = this._followed ? this._followed.layer : null;
        this.__unregisterFollower(canvasLayer);
    };

    superClass.prototype.__setFollowed = function(element, record) {
        if (element) {
            this._followed = new CloneableObject({element, record});
            this._registerFollower(this.canvasLayer);
        }
        else if (this._followed) {
            this._unregisterFollower();
            delete this._followed;
        }
    };

    superClass.prototype.__moveFollowed = function(element, record) {
        this._followed = new CloneableObject({element:this.follow, record});
    };

    superClass.prototype.follow = function(support) {
        return this._followed.element === support;
    };

    let draggedFrom = superClass.prototype._draggedFrom;
    superClass.prototype._draggedFrom = function(support, dragSet) {
        draggedFrom.call(this, support, dragSet);
        if (this._followed) {
            if (!dragSet.has(this._followed.element)) {
                this._followed.element.removeFollower(this);
            }
            else {
                this._registerFollower(Canvas.instance.glassLayer);
            }
        }
    };

    let droppedIn = superClass.prototype._droppedIn;
    superClass.prototype._droppedIn = function(support, dragSet) {
        droppedIn.call(this, support, dragSet);
        if (this._followed) {
            this._registerFollower(Canvas.instance.baseLayer);
        }
    };

    let revertDroppedIn = superClass.prototype._revertDroppedIn;
    superClass.prototype._revertDroppedIn = function () {
        revertDroppedIn.call(this);
        if (this._followed) {
            this._followed.element.__addFollower(this, this._followed.record);
        }
    };

    let cloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function (copy, duplicata) {
        cloned && cloned.call(this, copy, duplicata);
        if (this._followed) {
            let childCopy = duplicata.get(this._followed.element);
            let record = CopyPaste.clone(this._followed.record, duplicata);
            copy.__addFollower(childCopy, record);
        }
    };

    let superDelete = superClass.prototype.delete;
    superClass.prototype.delete = function() {
        let result = superDelete.call(this);
        if (this._followed) {
            this._followed.element.removeFollower(this);
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function () {
        let memento = superMemento.call(this);
        if (this._followed) {
            memento._followed = this._followed;
        }
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function (memento) {
        superRevert.call(this, memento);
        if (this._followed) {
            this.__unregisterFollower(Canvas.instance.baseLayer);
        }
        this._followed = memento._followed;
        return this;
    };

    let superRecover = superClass.prototype._recover;
    superClass.prototype._recover = function (memento) {
        superRecover.call(this, memento);
        if (this.parent && memento._followed) {
            this._registerFollower(Canvas.instance.baseLayer);
        }
        return this;
    };

    return superClass;
}
