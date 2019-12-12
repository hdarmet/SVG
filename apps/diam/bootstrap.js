'use strict';

import {
    always, is, assert
} from "../../js/misc.js";
import {
    ESet, List
} from "../../js/collections.js";
import {
    Context, Canvas, Groups, Memento, setLayeredGlassStrategy, Selection
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
    BoardPrintArea
} from "../../js/elements.js";
import {
    LAYERS_DEFINITION, makeFreePositioningOwner, makeLabelOwner, TABLE_LAYERS_DEFINITION, DIAMSupport, DIAMLayers
} from "./delta-core.js";
import {
    DIAMAbstractModule
} from "./delta-products.js";
import {
    DIAMBox, DIAMPane
} from "./delta-objects.js";
import {
    createCommandPopup, createPalettePopup, setShortcuts, defineLayers
} from "./delta-tools.js";

class BoardPaper extends BoardArea {
    constructor(width, height, backgroundColor) {
        super(width, height, backgroundColor);
    }

}
makePart(BoardPaper);

class DIAMPaperContent extends DIAMSupport {
    constructor({width, height}) {
        super({width, height, strokeColor:Colors.NONE, backgroundColor:Colors.WHITE});
    }

    get freeTarget() {
        return this.parent;
    }
}
makeGravitationContainer(DIAMPaperContent, {
    predicate: is(DIAMPane, DIAMAbstractModule, DIAMBox),
    carryingPredicate: always,
    bordersCollide:{all:true}
});
makePart(DIAMPaperContent);
makeContainerMultiLayered(DIAMPaperContent, LAYERS_DEFINITION);

class DIAMPaper extends BoardPaper {
    constructor({width, height}) {
        super(width, height, Colors.WHITE);
        this._contentPane = new DIAMPaperContent({width:width-DIAMPaper.MARGIN*2, height:height-DIAMPaper.MARGIN*2});
        this._addPart(this._contentPane);
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

}
makePartsOwner(DIAMPaper);
makeFreePositioningOwner(DIAMPaper);
DIAMPaper.MARGIN = 10;

class DIAMAbstractTable extends BoardTable {

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
makeContainerMultiLayered(DIAMAbstractTable, TABLE_LAYERS_DEFINITION);
makeFreePositioningOwner(DIAMAbstractTable);

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

class DIAMPrintArea extends BoardPrintArea {

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
makeLabelOwner(DIAMPrintArea);
makeDecorationsOwner(DIAMPrintArea);

function makePdfAreasOwner(superClass) {

    let init = superClass.prototype._init;
    superClass.prototype._init = function(...args) {
        init.call(this, ...args);
        this._pdfAreas = new List();
    };

    Object.defineProperty(superClass.prototype, "pdfAreas", {
        configurable: true,
        get() {
            return this._pdfAreas;
        }
    });

    let notified = superClass.prototype._notified;
    superClass.prototype._notified = function(source, type, value) {
        notified && notified.call(this, source, type, value);
        if (type === BoardPrintArea.events.NEW_AREA) {
            let printArea = new DIAMPrintArea(value.width, value.height);
            printArea.order = this._pdfAreas.length+1;
            printArea.setLocation(value.x, value.y);
            this.addChild(printArea);
            win.setTimeout(function() {
                Selection.instance.selectOnly(printArea);
            }, 1);
        }
    };

    let addChild = superClass.prototype._addChild;
    superClass.prototype._addChild = function(element) {
        let result = addChild.call(this, element);
        if (element instanceof DIAMPrintArea) {
            this._pdfAreas.add(element);
        }
        return result;
    };

    let insertChild = superClass.prototype._insertChild;
    superClass.prototype._insertChild = function(previous, element) {
        assert((previous instanceof DIAMPrintArea && element instanceof DIAMPrintArea) ||
            (!(previous instanceof DIAMPrintArea) && !(element instanceof DIAMPrintArea)));
        let result = insertChild.call(this, previous, element);
        if (element instanceof DIAMPrintArea) {
            this._pdfAreas.insert(previous, element);
        }
        return result;
    };

    let replaceChild = superClass.prototype._replaceChild;
    superClass.prototype._replaceChild = function(previous, element) {
        assert((previous instanceof DIAMPrintArea && element instanceof DIAMPrintArea) ||
            (!(previous instanceof DIAMPrintArea) && !(element instanceof DIAMPrintArea)));
        let result = replaceChild.call(this, previous, element);
        if (previous instanceof DIAMPrintArea) {
            this._pdfAreas.replace(previous, element);
        }
        return result;
    };

    let removeChild = superClass.prototype._removeChild;
    superClass.prototype._removeChild = function(element) {
        let result = removeChild.call(this, element);
        if (element instanceof DIAMPrintArea) {
            this._pdfAreas.remove(element);
        }
        return result;
    };

    let superMemento = superClass.prototype._memento;
    superClass.prototype._memento = function() {
        let memento = superMemento.call(this);
        memento._pdfAreas = new List(...this._pdfAreas);
        return memento;
    };

    let superRevert = superClass.prototype._revert;
    superClass.prototype._revert = function(memento) {
        superRevert.call(this, memento);
        this._pdfAreas = new List(memento._pdfAreas);
        return this;
    };

    return superClass;
}

class DIAMTable extends DIAMAbstractTable {

    constructor({width, height, backgroundColor}) {
        super({width, height, backgroundColor});
        this._observe(Canvas.instance);
        this.getLayerNode(DIAMLayers.PDF).z_index = DIAMTable.PDFZOrder;
    }

    _getLayer(element) {
        if (element instanceof BoardPrintArea) {
            return DIAMLayers.PDF;
        }
        return super._getLayer(element);
    }

    _acceptDrop(element, dragSet, initialTarget) {
        return true;
    }

    _executeDrop(element, dragSet, initialTarget) {
        if (element instanceof DIAMPrintArea || !super._executeDrop(element, dragSet, initialTarget)) {
            this.addChild(element);
        }
        return true;
    }

    _notified(source, event, ...args) {
        if (event === StandardDragMode.events.SWITCH_MODE) {
            if (StandardDragMode.mode === StandardDragMode.PRINT) {
                this.getLayerNode(DIAMLayers.PDF).visibility = Visibility.VISIBLE;
            }
            else {
                this.getLayerNode(DIAMLayers.PDF).visibility = Visibility.HIDDEN;
            }
        }
        else super._notified(source, event, ...args);
    }

}
DIAMTable.PDFZOrder = 500;
makePdfAreasOwner(DIAMTable);

function createTable() {
    setLayeredGlassStrategy(BoardTable, TABLE_LAYERS_DEFINITION);
    Context.table = new DIAMTable({width:4000, height:3000, backgroundColor:"#A0A0A0"});
    Canvas.instance.putOnBase(Context.table);
}

function createCanvas() {
    Canvas.instance = new Canvas("#app", "width:100%;height:100%;margin:0;padding:0;overflow:hidden;");
    Canvas.instance.manageMenus();
    Canvas.instance.enablePrint();
    Selection.instance = new Groups();
}

function createPaper() {
    Context.paper = new DIAMPaper({width:3000, height:1500});
    Context.table._addPart(Context.paper);
    Facilities.zoomExtent();
}

function main() {
    createCanvas();
    createTable();
    createPaper();
    Context.palettePopup = createPalettePopup();
    Context.commandPopup = createCommandPopup(Context.palettePopup);
    setShortcuts();
    defineLayers();
    Context.memento.opened = true;
    Context.start();
}

main();