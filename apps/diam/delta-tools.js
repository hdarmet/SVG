import {
    Visitor
} from "../../js/base-element.js";
import {
    DIAMAbstractModule, DIAMBasicModule, DIAMCell, DIAMColorOption, DIAMConfigurableModule, DIAMImageModule,
    DIAMRichCaddyModule, DIAMSlottedBoxModule, DIAMSlottedRichBoxModule, OptionItemBuilder, DIAMConfigurableOption,
    OptionsExpandablePanel
} from "./delta-products.js";
import {
    DIAMBlister, DIAMCover, DIAMDivider, DIAMDoubleLadder, DIAMFascia, DIAMFasciaSupport, DIAMFixing, DIAMHook,
    DIAMLadder, DIAMPane, DIAMRichCaddy, DIAMRichPane, DIAMRichShelf, DIAMShelf, DIAMSlottedRichBox, DIAMVisual,
    DIAMSlottedBox, DIAMBox, DIAMAbstractLadder
} from "./delta-objects.js";
import {
    Layers, Context, Layer
} from "../../js/toolkit.js";
import {
    BoardItemBuilder, ToolGridPanelContent, ToolToggleCommand, FavoriteItemBuilder, ToolTabsetPanelPopup,
    ToolGridExpandablePanel, ToolCommandPopup, ToolFilterCard, ToolKeywordsCard, ToolExpandablePanelPopup
} from "../../js/tools.js";
import {
    FreePositioningMode
} from "./delta-core.js";
import {
    copyCommand, deleteCommand, Facilities, favoritesCommand, layersCommand, normalModeCommand, pasteCommand,
    regroupCommand, scrollModeCommand, selectAreaModeCommand, showInfosCommand, undoCommand, redoCommand, ungroupCommand,
    lockCommand, unlockCommand, zoomExtentCommand, zoomInCommand, zoomOutCommand, zoomSelectionCommand
} from "../../js/standard-facilities.js";
import {
    pdfModeCommand
} from "../../js/elements.js";
import {
    Circle, Colors, Rect
} from "../../js/graphics.js";
import {
    is
} from "../../js/misc.js";

export function defineLayers() {

    function showColorOptions(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMColorOption) {
                checked ? this.show() : this.hide();
            }
        });
    }

    function showVisuals(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMVisual) {
                checked ? this.show() : this.hide();
            }
        });
    }

    function showArtworks(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMCover || this instanceof DIAMFasciaSupport) {
                checked ? this.show() : this.hide();
            }
        });
    }

    function showModules(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this instanceof DIAMAbstractModule) {
                checked ? this.show() : this.hide();
            }
        });
    }

    function showHighlights(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.highlightable) {
                checked ? this.showHighlight() : this.hideHighlight();
            }
        });
    }

    function showDecorations(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.hasDecorations) {
                checked ? this.showDecorations() : this.hideDecorations();
            }
        });
    }

    function showRealistic(checked, elements) {
        new Visitor(elements, {checked}, function({checked}) {
            if (this.showRealistic) {
                checked ? this.showRealistic() : this.showSchematic();
            }
        });
    }

    function showReferences(checked, elements) {
        // TODO
    }

    Layers.instance
        .addLayer(new Layer("Legends", true, showDecorations))
        .addLayer(new Layer("Artwork", true, showArtworks))
        .addLayer(new Layer("Realistic", false, showRealistic))
        .addLayer(new Layer("Highlight", true, showHighlights))
        .addLayer(new Layer("Tickets", true, showVisuals))
        .addLayer(new Layer("Icon colors", true, showColorOptions))
        .addLayer(new Layer("References", true, showReferences))
        .addLayer(new Layer("Modules", true, showModules))
        .update([Context.table, Context.palettePopup]);
}

function spanOnLaddersCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/span_on.svg", "./images/icons/span_off.svg",
        () => {
            DIAMShelf.spiked = !DIAMShelf.spiked;
        }, () => DIAMShelf.spiked)
    );
}

function magnetCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/magnet_on.svg", "./images/icons/magnet_off.svg",
        () => {
            DIAMShelf.magnetized = !DIAMShelf.magnetized;
        }, () => DIAMShelf.magnetized)
    );
}

function freePositioningCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/free_on.svg", "./images/icons/free_off.svg",
        () => {
            FreePositioningMode.mode = !FreePositioningMode.mode;
        }, () => FreePositioningMode.mode)
    );
}

export function createCommandPopup(palettePopup) {
    let cmdPopup = new ToolCommandPopup(78, 32).display(39, 16);
    normalModeCommand(cmdPopup);
    selectAreaModeCommand(cmdPopup);
    scrollModeCommand(cmdPopup);
    pdfModeCommand(cmdPopup);
    cmdPopup.addMargin();
    zoomInCommand(cmdPopup);
    zoomOutCommand(cmdPopup);
    zoomExtentCommand(cmdPopup);
    zoomSelectionCommand(cmdPopup);
    cmdPopup.addMargin();
    copyCommand(cmdPopup);
    pasteCommand(cmdPopup);
    undoCommand(cmdPopup);
    redoCommand(cmdPopup);
    cmdPopup.addMargin();
    regroupCommand(cmdPopup);
    ungroupCommand(cmdPopup);
    lockCommand(cmdPopup);
    unlockCommand(cmdPopup);
    cmdPopup.addMargin();
    magnetCommand(cmdPopup);
    spanOnLaddersCommand(cmdPopup);
    freePositioningCommand(cmdPopup);
    layersCommand(cmdPopup);
    showInfosCommand(cmdPopup);
    favoritesCommand(cmdPopup, palettePopup._paletteContent);
    cmdPopup.addMargin();
    deleteCommand(cmdPopup);
    return cmdPopup;
}

export function setShortcuts() {
    Facilities.allowElementDeletion();
}

export function createPalettePopup() {
    let paletteContent = new ToolGridPanelContent(200, 80, 80);
    paletteContent.addCell(new BoardItemBuilder([new DIAMPane({
        width:840, height:500, contentX:0, contentY:0, contentWidth:810, contentHeight:460,
        label:"pane"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichPane({
        width:840, height:500, contentX:0, contentY:0, contentWidth:810, contentHeight:460, headerHeight:40, footerHeight:40,
        label:"rich pane", lineMargin:30, labelMargin:60, indexMargin:40
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMHook()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFixing()]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMLadder({width:10, height:100, topSlot:-45, bottomSlot:45, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMLadder({width:10, height:10, topSlot:0, bottomSlot:0, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMDoubleLadder({width:20, height:100, topSlot:-45, bottomSlot:45, slotInterval:5})]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMShelf({
        width:100, height:10, leftClip:{x:-45, y:0}, rightClip:{x:45, y:0}, label:'shelf',
        font_family:"arial", font_size:6, fill:Colors.GREY,
        position_font_family:"arial", position_font_size:4, position_fill:Colors.GREY
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMRichShelf({
        width:100, height:10, leftClip:{x:-45, y:0}, rightClip:{x:45, y:0}, label:'shelf', coverY:0, coverHeight:20,
        font_family:"arial", font_size:8, fill:Colors.GREY,
        position_font_family:"arial", position_font_size:4, position_fill:Colors.GREY
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedBox({
        width:120, height:70, clips:[{x:0, y:15}], contentX:0, contentY:0, contentWidth:100, contentHeight:60, slotWidth:20,
        status:{code:"N", color:Colors.RED}
    })]));

    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedBoxModule({
        width:120, height:70, contentX:0, contentY:0, contentWidth:100, contentHeight:60, slotWidth:20,
        status:{code:"B", color:Colors.BLUE}
    })]));

    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedRichBox({
        width:120, height:70, clips:[{x:0, y:15}],
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:10, footerHeight:10,
        status:{code:"V", color:Colors.GREEN}
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMSlottedRichBoxModule({
        width:120, height:70,
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:10, footerHeight:10,
        status:{code:"B", color:Colors.BLUE}
    })]));

    paletteContent.addCell(new BoardItemBuilder([new DIAMRichCaddy({
        width:120, height:70, clips:[{x:0, y:15}],
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:5, footerHeight:15
    })]));

    paletteContent.addCell(new BoardItemBuilder([new DIAMRichCaddyModule({
        width:120, height:70,
        contentX:0, contentY:0, contentWidth:100, contentHeight:60,
        slotWidth:20,
        headerHeight:5, footerHeight:15,
        status:{code:"B", color:Colors.BLUE}
    })]));

    paletteContent.addCell(new BoardItemBuilder([new DIAMDivider({
        width:10, height:460, contentX:0
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBox({
        width:120, height:140, clips:[{x:0, y:-20}, {x:0, y:50}], contentX:0, contentY:0, contentWidth:100, contentHeight:130
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:4, x:-5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"a"
            }),
            new DIAMCell({width:4, height:4, x:0, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"a"
            }),
            new DIAMCell({width:4, height:4, x:5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"a"
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"b"
            }),
            new DIAMCell({width:4, height:4, x:0, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"b"
            }),
            new DIAMCell({width:4, height:4, x:5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"], family:"b"
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-5,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:10, x:-5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:0, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMConfigurableModule({
        width:20, height:40, cells:[
            new DIAMCell({width:4, height:4, x:-5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-15,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:-5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:0, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:4, x:5, y:-10,
                shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["C"]
            }),
            new DIAMCell({width:4, height:10, x:-5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:0, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            }),
            new DIAMCell({width:4, height:10, x:5, y:5,
                shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["O"]
            })
        ]
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMImageModule({
        width:20, height:40, realisticUrl:"./apps/diam/modules/eye liner c.png", url:{svg:"./apps/diam/modules/eye liner b.svg", rasterized:true}
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
        width:20, height:40, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
        width:40, height:40, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBasicModule({
        width:20, height:40, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:30, height:60, clip:{x:0, y:-15, radius:8}, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:35, height:75, clip:{x:0, y:-25, radius:8}, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMBlister({
        width:45, height:90, clip:{x:0, y:-30, radius:8}, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:120, height:10, color:"#FFFF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:840, height:40, color:"#FF0000"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:800, height:60, color:"#00FF00"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMVisual({
        width:600, height:60, color:"#0000FF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFascia({
        width:120, height:50, color:"#00FFFF"
    })]));
    paletteContent.addCell(new BoardItemBuilder([new DIAMFascia({
        width:120, height:60, color:"#FF00FF"
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0F0F"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00F0F"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:4,
        shape:new Circle(0, 0, 2).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#AA0000"}),
        compatibilities:["C"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -10, 4, 20).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:-7,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -6, 4, 16).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:-3,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMConfigurableOption({width:4, height:20,
        shape:new Rect(-2, -2, 4, 12).attrs({stroke_width:0.25, stroke:Colors.GREY, fill:Colors.WHITE}),
        compatibilities:["O"],
        cells:[
            new DIAMCell({width:4, height:4, x:0, y:1,
                shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:Colors.LIGHTEST_GREY}),
                compatibilities:["R"]
            })
        ]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0000"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00000"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#FF0F0F"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#F00F0F"}),
        compatibilities:["R"]
    })]));
    paletteContent.addCell(new OptionItemBuilder([new DIAMColorOption({width:4, height:6,
        shape:new Rect(-2, -3, 4, 6).attrs({stroke_width:0.25, stroke:Colors.MIDDLE_GREY, fill:"#AA0000"}),
        compatibilities:["R"]
    })]));
    let filterCard = new ToolFilterCard(200, 40, input=>console.log("Input:", input));
    let keywordsCard = new ToolKeywordsCard(200, keyword=>console.log("Keyword:", keyword))
        .addKeyword("alpha", "A")
        .addKeyword("beta", "B")
        .addKeyword("gamma", "C")
        .addKeyword("delta", "D")
        .addKeyword("epsilon", "E")
        .addKeyword("alpha")
        .addKeyword("beta")
        .addKeyword("gamma")
        .addKeyword("delta")
        .addKeyword("epsilon");
    let palettePopup = new ToolTabsetPanelPopup(210, 200, 350, [filterCard, keywordsCard]).display(-110, 240);
    palettePopup.addPanel(new ToolGridExpandablePanel("All", paletteContent));
    palettePopup.addPanel(new ToolGridExpandablePanel("Furniture", paletteContent,
        cell=>cell.applyAnd(is(DIAMPane, DIAMAbstractLadder, DIAMShelf, DIAMBox, DIAMFixing, DIAMHook))));
    palettePopup.addPanel(new ToolGridExpandablePanel("Modules", paletteContent,
        cell=>cell.applyAnd(is(DIAMAbstractModule))));
    palettePopup.addPanel(new OptionsExpandablePanel("Colors And Options", paletteContent));
    palettePopup.addPanel(new ToolGridExpandablePanel("Favorites", paletteContent,
        cell=>cell instanceof FavoriteItemBuilder));
    palettePopup._paletteContent = paletteContent;
    return palettePopup;
}