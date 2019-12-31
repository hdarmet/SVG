
import {
    makeGroupable,
    makeHighlightable, makeLockable
} from "./standard-mixins.js";
import {
    ColorChooserMenuOption, TextToggleMenuOption, ToolToggleCommand, ToolCommand, CheckMenuOption, FavoriteItemBuilder,
    TextMenuOption
} from "./tools.js";
import {
    Canvas, CopyPaste, l2lBoundingBox, Memento, Selection, Anchor, getExtension, Context, Layers
} from "./toolkit.js";
import {
    StandardDragMode
} from "./drag-and-drop.js";
import {
    always
} from "./misc.js";
import {
    List
} from "./collections.js";
import {
    KeyboardEvents
} from "./graphics.js";
import {
    makeDeletable
} from "./core-mixins.js";

export const Facilities = {
    _selection(element, predicate) {
        let selection = Selection.instance.selection(predicate);
        element && selection.add(element);
        return selection;
    },
    isMaxZoom() {
        return Canvas.instance.maxZoom <= Canvas.instance.zoom;
    },
    isMinZoom() {
        return Canvas.instance.minZoom >= Canvas.instance.zoom;
    },
    zoomInSelect() {
        if (!this.isMaxZoom()) {
            let bbox = l2lBoundingBox(Selection.instance.selection(), Canvas.instance.globalMatrix);
            if (bbox !== null) {
                let px = (bbox.left + bbox.right) / 2;
                let py = (bbox.top + bbox.bottom) / 2;
                Canvas.instance.zoomIn(px, py);
            } else {
                let matrix = Canvas.instance.globalMatrix.invert();
                let cx = Canvas.instance.clientWidth / 2;
                let cy = Canvas.instance.clientHeight / 2;
                let px = matrix.x(cx, cy);
                let py = matrix.y(cx, cy);
                Canvas.instance.zoomIn(px, py);
            }
        }
    },
    zoomOutSelect() {
        if (!this.isMinZoom()) {
            let bbox = l2lBoundingBox(Selection.instance.selection(), Canvas.instance.globalMatrix);
            if (bbox !== null) {
                let px = (bbox.left + bbox.right) / 2;
                let py = (bbox.top + bbox.bottom) / 2;
                Canvas.instance.zoomOut(px, py);
            } else {
                let matrix = Canvas.instance.globalMatrix.invert();
                let cx = Canvas.instance.clientWidth / 2;
                let cy = Canvas.instance.clientHeight / 2;
                let px = matrix.x(cx, cy);
                let py = matrix.y(cx, cy);
                Canvas.instance.zoomOut(px, py);
            }
        }
    },
    zoomFit(elements) {
        let bbox = l2lBoundingBox(elements, Canvas.instance.baseGlobalMatrix);
        if (bbox !== null) {
            let width = bbox.right - bbox.left;
            let height = bbox.bottom - bbox.top;
            let scale = Math.min(Canvas.instance.clientWidth / width, Canvas.instance.clientHeight / height) * 0.9;
            Canvas.instance.zoomSet(scale, 0, 0);
            let px = (bbox.left + bbox.right) / 2;
            let py = (bbox.top + bbox.bottom) / 2;
            Canvas.instance.scrollTo(px, py);
        }
    },
    zoomExtent() {
        this.zoomFit(Canvas.instance.baseChildren);
    },
    zoomSelection() {
        this.zoomFit(Selection.instance.selection());
    },
    selectionEmpty() {
        return Selection.instance.selection().size === 0;
    },
    copy() {
        CopyPaste.instance.copyModel(Selection.instance.selection());
    },
    pastable() {
        return CopyPaste.instance.pastable;
    },
    paste() {
        CopyPaste.instance.pasteModel();
    },
    undoable() {
        return Memento.instance.undoable();
    },
    undo() {
        Memento.instance.undo();
    },
    redoable() {
        return Memento.instance.redoable();
    },
    redo() {
        Memento.instance.redo();
    },
    highlight(element, highlight) {
        let selection = this._selection(element);
        for (let element of selection) {
            if (element.highlightable) {
                element.highlight = highlight;
            }
        }
    },
    regroup(element) {
        Memento.instance.open();
        Selection.instance.regroup(element);
    },
    ungroup(element) {
        Memento.instance.open();
        Selection.instance.ungroup(element);
    },
    groupable(element) {
        return Selection.instance.groupable(element);
    },
    ungroupable(element) {
        return Selection.instance.ungroupable(element);
    },
    lock(element) {
        Memento.instance.open();
        let selection = this._selection(element);
        for (let element of selection) {
            if (element.lockable && !element.lock) {
                element.lock = true;
            }
        }
    },
    unlock(element) {
        Memento.instance.open();
        let selection = this._selection(element);
        for (let element of selection) {
            if (element.lockable && element.lock) {
                element.lock = false;
            }
        }
    },
    lockable(element) {
        let selection = this._selection(element);
        let result = false;
        for (let element of selection) {
            if (!element.lockable) return false;
            if (!element.lock) result = true;
        }
        return result;
    },
    unlockable(element) {
        let selection = this._selection(element);
        let result = true;
        for (let element of selection) {
            if (!element.lockable) return false;
            if (!element.lock) result = false;
        }
        return result;
    },
    delete(element) {
        Memento.instance.open();
        let selection = this._selection(element);
        for (let child of selection) {
            if (child.deletable) {
                child.delete();
            }
        }
    },
    allowElementDeletion() {
        Anchor.instance.addEventListener(KeyboardEvents.KEY_UP, event => {
                if (!Context.freezed) {
                    if (event.key === "Delete" || event.key === "Backspace")
                        Facilities.delete();
                }
            }
        );
    },
    deletable(element) {
        let selection = this._selection(element);
        if (!selection.size) return false;
        for (let child of selection) {
            if (!child.deletable) return false;
        }
        return true;
    },
    addToFavorites(paletteContent) {
        let favorites = getExtension(Selection.instance.selection());
        let models = CopyPaste.instance.duplicateForCopy(favorites);
        let builder = new FavoriteItemBuilder(models);
        paletteContent.addCell(builder);
    },
    mayAddToFavorites() {
        return Selection.instance.selection().size>0;
    },
    addLayer(layer) {
        Layers.instance.addLayer(layer);
    },
    manageLayers(x, y, elements) {
        let menuOptions = new List();
        for (let layer of Layers.instance.layers) {
            menuOptions.add({line:new CheckMenuOption(
                layer.title, layer.checked,
                function(checked) {
                    layer.action(checked, elements);
                }
            )})
        }
        Canvas.instance.openMenu(x, y, menuOptions, false);
    },
    showInfos() {
        Canvas.instance.openModal(
            showInfos,
            {},
            data => {});
    }
};

export function normalModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/selection_on.svg", "./images/icons/selection_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.ELEMENT_DRAG;
            Canvas.instance._fire(StandardDragMode.events.SWITCH_MODE, StandardDragMode.ELEMENT_DRAG);
        }, () => StandardDragMode.mode === StandardDragMode.ELEMENT_DRAG)
    );
}

export function selectAreaModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/select_many_on.svg", "./images/icons/select_many_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.SELECT_AREA;
            Canvas.instance._fire(StandardDragMode.events.SWITCH_MODE, StandardDragMode.SELECT_AREA);
        }, () => StandardDragMode.mode === StandardDragMode.SELECT_AREA)
    );
}

export function scrollModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/pan_on.svg", "./images/icons/pan_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.SCROLL;
            Canvas.instance._fire(StandardDragMode.events.SWITCH_MODE, StandardDragMode.SCROLL);
        }, () => StandardDragMode.mode === StandardDragMode.SCROLL)
    );
}

export function zoomInCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-in_on.svg", "./images/icons/zoom-in_off.svg",
        () => {
            Facilities.zoomInSelect();
        }, () => !Facilities.isMaxZoom())
    );
}

export function zoomOutCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-out_on.svg", "./images/icons/zoom-out_off.svg",
        () => {
            Facilities.zoomOutSelect();
        }, () => !Facilities.isMinZoom())
    );
}

export function zoomExtentCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-extent_on.svg", "./images/icons/zoom-extent_off.svg",
        () => {
            Facilities.zoomExtent();
        }, () => !Facilities.isMinZoom())
    );
}

export function zoomSelectionCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-selection_on.svg", "./images/icons/zoom-selection_off.svg",
        () => {
            Facilities.zoomSelection();
        }, () => !Facilities.selectionEmpty())
    );
}

export function copyCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/copy_on.svg", "./images/icons/copy_off.svg",
        () => {
            Facilities.copy();
        }, () => !Facilities.selectionEmpty())
    );
}

export function pasteCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/paste_on.svg", "./images/icons/paste_off.svg",
        () => {
            Facilities.paste();
        }, () => Facilities.pastable())
    );
}

export function undoCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/undo_on.svg", "./images/icons/undo_off.svg",
        () => {
            Facilities.undo();
        }, () => Facilities.undoable())
    );
}

export function redoCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/redo_on.svg", "./images/icons/redo_off.svg",
        () => {
            Facilities.redo();
        }, () => Facilities.redoable())
    );
}

export function deleteCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/trash_on.svg", "./images/icons/trash_off.svg",
        () => {
            Facilities.delete();
        }, () => Facilities.deletable(), 66)
    );
}

export function regroupCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/group_on.svg", "./images/icons/group_off.svg",
        () => {
            Facilities.regroup();
        }, () => Facilities.groupable())
    );
}

export function ungroupCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/ungroup_on.svg", "./images/icons/ungroup_off.svg",
        () => {
            Facilities.ungroup();
        }, () => Facilities.ungroupable())
    );
}

export function lockCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/lock_on.svg", "./images/icons/lock_off.svg",
        () => {
            Facilities.lock();
        }, () => Facilities.lockable())
    );
}

export function unlockCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/unlock_on.svg", "./images/icons/unlock_off.svg",
        () => {
            Facilities.unlock();
        }, () => Facilities.unlockable())
    );
}

export function favoritesCommand(toolPopup, paletteContent) {
    toolPopup.add(new ToolToggleCommand("./images/icons/favorites_on.svg", "./images/icons/favorites_off.svg",
        () => {
            Facilities.addToFavorites(paletteContent);
        }, () => Facilities.mayAddToFavorites())
    );
}

export function layersCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/layers_on.svg", "./images/icons/layers_off.svg",
        function() {
            let x = this._root.globalMatrix.x(0, 0);
            let y = this._root.globalMatrix.y(0, 0);
            Facilities.manageLayers(x, y, [Context.table, Context.palettePopup]);
        }, always)
    );
}

export function showInfosCommand(toolPopup) {
    toolPopup.add(new ToolCommand("./images/icons/info_on.svg",
        function() {
            Facilities.showInfos();
        })
    );
}

export function createDeleteMenuOption() {
    return new TextMenuOption("Delete",
        function () {
            Facilities.delete(this);
        },
        function () {
            return Facilities.deletable(this);
        }
    );
}

export function addDeleteFacility(superClass) {

    makeDeletable(superClass);

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function () {
        this._addMenuOption(createDeleteMenuOption());
        createContextMenu && createContextMenu.call(this);
    };

    return superClass;
}

export function createHighlightMenuOption() {
    return new ColorChooserMenuOption("highlight",
        ["#000000", "#FF0000", "#00FF00", "#0000FF",
            "#00FFFF", "#FF00FF", "#FFFF00", "#FFFFFF"],
        function (highlight) {
            Facilities.highlight(this, highlight);
        }
    );
}

export function addHighlightFacility(superClass) {

    makeHighlightable(superClass);

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function () {
        this._addMenuOption(createHighlightMenuOption());
        createContextMenu && createContextMenu.call(this);
    };

    return superClass;
}

export function createGroupMenuOption() {
    return new TextToggleMenuOption("Group", "Ungroup",
        function () {
            Facilities.regroup(this);
        },
        function () {
            Facilities.ungroup(this);
        },
        function () {
            return Facilities.ungroupable(this);
        },
        function () {
            return Facilities.groupable(this) || Facilities.ungroupable(this);
        }
    );
}

export function addGroupFacility(superClass) {

    makeGroupable(superClass);

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function () {
        this._addMenuOption(createGroupMenuOption());
        createContextMenu && createContextMenu.call(this);
    };

    return superClass;
}

export function createLockMenuOption() {
    return new TextToggleMenuOption("Lock", "Unlock",
        function () {
            Facilities.lock(this);
        },
        function () {
            Facilities.unlock(this);
        },
        function () {
            return Facilities.unlockable(this);
        },
        function () {
            return Facilities.lockable(this) || Facilities.unlockable(this);
        }
    );
}

export function addLockFacility(superClass) {

    makeLockable(superClass);

    let createContextMenu = superClass.prototype._createContextMenu;
    superClass.prototype._createContextMenu = function () {
        this._addMenuOption(createLockMenuOption());
        createContextMenu && createContextMenu.call(this);
    };

}
