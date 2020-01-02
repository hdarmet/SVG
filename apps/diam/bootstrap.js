'use strict';

import {
    always, is, assert, defineGetProperty, extendMethod
} from "../../js/misc.js";
import {
    ESet, List
} from "../../js/collections.js";
import {
    Context, Canvas, Groups, Memento, setLayeredGlassStrategy, Selection, computeGridStep
} from "../../js/toolkit.js";
import {
    StandardDragMode
} from "../../js/drag-and-drop.js";
import {
    BoardTable, BoardArea
} from "../../js/base-element.js";
import {
    makeDecorationsOwner
} from "../../js/core-mixins.js";
import {
    makePart, makeContainerMultiLayered, makePartsOwner
} from "../../js/container-mixins.js";
import {
    TextDecoration
} from "../../js/standard-mixins.js";
import {
    win, Colors, Visibility
} from "../../js/graphics.js";
import {
    TextMenuOption
} from "../../js/tools.js";
import {
    Facilities
} from "../../js/standard-facilities.js";
import {
    makeGravitationContainer
} from "../../js/collision-physics.js";
import {
    BoardPrintArea, makeResizeable, makeResizeableContent, BoardHandle, SizerDecoration
} from "../../js/elements.js";
import {
    LAYERS_DEFINITION, makeFreePositioningOwner, makeLabelOwner, TABLE_LAYERS_DEFINITION, DeltaSupport, DeltaLayers
} from "./delta-core.js";
import {
    DeltaAbstractModule
} from "./delta-products.js";
import {
    DeltaBox, DeltaPane
} from "./delta-objects.js";
import {
    createCommandPopup, createPalettePopup, setShortcuts, defineLayers, createMenuPopup
} from "./delta-tools.js";
import {
    makeSelectable
} from "../../js/core-mixins.js";
import {
    Bubble
} from "../../js/svgtools.js";

class BoardPaper extends BoardArea {
    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
    }

}
makePart(BoardPaper);

class DeltaPaperContent extends DeltaSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.WHITE});
    }

    get freeTarget() {
        return this.parent;
    }
}
makeGravitationContainer(DeltaPaperContent, {
    predicate: is(DeltaPane, DeltaAbstractModule, DeltaBox),
    carryingPredicate: always,
    bordersCollide:{all:true}
});
makePart(DeltaPaperContent);
makeContainerMultiLayered(DeltaPaperContent, LAYERS_DEFINITION);
makeResizeableContent(DeltaPaperContent);

class DeltaPaper extends BoardPaper {
    constructor({width, height}) {
        super(width, height, Colors.WHITE);
        this._sizerDecoration = new SizerDecoration();
        this._addDecoration(this._sizerDecoration);
    }

    _improve(...args) {
        this._contentPane = new DeltaPaperContent({width:this.width-DeltaPaper.MARGIN*2, height:this.height-DeltaPaper.MARGIN*2});
        this._addPart(this._contentPane);
        this._initResize(Colors.RED);
        super._improve(...args);
    }

    get freeTarget() {
        return this;
    }

    get zOrder() {
        if (this.parent) return this.parent.zOrder;
        return 0;
    }

    _revertDrop(element) {
    }

    select() {
        this.putHandles();
    }

    unselect() {
        this.removeHandles();
    }

    get selectionMark() {
        return null;
    }

    get minWidth() {
        return this._contentPane.minWidth + DeltaPaper.MARGIN*2;
    }

    get minHeight() {
        return this._contentPane.minHeight + DeltaPaper.MARGIN*2;
    }

    resize(width, height, direction) {
        this._contentPane.resize(width-DeltaPaper.MARGIN*2, height-DeltaPaper.MARGIN*2, direction);
    }

    setLocation(x, y) {
        super.setLocation(0, 0);
    }

    setSize(width, height) {
        super.setSize(width, height);
        this._contentPane.setSize(width-DeltaPaper.MARGIN*2, height-DeltaPaper.MARGIN*2);
    }

}
makePartsOwner(DeltaPaper);
makeFreePositioningOwner(DeltaPaper);
makeSelectable(DeltaPaper);
makeDecorationsOwner(DeltaPaper);
makeResizeable(DeltaPaper, BoardHandle.ALL, computeGridStep);
DeltaPaper.MARGIN = 10;

class DeltaAbstractTable extends BoardTable {

    constructor({width, height, backgroundColor}) {
        super(width, height, backgroundColor);
    }

    get zOrder() {
        if (this.parent) return this.parent.zOrder;
        return 0;
    }

    get freeTarget() {
        return this;
    }
}
makeContainerMultiLayered(DeltaAbstractTable, TABLE_LAYERS_DEFINITION);
makeFreePositioningOwner(DeltaAbstractTable);

const PDF = {

    getSortedPdfAreas(pdfAreas, pdfArea) {
        function getSelectedPdfAreas(pdfAreas) {
            let selected = new List();
            for (let area of pdfAreas) {
                if (Selection.instance.selected(area)) {
                    selected.add(area);
                }
            }
            return selected;
        }

        let selectedPdfAreas = getSelectedPdfAreas(pdfAreas);
        if (pdfArea && !Selection.instance.selected(pdfArea)) selectedPdfAreas.add(pdfArea);
        selectedPdfAreas.sort((a1, a2) => a1.order - a2.order);
        return selectedPdfAreas;
    },

    putSelectedPdfAreaOnBackground(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        let index = 1;
        for (let area of selectedPdfAreas) {
            area.order = index++;
        }
        for (let area of pdfAreas) {
            if (!selectedPdfAreas.contains(area)) {
                area.order = index++;
            }
        }
    },

    backwardSelectedArea(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        let limit = 0;
        for (let i = 0; i < pdfAreas.length; i++) {
            if (selectedPdfAreas.contains(pdfAreas[i])) {
                if (limit === i) limit++;
                else {
                    if (i > 0) {
                        pdfAreas[i].order = i;
                        pdfAreas[i - 1].order = i + 1;
                        let tmp = pdfAreas[i];
                        pdfAreas[i] = pdfAreas[i - 1];
                        pdfAreas[i - 1] = tmp;
                    }
                }
            }
        }
    },

    forwardSelectedArea(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        let limit = pdfAreas.length - 1;
        for (let i = pdfAreas.length - 1; i >= 0; i--) {
            if (selectedPdfAreas.contains(pdfAreas[i])) {
                if (limit === i) limit--;
                else {
                    if (i < pdfAreas.length - 1) {
                        pdfAreas[i].order = i + 2;
                        pdfAreas[i + 1].order = i + 1;
                        let tmp = pdfAreas[i];
                        pdfAreas[i] = pdfAreas[i + 1];
                        pdfAreas[i + 1] = tmp;
                    }
                }
            }
        }
    },

    putSelectedPdfAreaOnForeground(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        let index = 1;
        for (let area of pdfAreas) {
            if (!selectedPdfAreas.contains(area)) {
                area.order = index++;
            }
        }
        for (let area of selectedPdfAreas) {
            area.order = index++;
        }
    },

    selectedPdfAreaAreOnBack(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        for (let pdfArea of selectedPdfAreas) {
            if (pdfArea.order > selectedPdfAreas.length) return false;
        }
        return true;
    },

    selectedPdfAreaAreOnFront(pdfAreas, pdfArea) {
        let selectedPdfAreas = PDF.getSortedPdfAreas(pdfAreas, pdfArea);
        for (let pdfArea of selectedPdfAreas) {
            if (pdfArea.order <= pdfAreas.length - selectedPdfAreas.length)
                return false;
        }
        return true;
    }

};

class DeltaPrintArea extends BoardPrintArea {

    constructor(width, height) {
        super(width, height);
        this._order = 0;
        this._labelDecoration = new TextDecoration(this, this._getLabel, {
            x:TextDecoration.LEFT, y:TextDecoration.TOP
        });
        this._addDecoration(this._labelDecoration);
    }

    _getLabel() {
        return (this._label?this._label+" ":"")+"("+this._order+")";
    }

    _setLabel(label) {
        this._labelDecoration.refresh();
    }

    _createContextMenu() {
        super._createContextMenu();
        this._addMenuOption(new TextMenuOption("background",
            function() {
                PDF.putSelectedPdfAreaOnBackground(this.parent.pdfAreas, this);
            },
            function() {
                return !PDF.selectedPdfAreaAreOnBack(this.parent.pdfAreas, this);
            })
        );
        this._addMenuOption(new TextMenuOption("backward",
            function() {
                PDF.backwardSelectedArea(this.parent.pdfAreas, this);
            },
            function() {
                return !PDF.selectedPdfAreaAreOnBack(this.parent.pdfAreas, this);
            })
        );
        this._addMenuOption(new TextMenuOption("forward",
            function() {
                PDF.forwardSelectedArea(this.parent.pdfAreas, this);
            },
            function() {
                return !PDF.selectedPdfAreaAreOnFront(this.parent.pdfAreas, this);
            })
        );
        this._addMenuOption(new TextMenuOption("foreground",
            function() {
                PDF.putSelectedPdfAreaOnForeground(this.parent.pdfAreas, this);
            },
            function() {
                return !PDF.selectedPdfAreaAreOnFront(this.parent.pdfAreas, this);
            })
        );
    }

    resize(width, height) {
        super.resize(width, height);
        this._labelDecoration.refresh();
        return this;
    };

    getDropTarget(target) {
        return Context.table;
    }

    get order() {
        return this._order;
    }

    _setOrder(order) {
        this._order = order;
        this._setLabel(this._label);
    }

    set order(order) {
        Memento.register(this);
        this._setOrder(order);
    }

    _memento() {
        let memento = super._memento();
        memento._order = this._order;
        return memento;
    }

    _revert(memento) {
        let result = super.revert(memento);
        this._order = memento._order;
        return result;
    }
}
makeLabelOwner(DeltaPrintArea);
makeDecorationsOwner(DeltaPrintArea);

function makePdfAreasOwner(superClass) {

    extendMethod(superClass, $init=>
        function _init(...args) {
            $init.call(this, ...args);
            this._pdfAreas = new List();
        }
    );

    defineGetProperty(superClass,
        function pdfAreas() {
            return this._pdfAreas;
        }
    );

    extendMethod(superClass, $notified=>
        function _notified(source, type, value) {
            $notified && $notified.call(this, source, type, value);
            if (type === BoardPrintArea.events.NEW_AREA) {
                let printArea = new DeltaPrintArea(value.width, value.height);
                printArea.order = this._pdfAreas.length+1;
                printArea.setLocation(value.x, value.y);
                this.addChild(printArea);
                win.setTimeout(function() {
                    Selection.instance.selectOnly(printArea);
                }, 1);
            }
        }
    );

    extendMethod(superClass, $addChild=>
        function _addChild(element) {
            let result = $addChild.call(this, element);
            if (element instanceof DeltaPrintArea) {
                this._pdfAreas.add(element);
            }
            return result;
        }
    );

    extendMethod(superClass, $insertChild=>
        function _insertChild(previous, element) {
            assert((previous instanceof DeltaPrintArea && element instanceof DeltaPrintArea) ||
                (!(previous instanceof DeltaPrintArea) && !(element instanceof DeltaPrintArea)));
            let result = $insertChild.call(this, previous, element);
            if (element instanceof DeltaPrintArea) {
                this._pdfAreas.insert(previous, element);
            }
            return result;
        }
    );

    extendMethod(superClass, $replaceChild=>
        function _replaceChild(previous, element) {
            assert((previous instanceof DeltaPrintArea && element instanceof DeltaPrintArea) ||
                (!(previous instanceof DeltaPrintArea) && !(element instanceof DeltaPrintArea)));
            let result = $replaceChild.call(this, previous, element);
            if (previous instanceof DeltaPrintArea) {
                this._pdfAreas.replace(previous, element);
            }
            return result;
        }
    );

    extendMethod(superClass, $removeChild=>
        function _removeChild(element) {
            let result = $removeChild.call(this, element);
            if (element instanceof DeltaPrintArea) {
                this._pdfAreas.remove(element);
            }
            return result;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento._pdfAreas = new List(...this._pdfAreas);
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._pdfAreas = new List(memento._pdfAreas);
            return this;
        }
    );

}

class DeltaTable extends DeltaAbstractTable {

    constructor({width, height, backgroundColor}) {
        super({width, height, backgroundColor});
        this._observe(Canvas.instance);
        this.getLayerNode(DeltaLayers.PDF).z_index = DeltaTable.PDFZOrder;
    }

    _getLayer(element) {
        if (element instanceof BoardPrintArea) {
            return DeltaLayers.PDF;
        }
        return super._getLayer(element);
    }

    _acceptDrop(element, dragSet, initialTarget) {
        return true;
    }

    _executeDrop(element, dragSet, initialTarget) {
        if (element instanceof DeltaPrintArea || !super._executeDrop(element, dragSet, initialTarget)) {
            this.addChild(element);
        }
        return true;
    }

    _notified(source, event, ...args) {
        if (event === StandardDragMode.events.SWITCH_MODE) {
            if (StandardDragMode.mode === StandardDragMode.PRINT) {
                this.getLayerNode(DeltaLayers.PDF).visibility = Visibility.VISIBLE;
            }
            else {
                this.getLayerNode(DeltaLayers.PDF).visibility = Visibility.HIDDEN;
            }
        }
        else super._notified(source, event, ...args);
    }

}
DeltaTable.PDFZOrder = 500;
makePdfAreasOwner(DeltaTable);

function createTable() {
    setLayeredGlassStrategy(BoardTable, TABLE_LAYERS_DEFINITION);
    Context.table = new DeltaTable({width:4000, height:3000, backgroundColor:"#A0A0A0"});
    Canvas.instance.putOnBase(Context.table);
}

function createCanvas() {
    Canvas.instance = new Canvas("#app", "width:100%;height:100%;margin:0;padding:0;overflow:hidden;");
    Canvas.instance.manageMenus();
    Canvas.instance.enablePrint();
    Selection.instance = new Groups();
}

function createPaper() {
    Context.paper = new DeltaPaper({width:3000, height:1500});
    Context.table._addPart(Context.paper);
    Facilities.zoomExtent();
}

function main() {
    createCanvas();
    createTable();
    createPaper();
    Context.palettePopup = createPalettePopup();
    Context.commandPopup = createCommandPopup(Context.palettePopup);
    createMenuPopup();
    setShortcuts();
    defineLayers();
    Context.memento.opened = true;
    Context.start();

    let bubble = new Bubble(-50, -50, 100, 100, 70, 60, 16, 5);
    bubble.attrs({fill:Colors.WHITE, stroke:Colors.BLACK, px:100, py:0, filter:Canvas.instance.shadowFilter});
    Canvas.instance.baseLayer._root.add(bubble);

}

main();