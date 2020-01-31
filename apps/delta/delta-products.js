
import {
    DeltaItem, DeltaElement, DeltaEmbodiment
} from "./delta-core.js";
import {
    makeCarriable, makeCarrier
} from "../../js/collision-physics.js";
import {
    makeClickable, makeFramed, makeGentleDropTarget, makeMultiImaged, makeSelectable,
    makeShaped
} from "../../js/core-mixins.js";
import {
    Colors, Group, Rect
} from "../../js/graphics.js";
import {
    DeltaBoxContent, makeFasciaSupport, makeFooterOwner, makeHeaderOwner, DeltaSlottedBoxContent, DeltaCaddyContent
} from "./delta-objects.js";
import {
    ESet, List
} from "../../js/collections.js";
import {
    makeContainer, makePart, makeSupport
} from "../../js/container-mixins.js";
import {
    makePositioningContainer
} from "../../js/physics.js";
import {
    SigmaItemBuilder, ToolGridExpandablePanel
} from "../../js/tools.js";
import {
    Canvas, CopyPaste, onCanvasLayer, Selection, Events, Memento
} from "../../js/toolkit.js";
import {
    SigmaElement
} from "../../js/base-element.js";
import {
    assert, is, defineGetProperty, defineMethod, extendMethod, replaceMethod
} from "../../js/misc.js";
import {
    SigmaEntity, SigmaPolymorphicEntity
} from "../../js/entity.js";

export class DeltaModuleMorph extends DeltaElement {

    constructor({width, height, color}) {
        super({width, height, color});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }

}
makeFramed(DeltaModuleMorph);
makePart(DeltaModuleMorph);

export class DeltaModuleEntity extends SigmaPolymorphicEntity {

    constructor({width, height, depth}) {
        super(width, height, depth);
        this._addMorph(SigmaEntity.projections.FRONT, new DeltaModuleMorph({width, height, color:Colors.GREY}));
        this._addMorph(SigmaEntity.projections.TOP, new DeltaModuleMorph({width, height:depth, color:Colors.LIGHT_GREY}));
    }

    _createEmbodiment(support) {
        return new DeltaModuleEmbodiment({width:this._width, height:this._height, depth:this._depth, morphs:this.morphs});
    }

    get defaultEmbodiment() {
        return this.createEmbodiment(null);
    }

    _memento() {
        let memento = super._memento();
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        return this;
    }

}

export class DeltaModuleEmbodiment extends DeltaEmbodiment {

    constructor({width, height, depth, morphs}) {
        if (!morphs) {
            morphs = {
                front:new DeltaModuleMorph({width, height, color: Colors.GREY}),
                top:new DeltaModuleMorph({width, height: depth, color: Colors.LIGHT_GREY})
            };
        }
        super(morphs);
        this._depth = depth;
    }

    get depth() {
        return this._depth;
    }

}

export class DeltaAbstractModule extends DeltaItem {

    constructor({depth, ...specs}) {
        super(specs);
        this._depth = depth;
    }

    get depth() {
        return this._depth;
    }

}
makeCarrier(DeltaAbstractModule);
makeCarriable(DeltaAbstractModule);
makeGentleDropTarget(DeltaAbstractModule);

export class DeltaBasicModule extends DeltaAbstractModule {
    constructor(specs) {
        super(specs);
    }

    _improve({color, ...args}) {
        super._improve({...args});
        this._initFrame(this.width, this.height, Colors.INHERIT, color);
    }
}
makeFramed(DeltaBasicModule);

export class DeltaImageModule extends DeltaAbstractModule {
    constructor(specs) {
        super(specs);
    }

    _improve({ url, realisticUrl, ...args}) {
        super._improve(args);
        this._initImages(this.width, this.height, Colors.INHERIT, url, realisticUrl);
    }

    showRealistic() {
        this._setImageIndex(1);
    }

    showSchematic() {
        this._setImageIndex(0);
    }

    clone(duplicata) {
        return super.clone(duplicata)
    }
}
makeMultiImaged(DeltaImageModule);

export class DeltaBoxModule extends DeltaAbstractModule {
    constructor(specs) {
        super(specs);
    }

    _improve({contentWidth, contentHeight, contentX, contentY, ...args}) {
        super._improve({...args});
        this._initFrame(this.width, this.height, Colors.INHERIT, Colors.WHITE);
        this._boxContent = this._buildBoxContent(contentWidth, contentHeight, args);
        this._boxContent._setLocation(contentX, contentY);
        this._addPart(this._boxContent);
    }

    _buildBoxContent(contentWidth, contentHeight) {
        return new DeltaBoxContent({width:contentWidth, height:contentHeight});
    }

    get boxContent() {
        return this._boxContent;
    }

    showRealistic() {
        this.shape.fill = Colors.BLACK;
    }

    showSchematic() {
        this.shape.fill = Colors.WHITE;
    }
}
makeFramed(DeltaBoxModule);

export class DeltaSlottedBoxModule extends DeltaBoxModule {

    _buildBoxContent(contentWidth, contentHeight, {slotWidth}) {
        return new DeltaSlottedBoxContent({width:contentWidth, height:contentHeight, slotWidth});
    }

}

export class DeltaSlottedRichBoxModule extends DeltaSlottedBoxModule {

    _improve({
         contentX, contentY, contentWidth, contentHeight,
         slotWidth,
         headerHeight, footerHeight}
    ) {
        super._improve({contentX, contentY, contentWidth, contentHeight, slotWidth});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
    }

}
makeHeaderOwner(DeltaSlottedRichBoxModule);
makeFooterOwner(DeltaSlottedRichBoxModule);
makeFasciaSupport(DeltaSlottedRichBoxModule);

export class DeltaCaddyModule extends DeltaBoxModule {

    _buildBoxContent(contentWidth, contentHeight, color) {
        return new DeltaCaddyContent({width:contentWidth, height:contentHeight, color:Colors.LIGHTEST_GREY});
    }

}

export class DeltaRichCaddyModule extends DeltaCaddyModule {

    _improve({
                 contentX, contentY, contentWidth, contentHeight,
                 color,
                 headerHeight, footerHeight}
    ) {
        super._improve({contentX, contentY, contentWidth, contentHeight});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
    }

}
makeHeaderOwner(DeltaRichCaddyModule);
makeFooterOwner(DeltaRichCaddyModule);
makeFasciaSupport(DeltaRichCaddyModule);

export class DeltaAbstractCell extends SigmaElement {

    constructor({width, height, x, y, shape, compatibilities}) {
        super(width, height);
        this._initShape(shape.clone());
        this._setLocation(x, y);
        this._compatibilities = new ESet(compatibilities);
    }

    get compatibilities() {
        return this._compatibilities;
    }

    acceptElement(element) {
        if (!is(DeltaOption)(element) || !element.compatibilities) return false;
        return element.isCompatible(this.compatibilities);
    }

    _acceptDrop(element, dragSet) {
        return this.acceptElement(element);
    }

    _revertDrop(element) {
    }

    cellCompatibilities() {
        let result = new ESet(this.compatibilities);
        for (let option of this.children) {
            for (let compatibility of option.cellCompatibilities()) {
                result.add(compatibility);
            }
        }
        return result;
    }

}
makeShaped(DeltaAbstractCell);
makeSupport(DeltaAbstractCell);
makePositioningContainer(DeltaAbstractCell, {
    predicate: function(element) {
        return this.host.acceptElement(element);
    },
    positionsBuilder: element=>{return [{x:0, y:0}]}
});
makePart(DeltaAbstractCell);
makeSelectable(DeltaAbstractCell);
makeGentleDropTarget(DeltaAbstractCell);

export class DeltaCell extends DeltaAbstractCell {

    constructor({width, height, x, y, shape, compatibilities, family}) {
        super({width, height, x, y, shape, compatibilities});
        this._family = family;
        this._clickHandler(function() {
            return event=>{
                this.fill();
            }
        });
    }

    fill() {
        let selection = Selection.instance.selection(onCanvasLayer(Canvas.instance.toolsLayer));
        if (selection.size===1) {
            let element = selection.pick();
            if (this.acceptElement(element)) {
                let anOption = CopyPaste.instance.duplicateElement(element);
                this.addChild(anOption);
            }
        }
    }

    addChild(element) {
        this.option = element;
        if (this._family) {
            this.parent.dispatchAddOnFamily(this, element);
        }
    }

    removeChild(element) {
        this.option = null;
        if (this._family) {
            this.parent.dispatchRemoveOnFamily(this);
        }
    }

    get option() {
        return this.children[0];
    }

    set option(element) {
        this.clearChildren();
        if (element && this.acceptElement(element)) {
            super.addChild(element);
        }
    }

    get deletable() {
        return this.option && this.option.deletable;
    }

    delete() {
        this.option && this.option.delete();
    }

    select() {
        if (this._family) {
            this.parent.dispatchSelectOnFamily(this);
        }
    }

    unselect() {
        if (this._family) {
            this.parent.dispatchUnselectOnFamily(this);
        }
    }

    _receiveDrop(element, dragSet, initialTarget) {
    }

    _revertDrop(element) {
    }

    get family() {
        return this._family;
    }

}
makeClickable(DeltaCell);

export class DeltaOption extends DeltaItem {

    _improve({shape, compatibilities}) {
        super._improve();
        assert(compatibilities);
        this._initShape(shape.clone());
        this._compatibilities = new ESet(compatibilities);
        this._addObserver(this);
        this._clickHandler(function() {
            return event=>{
                if (this.parent && this.parent.fill) {
                    this.parent.fill();
                }
            }
        });
    }

    get compatibilities() {
        return this._compatibilities;
    }

    isCompatible(compatibilities) {
        for (let compatibility of compatibilities) {
            if (this.compatibilities.has(compatibility)) return true;
        }
        return false;
    }

    _notified(source, event, value) {
        if (source === this && event===Events.ATTACH) {
            if (this.parent && this.parent instanceof DeltaCell) {
                Selection.instance.unselect(this);
                Selection.instance.select(this.parent);
            }
        }
    }

    cellCompatibilities() {
        return new ESet();
    }

    select() {
        if (this.parent && this.parent instanceof DeltaCell) {
            Selection.instance.select(this.parent);
            Selection.instance.unselect(this);
        }
    }

    _draggedFrom(parent) {
        Selection.instance.select(this);
        if (parent instanceof DeltaCell) {
            Selection.instance.unselect(this.parent);
        }
    }

}
makeShaped(DeltaOption);
makeContainer(DeltaOption);
makeGentleDropTarget(DeltaOption);

export class DeltaColorOption extends DeltaOption {
}

export function makeCellsOwner(superClass) {

    extendMethod(superClass, $init=>
        function _init({cells, ...args}) {
            $init && $init.call(this, {cells, ...args});
            this._cells = new List(...cells);
            for (let cell of cells) {
                this._addPart(cell);
            }
        }
    );

    defineGetProperty(superClass,
        function cells() {
            return this._cells;
        }
    );

    defineGetProperty(superClass,
        function isCellsOwner() {
            return true;
        }
    );

    extendMethod(superClass, $select=>
        function select() {
            $select && $select.call(this);
            this.selectNextEmptyCell();
        }
    );

    defineMethod(superClass,
        function selectNextEmptyCell(cell) {

            function _deselectCells(owner) {
                for (let aCell of [...owner.cells]) {
                    if (Selection.instance.selected(aCell)) {
                        Selection.instance.unselect(aCell);
                    }
                }
            }

            for (let aCell of [...this.cells, ...this.cells]) {
                if (aCell === cell) {
                    cell = null;
                }
                else if (!cell) {
                    if (aCell.children.length === 0) {
                        _deselectCells(this);
                        Selection.instance.select(aCell);
                        break;
                    }
                }
            }
        }
    );

    replaceMethod(superClass,
        function cellCompatibilities() {
            let result = new ESet();
            for (let cell of this.cells) {
                for (let compatibility of cell.cellCompatibilities()) {
                    result.add(compatibility);
                }
            }
            return result;
        }
    );

    defineMethod(superClass,
        function dispatchAddOnFamily(cell, option) {
            for (let aCell of this.cells) {
                if (aCell !== cell && aCell.family === cell.family) {
                    let anOption = CopyPaste.instance.duplicateElement(option);
                    aCell.option = anOption;
                }
            }
        }
    );

    defineMethod(superClass,
        function dispatchRemoveOnFamily(cell) {
            for (let aCell of this.cells) {
                if (aCell !== cell && aCell.family === cell.family) {
                    aCell.option = null;
                }
            }
        }
    );

    defineMethod(superClass,
        function dispatchSelectOnFamily(cell) {
            for (let aCell of this.cells) {
                if (aCell !== cell && aCell.family === cell.family) {
                    if (!Selection.instance.selected(aCell)) {
                        Selection.instance.select(aCell);
                    }
                }
            }
        }
    );

    defineMethod(superClass,
        function dispatchUnselectOnFamily(cell) {
            for (let aCell of this.cells) {
                if (aCell !== cell && aCell.family === cell.family) {
                    if (Selection.instance.selected(aCell)) {
                        Selection.instance.unselect(aCell);
                    }
                }
            }
        }
    );
}

export class DeltaConfigurableOption extends DeltaOption {
    constructor({width, height, shape, compatibilities, cells}) {
        super({width, height, compatibilities, shape, cells});
    }

}
makeCellsOwner(DeltaConfigurableOption);

export class DeltaConfigurableModule extends DeltaBasicModule {
    constructor({width, height, depth, cells}) {
        super({width, height, depth, color:Colors.WHITE, cells});
    }
}
makeCellsOwner(DeltaConfigurableModule);

export class OptionItemBuilder extends SigmaItemBuilder {
    constructor(proto) {
        super(proto, function(items) {
            let selection = Selection.instance.selection(onCanvasLayer(Canvas.instance.baseLayer));
            for (let element of selection) {
                if (element instanceof DeltaCell && !element.option) {
                    let anOption = CopyPaste.instance.duplicateElement(items.pick());
                    element.addChild(anOption);
                    if (element.parent.isCellsOwner) {
                        element.parent.selectNextEmptyCell(element);
                    }
                }
            }
        });
    }

}

export class OptionsExpandablePanel extends ToolGridExpandablePanel {

    constructor(title, content) {
        super(title, content, cell=>cell.applyOr(this._compatibleOptions.bind(this)));
    }

    open() {
        Selection.instance.addObserver(this);
        if (!this._previousCompatibilitySet) {
            this._previousCompatibilitySet = new ESet();
        }
        this._compatibilitySet = null;
        super.open();
    }

    close() {
        super.close();
        Selection.instance.removeObserver(this);
    }

    _notified(source, event, value) {
        if (source === Selection.instance) {
            if (Selection.instance.selection(onCanvasLayer(Canvas.instance.baseLayer)).size) {
                if (this._compatibilitySet) {
                    this._previousCompatibilitySet = this._compatibilitySet;
                }
                this._compatibilitySet = null;
                this._refresh();
            }
        }
    }

    _getCompatibilitySet(selection) {
        if (!this._compatibilitySet) {
            this._compatibilitySet = new ESet();
            for (let selectedElement of selection) {
                if (selectedElement.cellCompatibilities) {
                    for (let compatibility of selectedElement.cellCompatibilities()) {
                        this._compatibilitySet.add(compatibility);
                    }
                }
            }
            if (!this._compatibilitySet.size) {
                this._compatibilitySet = this._previousCompatibilitySet;
            }
        }
        return this._compatibilitySet;
    }

    _compatibleOptions(element) {
        if (!is(DeltaOption)(element)) return false;
        let compatibilities = this._getCompatibilitySet(Selection.instance.selection());
        return element.isCompatible(compatibilities);
    }

}
