
import {
    Canvas, Context, makeNotCloneable, Memento
} from "../../js/toolkit.js";
import {
    makeMenuOwner, TextMenuOption
} from "../../js/tools.js";
import {
    makeFloatingContainer, makePart, makePartsOwner, makeSupport
} from "../../js/container-mixins.js";
import {
    makeHighlightable, Mark, MarksDecoration
} from "../../js/standard-mixins.js";
import {
    SigmaElement
} from "../../js/base-element.js";
import {
    makeClickable, makeDecorationsOwner, makeDraggable, makeFramed, makeMovable,
    makeSelectable, makeShaped
} from "../../js/core-mixins.js";
import {
    AlignmentBaseline, Colors, RasterImage, FontWeight, TextAnchor, Text, Path, M, C, L
} from "../../js/graphics.js";
import {
    addDeleteFacility, addGroupFacility, addHighlightFacility, addLockFacility
} from "../../js/standard-facilities.js";
import {
    DragOperation, standardDrag
} from "../../js/drag-and-drop.js";
import {
    assert
} from "../../js/misc.js";

export const DeltaLayers = {
    DOWN: "d",
    MIDDLE : "m",
    UP : "u",
    PDF : "p"
};
export const LAYERS_DEFINITION = {layers:[DeltaLayers.DOWN,  DeltaLayers.MIDDLE, DeltaLayers.UP]};
export const TABLE_LAYERS_DEFINITION = {layers:[DeltaLayers.DOWN,  DeltaLayers.MIDDLE, DeltaLayers.UP, DeltaLayers.PDF]};

export const FreePositioningMode = {};
Object.defineProperty(FreePositioningMode, "mode", {
    get() {
        return Context.freePositioningMode ? Context.freePositioningMode : false;
    },
    set(mode) {
        Context.freePositioningMode = mode;
    }
});

export function makePositionEditable(superClass) {

    function callForEditPosition(element) {
        Canvas.instance.openModal(
            editPosition,
            {
                x: element.lx,
                y: element.ly
            },
            data => {
                element.move(data.x, data.y);
            });
    }

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("edit position",
            function() { callForEditPosition(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

}

export function makeLabelOwner(superClass) {

    function callForRename(element) {
        Canvas.instance.openModal(
            rename,
            {
                label: element.label
            },
            data => {
                Memento.instance.open();
                element.label = data.label;
            });
    }

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._label = args.label || "";
    };

    Object.defineProperty(superClass.prototype, "label", {
        configurable:true,
        get() {
            return this._label;
        },
        set(label) {
            Memento.register(this);
            this._setLabel(label);
            return this;
        }
    });

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("rename",
            function() { callForRename(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

    let setLabel = superClass.prototype._setLabel;
    superClass.prototype._setLabel = function(label) {
        this._label = label;
        setLabel && setLabel.call(this, label);
        return this;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        memento._label = this._label;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        this._setLabel(memento._label);
        return this;
    };

    return superClass;
}

export function makeCommentOwner(superClass) {

    function callForComment(element) {
        Canvas.instance.openModal(
            comment,
            {
                comment: element.comment
            },
            data => {
                Memento.instance.open();
                element.comment = data.comment;
            });
    }

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._setComment(args.comment || "");
    };

    Object.defineProperty(superClass.prototype, "comment", {
        configurable:true,
        get() {
            return this._comment;
        },
        set(comment) {
            Memento.register(this);
            this._setComment(comment);
            return this;
        }
    });

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function() {
        this._addMenuOption(new TextMenuOption("Add comment",
            function() { callForComment(this); })
        );
        createContextMenu && createContextMenu.call(this);
    };

    let setComment = superClass.prototype._setComment;
    superClass.prototype._setComment = function(comment) {
        this._comment = comment;
        setComment && setComment.call(this, comment);
        return this;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        memento._comment = this._comment;
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        this._setComment(memento._comment);
        return this;
    };

    return superClass;
}

export let commentMark = new Mark(new RasterImage("./images/icons/comments.png", -5, -3.75, 10, 7.5), 0);

export function makeFreePositioningOwner(superClass) {

    makeFloatingContainer(superClass);

    superClass.prototype._acceptDrop = function(element, dragSet, initialTarget) {
        return FreePositioningMode.mode;
    };

    superClass.prototype._executeDrop = function(element, dragSet, initialTarget) {
        if (FreePositioningMode.mode) {
            this.addFloating(element);
            return true;
        }
        return false;
    };

    superClass.prototype._unexecuteDrop = function(element) {
        if (FreePositioningMode.mode) {
            this._addFloating(element);
            return true;
        }
        return false;
    };

}

export class DeltaMarksSupport extends SigmaElement {

    constructor({width, height}) {
        super(width, height);
    }

}
makeDecorationsOwner(DeltaMarksSupport);
DeltaMarksSupport.SIZE = 10;

export class DeltaItem extends SigmaElement {
    constructor({width, height, ...args}) {
        super(width, height, args);
    }

    _init({...args}) {
        super._init({...args});
        this._dragOperation(()=>standardDrag);
        this._createContextMenu();
        this._createMarksSupport();
        if (args.status) {
            this._setStatus(args.status.code, args.status.color);
        }
    }

    _finish(args) {
        super._finish(args);
        this._addPart(this._marksSupport);
    }

    _createContextMenu() {}

    _createMarksSupport() {
        this._marksDecoration = new MarksDecoration({
            x:MarksDecoration.RIGHT, y:MarksDecoration.TOP,
            markWidth:DeltaMarksSupport.SIZE, markHeight:DeltaMarksSupport.SIZE
        });
        this._marksSupport = new DeltaMarksSupport({width:this.width, height:this.height});
        this._marksSupport.addDecoration(this._marksDecoration);
    }

    _setComment(comment) {
        if (comment) {
            this._marksDecoration.add(commentMark);
        }
        else {
            this._marksDecoration.remove(commentMark);
        }
    }

    _setStatus(code, color) {
        let statusMark = new Mark(new Text(0, 0, code)
            .attrs({
                stroke:Colors.NONE, fill:color,
                font_family:"arial", font_size:8, font_weight:FontWeight.BOLD,
                alignment_baseline : AlignmentBaseline.MIDDLE, text_anchor:TextAnchor.MIDDLE
            }), 1);
        this._marksDecoration.add(statusMark);
        return this;
    }

    get freeTarget() {
        return this;
    }

    getDropTarget(target) {
        if (FreePositioningMode.mode) {
            return target.freeTarget;
        }
        return target;
    };

    _receiveDrop(element, dragSet, initialTarget) {
    }

    _revertDrop(element) {
    }

    get zIndex() {
        return this._zIndex ? this._zIndex : 0;
    }

    _setZIndex(zIndex) {
        if (zIndex) {
            this._zIndex = zIndex;
            this._root.z_index = zIndex;
        }
        else {
            delete this._zIndex;
            this._root.z_index = undefined;
        }
    }

    set zIndex(zIndex) {
        if (this.zIndex !== zIndex) {
            Memento.register(this);
            this._setZIndex(zIndex);
        }
    }

    get zOrder() {
        if (this.zIndex) return this.zIndex;
        if (this.parent) return this.parent.zOrder;
        return 0;
    }

    _draggedFrom() {
        if (this.zIndex) {
            let zIndex = this.zIndex;
            this.visit({}, function(context) {
                if (this.zIndex>0) {
                    this.zIndex -= zIndex;
                }
            });
        }
    }

    _droppedIn(target, dragSet, initialTarget) {
        assert(!this.z_index);
        if (FreePositioningMode.mode) {
            this.visit({element:this}, function(context) {
                if (this===context.element) {
                    this.zIndex = 1;
                }
                else if (this.zIndex) {
                    this.zIndex ++;
                }
            });
        }
        let zIndex = target.zOrder;
        if (zIndex) {
            this.visit({}, function() {
                if (this.zIndex) this.zIndex += zIndex;
            });
        }
    }

    _revertDroppedIn(parent) {
        if (FreePositioningMode.mode) {
            this.visit({element:this}, function(context) {
                if (this===context.element) {
                    this._setZIndex(1);
                }
                else if (this.zIndex) {
                    this._setZIndex(this.zIndex+1);
                }
            });
        }
    }

    _memento() {
        let memento = super._memento();
        memento._zIndex = this._zIndex;
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        if (memento._zIndex !== this.zIndex) {
            this._setZIndex(memento._zIndex);
        }
        return this;
    }

    _setSize(width, height) {
        super._setSize(width, height);
        this._marksSupport._setSize(width, height);
    }
}
makePartsOwner(DeltaItem);
makeSelectable(DeltaItem);
makeDraggable(DeltaItem);
makeMovable(DeltaItem);
addDeleteFacility(DeltaItem);
addLockFacility(DeltaItem);
makeClickable(DeltaItem);
makeMenuOwner(DeltaItem);
addGroupFacility(DeltaItem);
makeCommentOwner(DeltaItem);
addHighlightFacility(DeltaItem);
makeFreePositioningOwner(DeltaItem);

export class DeltaSupport extends SigmaElement {

    constructor({width, height, strokeColor, backgroundColor}) {
        super(width, height);
        this._initFrame(width, height, strokeColor, backgroundColor);
        this._createContextMenu();
    }

    _createContextMenu() {}

    get freeTarget() {
        return this.selectable;
    }

    get zOrder() {
        if (this.parent) return this.parent.zOrder;
        return 0;
    }
}
makeFramed(DeltaSupport);
makeHighlightable(DeltaSupport);
makePart(DeltaSupport);
makeSupport(DeltaSupport);
makeMenuOwner(DeltaSupport);

export class KnobDragOperation extends DragOperation {
    constructor() {
        super();
    }

    accept(element, x, y, event) {
        if (!super.accept(element, x, y, event)) {
            return false;
        }
        let selectable = element.selectable;
        return selectable !== null && selectable.__dragOp
            ? selectable.__dragOp.accept(selectable, x, y, event)
            : false;
    }

    onDragStart(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDragStart(selectable, x, y, event);
        }
    }

    onDragMove(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDragMove(selectable, x, y, event);
        }
    }

    onDrop(element, x, y, event) {
        let selectable = element.selectable;
        if (selectable.__dragOp) {
            selectable.__dragOp.onDrop(selectable, x, y, event);
        }
    }
}
makeNotCloneable(KnobDragOperation);
KnobDragOperation.instance = new KnobDragOperation();

export class DeltaKnob extends SigmaElement {

    constructor({width, height, predicate}) {
        super(width, height);
        this._initShape(this._buildShape(width, height));
        this._predicate = predicate;
        this._dragOperation(function() {return KnobDragOperation.instance;});
    }

    _buildShape(width, height) {
        return new Path(
            M(-width/2, -height/2), L(-width/4, -height/2),
            C(width/2, -height/3, width/2, height/3, -width/4, height/2),
            L(-width/2, height/2), L(-width/2, -height/2))
            .attrs({
                fill: Colors.GREY,
                class: DeltaKnob.CLASS,
                stroke: Colors.NONE
            });
    }

    get target() {
        let parent = this.parent;
        while(parent) {
            if (this._predicate.call(this, parent)) {
                return parent;
            }
            parent = parent.parent;
        }
        return this.parent;
    }

    get selectable() {
        return this.target.selectable;
    }

    get freeTarget() {
        return this.selectable;
    }
}
DeltaKnob.CLASS = "handle";
makeShaped(DeltaKnob);
makePart(DeltaKnob);
makeDraggable(DeltaKnob);
