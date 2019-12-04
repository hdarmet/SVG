'use strict';

import {
    List, ESet
} from "./collections.js";
import {
    Matrix
} from "./geometry.js";
import {
    Visibility, computePosition, RasterImage, SvgRasterImage, Group, ClipPath, Rect, Text,
    Colors, MouseEvents, TextAnchor, win, Cursor, KeyboardEvents
} from "./graphics.js";
import {
    always
} from "./misc.js";
import {
    Context, Events, l2lBoundingBox, l2pBoundingBox, DragOperation, Memento, Canvas, makeObservable, makeNotCloneable,
    getExtension, Layers, makeSingleton, CopyPaste, Selection, Anchor, StandardDragMode
} from "./toolkit.js";
import {
    BoardElement
} from "./base-element.js";
import {
    makeContainer, makeDraggable
} from "./core-mixins.js";

export class Menu {

    constructor(x, y, menuOptions, closeOnSelect = true) {
        this._root = new Group();
        this._x = x;
        this._y = y;
        this._menuOptions = menuOptions;
        this._buildContent();
        this.closeOnSelect = closeOnSelect;
        Canvas.instance.putArtifactOnToolsLayer(this._root);
    }

    _buildContent() {
        let rect = new Rect(0, 0, 10, 10).attrs({
            stroke: Colors.BLACK,
            fill: Colors.WHITE,
            filter: Canvas.instance.shadowFilter
        });
        this._root.add(rect);
        let menuGeometry = {
            width: 10,
            height: Menu.YMARGIN
        };
        for (let option of this._menuOptions) {
            if (!Context.isReadOnly()) {
                option.line.prepare(option.that, menuGeometry);
                this._root.add(option.line._root);
            }
        }
        rect.attrs({
            width: menuGeometry.width + Menu.XMARGIN * 2,
            height: menuGeometry.height
        });
        for (let option of this._menuOptions) {
            option.line.width = menuGeometry.width + Menu.XMARGIN * 2 - 2;
        }
        let x = this._x;
        let y = this._y;
        if (x + menuGeometry.width + Menu.XMARGIN > Canvas.instance.clientWidth) {
            x = Canvas.instance.clientWidth - menuGeometry.width - Menu.XMARGIN;
        }
        if (y + menuGeometry.height + Menu.YMARGIN > Canvas.instance.clientHeight) {
            y = Canvas.instance.clientHeight - menuGeometry.height - Menu.YMARGIN;
        }
        this._root.matrix = new Matrix().translate(x, y);
    }

    close() {
        this._root.detach();
    }

    insideMenu(x, y) {
        let gbox = this._root.gbox;
        return x >= gbox.x && x <= gbox.x + gbox.width && y >= gbox.y && y <= gbox.y + gbox.height;
    }

    refresh() {
        this._root.clear();
        this._buildContent();
    }
}
Menu.XMARGIN = 5;
Menu.YMARGIN = 5;

Canvas.prototype.manageMenus = function() {
    win.addEventListener(MouseEvents.MOUSE_DOWN, event => {
        if (!this._menu || !this._menu.insideMenu(
                Canvas.instance.canvasX(event.pageX),
                Canvas.instance.canvasY(event.pageY))
        ) {
            this._closeMenu();
        }
    });
    win.addEventListener(MouseEvents.MOUSE_UP, event => {
        if (this._menu && (this._menu.closeOnSelect || !this._menu.insideMenu(
                Canvas.instance.canvasX(event.pageX),
                Canvas.instance.canvasY(event.pageY)))
        ) {
            this._closeMenu();
        } else {
            this._refreshMenu();
        }
    });
    win.addEventListener(MouseEvents.WHEEL, event => {
        this._closeMenu();
    });

    Canvas.prototype.openMenu = function(x, y, menuOptions, closeOnSelect = true) {
        this._closeMenu();
        let {x:mx, y:my} = this._toolsLayer.global2local(x, y);
        this._menu = new Menu(mx, my, menuOptions, closeOnSelect);
        this.putArtifactOnToolsLayer(this._menu._root);
    };

    //FIXME May I use one day ?
    Canvas.prototype.askForClosingMenu = function() {
        let menu = this._menu;
        setTimeout(() => {
            if (menu) {
                menu.close();
                if (this._menu === menu) delete this._menu;
            }
        }, 200);
    };

    Canvas.prototype._refreshMenu = function(x, y) {
        if (this._menu) {
            return this._menu.refresh();
        }
        return false;
    };

    Canvas.prototype._closeMenu = function() {
        if (this._menu) {
            this._menu.close();
            delete this._menu;
        }
    }
};

export function makeMenuOwner(superClass) {

    superClass.prototype.addMenuOption = function(menuOption, readOnly = true) {
        Memento.register(this);
        this._addMenuOption(menuOption, readOnly);
    };

    superClass.prototype._triggerContextMenu = function() {
        this._root.on(MouseEvents.CONTEXT_MENU,
            event => {
                this.openMenu(
                    Canvas.instance.canvasX(event.pageX),
                    Canvas.instance.canvasY(event.pageY));
                event.preventDefault();
                event.stopPropagation();
                return false;
            },
            true
        );
    };

    superClass.prototype._addMenuOption = function(menuOption, readOnly = true) {
        menuOption.readOnly = readOnly;
        if (!this._menuOptions) {
            this._menuOptions = new List();
            this._triggerContextMenu();
        }
        this._menuOptions.add(menuOption);
    };

    superClass.prototype._getOwnMenuOptions = function() {
        return this._menuOptions.map(option=>{return {line:option, that:this}});
    };

    if (!superClass.prototype.hasOwnProperty("menuOptions")) {
        Object.defineProperty(superClass.prototype, "menuOptions", {
            get: function () {
                return this._getOwnMenuOptions();
            }
        });
    }

    superClass.prototype.openMenu = function(x, y) {
        let menuOptions = this.menuOptions;
        if (menuOptions && menuOptions.length > 0) {
            Canvas.instance.openMenu(x, y, menuOptions);
        }
    };

    let superMemento = superClass.prototype._memento;
    if (superMemento) {
        superClass.prototype._memento = function () {
            let memento = superMemento.call(this);
            if (this._menuOptions) {
                memento._menuOptions = new List(...this._menuOptions);
            }
            return memento;
        };

        let superRevert = superClass.prototype._revert;
        superClass.prototype._revert = function (memento) {
            superRevert.call(this, memento);
            if (memento._menuOptions) {
                this._menuOptions = new List(...memento._menuOptions);
            }
            else {
                delete this._menuOptions;
            }
            return this;
        };
    }

    let superCloned = superClass.prototype._cloned;
    superClass.prototype._cloned = function(copy, duplicata) {
        superCloned && superCloned.call(this, copy, duplicata);
        copy._triggerContextMenu();
    }
}

export class MenuOption {
    constructor(label, action, active = () => true) {
        this._label = label;
        this._action = action;
        this._active = active;
    }

    get label() {
        return this._label;
    }

    get action() {
        return this._action;
    }

    get active() {
        return this._active.call(this._that);
    }

    get width() {
        return this._background.width;
    }

    set width(width) {
        this._background.width = width;
    }

    prepare(that, menuGeometry) {
        this._that = that;
        this._root = new Group();
        this._background = new Rect(1, menuGeometry.height - Menu.YMARGIN / 2, 10, 10);
        this._root.add(this._background);
        this._root.class = MenuOption.CLASS;
        let text = new Text(Menu.XMARGIN - 1, menuGeometry.height - Menu.YMARGIN, this.label);
        if (this.active) {
            text.attrs({ fill: Colors.BLACK });
        } else {
            text.attrs({ fill: Colors.LIGHT_GREY });
        }
        text.class = MenuOption.TEXT_CLASS;
        this._root.add(text);
        let bbox = Canvas.instance.bbox(text);
        text.y += bbox.height;
        if (bbox.width > menuGeometry.width) {
            menuGeometry.width = bbox.width;
        }
        this._background.attrs({ height: bbox.height });
        menuGeometry.height += bbox.height;
    }
}
makeNotCloneable(MenuOption);
MenuOption.CLASS = "menuOption";
MenuOption.TEXT_CLASS = "menuOptionText";

export class TextMenuOption extends MenuOption {
    constructor(label, action, active=function() {return true;}) {
        super(label, action, active);
    }

    _triggerMouseUp() {
        this._root.on(MouseEvents.MOUSE_UP, () => {
            if (this.active) {
                this.action.call(this._that);
            }
        });
    }

    prepare(that, menuGeometry) {
        super.prepare(that, menuGeometry);
        this._triggerMouseUp();
    }
}

export class TextToggleMenuOption extends TextMenuOption {
    constructor(label, altLabel, action, altAction, predicate, active=function() {return true;}) {
        super(label, action, active);
        this._predicate = predicate;
        this._altLabel = altLabel;
        this._altAction = altAction;
    }

    get label() {
        return this._predicate.call(this._that) ? this._altLabel : super.label;
    }

    get action() {
        return this._predicate.call(this._that) ? this._altAction : super.action;
    }
}

export class CheckMenuOption extends TextMenuOption {

    constructor(label, checked, action, active) {
        super(label, action, active);
        this.flag = checked;
    }

    get label() {
        return this.flag ? CheckMenuOption.CHECKED+super.label : CheckMenuOption.UNCHECKED+super.label;
    }

    _triggerMouseUp() {
        this._root.on(MouseEvents.MOUSE_UP, () => {
            if (this.active) {
                this.flag = ! this.flag;
                this.action.call(this._that, this.flag);
            }
        });
    }

}
CheckMenuOption.UNCHECKED = "\u2610 ";
CheckMenuOption.CHECKED = "\ud83d\uddf9 ";

export class ColorChooserMenuOption extends MenuOption {

    constructor(label, colors, action, active) {
        super(label, action, active);
        this._colors = colors;
    }

    prepare(that, menuGeometry) {
        super.prepare(that, menuGeometry);
        let colorRowCount = Math.ceil(
            this._colors.length / ColorChooserMenuOption.COLOR_ROW_LENGTH
        );
        let colorWidth =
            ColorChooserMenuOption.COLOR_ROW_LENGTH *
            (ColorChooserMenuOption.COLOR_WIDTH + ColorChooserMenuOption.COLOR_MARGIN) -
            ColorChooserMenuOption.COLOR_MARGIN;
        if (menuGeometry.width < colorWidth) {
            menuGeometry.width = colorWidth;
        }
        let x = ColorChooserMenuOption.COLOR_MARGIN;
        let y = menuGeometry.height;
        for (let index = 0; index < this._colors.length; index++) {
            let color = this._colors[index];
            let colorRect = new Rect(x, y, ColorChooserMenuOption.COLOR_WIDTH, ColorChooserMenuOption.COLOR_HEIGHT)
                .attrs({fill: color, stroke: Colors.BLACK});
            this._root.add(colorRect);
            x += ColorChooserMenuOption.COLOR_WIDTH + ColorChooserMenuOption.COLOR_MARGIN;
            if ((index + 1) % ColorChooserMenuOption.COLOR_ROW_LENGTH === 0) {
                x = ColorChooserMenuOption.COLOR_MARGIN;
                y += ColorChooserMenuOption.COLOR_HEIGHT + ColorChooserMenuOption.COLOR_MARGIN;
            }
            colorRect.on(MouseEvents.MOUSE_UP, () => {
                this._action.call(that, color);
            });
        }
        let height =
            (ColorChooserMenuOption.COLOR_HEIGHT + ColorChooserMenuOption.COLOR_MARGIN) * colorRowCount +
            ColorChooserMenuOption.COLOR_MARGIN;
        this._background.attrs({height: this._background.height+height});
        menuGeometry.height += height;
    }
}
ColorChooserMenuOption.COLOR_ROW_LENGTH = 4;
ColorChooserMenuOption.COLOR_WIDTH = 25;
ColorChooserMenuOption.COLOR_HEIGHT = 10;
ColorChooserMenuOption.COLOR_MARGIN = 5;

let tId = 0;
function toolId() {
    return "TID"+tId++;
}

export class ToolTitleCommand {

    constructor(imageURL, x, action) {
        this._root = new RasterImage(imageURL,
            -ToolTitleCommand.SIZE/2, -ToolTitleCommand.SIZE/2, ToolTitleCommand.SIZE, ToolTitleCommand.SIZE );
        this._root._owner = this;
        this._root.matrix = Matrix.translate(x, 0);
        this._root.on(MouseEvents.CLICK, action);
    }

}
ToolTitleCommand.SIZE = 12;

let _refreshPoll = null;
let refreshTools = function(action) {
    let refreshPoll = _refreshPoll;
    if (refreshPoll) {
        _refreshPoll = function () {
            refreshPoll();
            action();
        }
    } else {
        _refreshPoll = action;
        win.setInterval(function(){_refreshPoll();}, 250);
    }
};

export class ToolPopup {

    constructor(width, height) {
        this._height = height;
        this._root = new Group();
        this._background = new Rect(-width / 2, -height / 2, width, height)
            .attrs({
                stroke: Colors.BLACK,
                fill: Colors.LIGHT_GREY,
                rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE, filter: Canvas.instance.shadowFilter
            });
        this._root.add(this._background);
        this._root._owner = this;
        this._contentSupport = new Group();
        this._root.add(this._contentSupport);
        this._content = new Group();
        this._contentSupport.add(this._content);
        this._maxClip = new ClipPath(toolId()).add(
            new Rect(-width / 2, -ToolPopup.HEADER_HEIGHT / 2, width, ToolPopup.HEADER_HEIGHT+5)
            .attrs({ rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE }));
        this._minClip = new ClipPath(toolId()).add(
            new Rect(-width / 2, -ToolPopup.HEADER_HEIGHT / 2, width, ToolPopup.HEADER_HEIGHT)
            .attrs({ rx: ToolPopup.CORNER_SIZE, ry: ToolPopup.CORNER_SIZE }));
        this._title = new Group(Matrix.translate(0, -height / 2 + ToolPopup.HEADER_HEIGHT / 2));
        this._titleBackground = new Rect(-width / 2, -ToolPopup.HEADER_HEIGHT / 2, width, ToolPopup.HEADER_HEIGHT)
            .attrs({fill: Colors.BLACK, clip_path: this._maxClip});
        this._title.add(this._titleBackground);
        this._root.add(this._minClip).add(this._maxClip).add(this._title);
        this._minimized = false;
        this._minimize = new ToolTitleCommand(ToolPopup.MINIMIZE_URL, this.width/2-ToolPopup.HEADER_MARGIN,
            () => this.minimize()
        );
        this._title.add(this._minimize._root);
        this._restore = new ToolTitleCommand(ToolPopup.RESTORE_URL, this.width/2-ToolPopup.HEADER_MARGIN,
            () => this.restore()
        );
        this._dragOperation(function() {return DragPopupOperation.instance;});
        Canvas.instance.addObserver(this);
        Canvas.instance.putArtifactOnToolsLayer(this._root);
    }

    get minimized() {
        return this._minimized;
    }

    get width() {
        return this._background.width;
    }

    get height() {
        return this.minimized ? ToolPopup.HEADER_HEIGHT : this._height;
    }

    _setHeight(height) {
        this._height = height;
        this._background.height = height;
        this._background.y = -height/2;
        this._title.matrix = Matrix.translate(0, -height/2+ToolPopup.HEADER_HEIGHT/2);
    }

    set height(height) {
        this._setHeight(height);
        this._adjustPosition();
    }

    minimize() {
        this._minimized = true;
        this._title.add(this._restore._root);
        this._minimize._root.detach();
        this._titleBackground.attrs({ clip_path: this._minClip });
        this._background.attrs({
            x: -this.width / 2, y: -ToolPopup.HEADER_HEIGHT / 2,
            width: this.width, height: ToolPopup.HEADER_HEIGHT});
        this._content.detach();
        let dY = this._height / 2 - ToolPopup.HEADER_HEIGHT / 2;
        this._title.matrix = new Matrix();
        this._root.matrix = Matrix.translate(this._root.matrix.dx, this._root.matrix.dy - dY);
    }

    restore() {
        this._minimized = false;
        this._title.add(this._minimize._root);
        this._restore._root.detach();
        this._titleBackground.attrs({ clip_path: this._maxClip });
        this._background.attrs({
            x: -this.width / 2, y: -this.height / 2,
            width: this.width, height: this.height});
        this._contentSupport.add(this._content);
        let dY = this._background.height / 2 - ToolPopup.HEADER_HEIGHT / 2;
        this._title.matrix = Matrix.translate(0, -dY);
        this._root.matrix = Matrix.translate(this._root.matrix.dx, this._root.matrix.dy + dY);
        this._adjustPosition();
    }

    _adjustPosition() {
        let clientWidth = Canvas.instance.clientWidth;
        let clientHeight = Canvas.instance.clientHeight;
        let x = this._root.globalMatrix.dx-clientWidth/2;
        let y = this._root.globalMatrix.dy-clientHeight/2;
        if (x + this.width/2 > clientWidth/2 - ToolPopup.BORDER_MARGIN) {
            x = clientWidth/2 - ToolPopup.BORDER_MARGIN - this.width/2;
        }
        if (x - this.width/2 < -clientWidth/2 + ToolPopup.BORDER_MARGIN ) {
            x = this.width/2  -clientWidth/2  + ToolPopup.BORDER_MARGIN;
        }
        if (y + this.height/2 > clientHeight/2 - ToolPopup.BORDER_MARGIN) {
            y = clientHeight/2 - ToolPopup.BORDER_MARGIN - this.height / 2;
        }
        if (y - this.height/2 < -clientHeight/2 + ToolPopup.BORDER_MARGIN) {
            y = this.height/2 -clientHeight/2 + ToolPopup.BORDER_MARGIN;
        }
        let imatrix = this._root.parent.matrix.invert();
        let fx = imatrix.x(x, y);
        let fy = imatrix.y(x, y);
        this._root.matrix = Matrix.translate(fx, fy);
    }

    add(something) {
        this._content.add(something._root);
        return this;
    }

    move(x, y) {
        this._root.matrix = Matrix.translate(x, y);
        return this;
    }

    _notified(source, type, value) {
        if (source === Canvas.instance && type === Events.GEOMETRY) {
            this._adjustPosition();
        }
    }

    display(x, y) {
        let clientWidth = Canvas.instance.clientWidth;
        let clientHeight = Canvas.instance.clientHeight;
        let fx = x>=0 ? -clientWidth/2+x : clientWidth/2-x;
        let fy = y>=0 ? -clientHeight/2+y : clientHeight/2-y;
        this._root.matrix = Matrix.translate(fx, fy);
        this._adjustPosition();
        return this;
    }
}
makeDraggable(ToolPopup);
// Distance between edge of viewport and popup's edge.
ToolPopup.BORDER_MARGIN = 5;
// Size of rounded corners
ToolPopup.CORNER_SIZE = 5;
// Height of the title bar
ToolPopup.HEADER_HEIGHT = 15;
// Distance between the right edge of the popup and the minimize/restore icon
ToolPopup.HEADER_MARGIN = 10;
ToolPopup.MINIMIZE_URL = "./images/icons/minimize.png";
ToolPopup.RESTORE_URL = "./images/icons/restore.png";

export class DragPopupOperation extends DragOperation {

    constructor() {
        super();
    }

    doDragStart(popup, x, y, event) {
        let dmatrix = Matrix.translate(popup._root.matrix.dx, popup._root.matrix.dy);
        let pedestal = new Group(dmatrix);
        Canvas.instance.putArtifactOnToolsLayer(pedestal);
        let imatrix = pedestal.globalMatrix.invert();
        pedestal.dragX = imatrix.x(x, y);
        pedestal.dragY = imatrix.y(x, y);
        pedestal.add(popup._root);
    }

    doDragMove(popup, x, y, event) {
        let pedestal = popup._root.parent;
        let imatrix = pedestal.globalMatrix.invert();
        let pX = imatrix.x(x, y) - pedestal.dragX;
        let pY = imatrix.y(x, y) - pedestal.dragY;
        popup._root.matrix = Matrix.translate(pX, pY);
        popup._adjustPosition();
    }

    doDrop(popup, x, y, event) {
        let pedestal = popup._root.parent;
        let { x:fx, y:fy } = computePosition(popup._root, Canvas.instance._toolsLayer._root);
        popup._root.matrix = Matrix.translate(fx, fy);
        Canvas.instance.putArtifactOnToolsLayer(popup._root);
        pedestal.detach();
    }

}
makeSingleton(DragPopupOperation);

export class ToolCommand {

    constructor(imageURL, action, size = 32) {
        this._root = new Group();
        this._root.on(MouseEvents.CLICK, ()=>{
            action.call(this)
        });
        this._root.on(MouseEvents.MOUSE_DOWN, ()=>{this._iconSupport.matrix=Matrix.scale(0.95, 0.95, 0, 0)});
        this._root.on(MouseEvents.MOUSE_UP, ()=>{this._iconSupport.matrix=Matrix.scale(1, 1, 0, 0)});
        this._iconSupport = new Group();
        this._icon = new SvgRasterImage(imageURL, -size/2, -size/2, size, size);
        this._root.add(this._iconSupport.add(this._icon));
        this._root._owner = this;
        this._size = size;
    }

    move(x, y) {
        this._root.matrix = Matrix.translate(x, y);
        return this;
    }

    get width() {
        return this._size;
    }

    get height() {
        return this._size;
    }
}

export class ToolToggleCommand extends ToolCommand {

    constructor(imageURL, altImageURL, action, predicate=null, size = 32) {
        super(imageURL, action, size);
        this._altIcon = new RasterImage(altImageURL, -size/2, -size/2, size, size);
        this._iconSupport.add(this._altIcon);
        this._active = false;
        this._refresh();
        if (predicate) {
            refreshTools(()=>{
                let active = predicate.call(this);
                if (active != this.active) {
                    this.active = active;
                }
            })
        }
    }

    _refresh() {
        this._altIcon.visibility = this.active ? Visibility.VISIBLE : Visibility.HIDDEN;
        this._icon.visibility = !this.active ? Visibility.VISIBLE : Visibility.HIDDEN;
    }

    get active() {
        return this._active;
    }

    set active(flag) {
        this._active = flag;
        this._refresh();
    }

}

export class ToolCommandPopup extends ToolPopup {

    constructor(width, size) {
        super(width, ToolPopup.HEADER_HEIGHT);
        this._size = size;
        this._margin = (width/2 - size)/3;
        this._row = ToolPopup.HEADER_HEIGHT + this._margin*2;
        this._left = true;
        this._commands = new Group();
        this._content.add(this._commands);
    }

    _newLine() {
        if (!this._left) {
            this._left = true;
            this._row += this._size + this._margin * 2;
        }
    }

    add(command) {
        this._commands.add(command._root);
        if (command.width===this._size) {
            if (this._left) {
                command.move(-this._size / 2 - this._margin, this._row + this._size / 2);
                this._left = false;
                this.height = this._row + this._size + this._margin*2;
            } else {
                command.move(this._size / 2 + this._margin, this._row + this._size / 2);
                this._left = true;
                this._row += this._size + this._margin * 2;
            }
        }
        else {
            this._newLine();
            command.move(0, this._row + command.height/2);
            this._left = true;
            this._row += command.height + this._margin * 2;
            this.height = this._row;
        }
        return this;
    }

    _setHeight(height) {
        super._setHeight(height);
        this._commands.matrix = Matrix.translate(0, -height/2);
    }

    addMargin() {
        this._newLine();
        this._row += this._margin * 2;
        return this;
    }
}

export class ToolPanelContent {

    constructor(width, height) {
        this._root = new Group();
        this._root._owner = this;
        this._width = width;
        this._height = height;
    }

    _refresh() {
    }

    get width() {
        return this._width;
    }

    set width(width) {
        this._width = width;
    }

    get height() {
        return this._height;
    }

    set height(height) {
        this._height = height;
    }

}

export class ToolExpandablePanel {

    constructor(title, content) {
        this._title = title;
        this._content = content;
        this._root = new Group();
        this._root._owner = this;
        this._backgroundPedestal = new Group();
        this._root.add(this._backgroundPedestal);
        this._background = new Rect(0, 0, 1, 1).attrs({fill:Colors.WHITE});
        this._title = new Group();
        this._title.cursor = Cursor.DEFAULT;
        this._titleBackground = new Rect(
            0, -ToolExpandablePanel.PANEL_TITLE_HEIGHT / 2,
            10, ToolExpandablePanel.PANEL_TITLE_HEIGHT);
        this._root.add(this._title.add(this._titleBackground));
        this.title = title;
        this._opened = false;
    }

    set title(title) {
        this._titleLabel && this._titleLabel.detach();
        this._titleLabel = new Text(
            0, ToolExpandablePanel.PANEL_TITLE_TEXT_MARGIN / 2, title)
            .attrs({ fill: Colors.WHITE, font_size:ToolExpandablePanel.FONT_SIZE, text_anchor: TextAnchor.MIDDLE });
        this._title.add(this._titleLabel);
    }

    action(action) {
        this._title.on(MouseEvents.CLICK, () => {
            action(this);
        });
        return this;
    }

    open() {
        this._opened = true;
        this._root.add(this._content._root);
        this._backgroundPedestal.add(this._background);
    }

    close() {
        if (this._opened) {
            this._opened = false;
            this._backgroundPedestal.remove(this._background);
        }
    }

    get opened() {
        return this._opened;
    }

    _refresh() {
        if (this._opened) {
            this._title.matrix = Matrix.translate(0, -this.height / 2 + ToolExpandablePanel.PANEL_MIN_HEIGHT / 2);
            this._content._refresh();
            this._content._root.matrix = Matrix.translate(0, ToolExpandablePanel.PANEL_MIN_HEIGHT * 0.5)
        } else {
            this._title.matrix = new Matrix();
        }
    }

    get contentHeight() {
        return this._content.height;
    }

    set contentHeight(height) {
        this._content.height = height;
        this._background.height = this.height;
        this._background.y = -this.height/2;
    }

    get width() {
        return this._titleBackground.width;
    }

    set width(width) {
        this._titleBackground.attrs({ width: width, x: -width / 2 });
        this._background.width = width;
        this._background.x = -width/2;
    }

    get height() {
        return this.opened
            ? ToolExpandablePanel.PANEL_MIN_HEIGHT + this._content.height
            : ToolExpandablePanel.PANEL_MIN_HEIGHT;
    }

    accept(visitor) {
        visitor.visit(this._content);
        return this;
    }

}
ToolExpandablePanel.PANEL_TITLE_HEIGHT = 15;
ToolExpandablePanel.PANEL_MIN_HEIGHT = 16;
ToolExpandablePanel.PANEL_TITLE_MARGIN = ToolExpandablePanel.PANEL_MIN_HEIGHT-ToolExpandablePanel.PANEL_TITLE_HEIGHT;
ToolExpandablePanel.PANEL_TITLE_TEXT_MARGIN = 8;
ToolExpandablePanel.FONT_SIZE = 12;

export class ToolExpandablePanelSet {

    constructor(x, y, width, height) {
        this._root = new Group();
        this._root._owner = this;
        this._root.matrix = Matrix.translate(x, y);
        this._width = width;
        this._height = height;
        this._panels = new Group();
        this._root.add(this._panels);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    _refresh() {
        let contentHeight = this._height -
            this._panels.children.length * ToolExpandablePanel.PANEL_TITLE_HEIGHT;
        if (this.currentPanel) {
            this.currentPanel.contentHeight = contentHeight;
        }
        let height = -this._height / 2;
        for (let proot of this._panels.children) {
            proot._owner._refresh();
            proot.matrix = Matrix.translate(0, height + proot._owner.height / 2);
            height += proot._owner.height;
        }
        return this;
    }

    get currentPanel() {
        for (let proot of this._panels.children) {
            if (proot._owner.opened) {
                return proot._owner;
            }
        }
        return null;
    }

    add(panel) {
        panel.action(panel => {
            for (let proot of this._panels.children) {
                if (proot._owner === panel) {
                    proot._owner.open();
                } else {
                    proot._owner.close();
                }
            }
            this._refresh();
        });
        panel.width = this.width;
        this._panels.add(panel._root);
        if (this._panels.children.length === 1) {
            panel.open();
        }
        return this;
    }

    get panels() {
        let panels = new List();
        for (let proot of this._panels.children) {
            panels.add(proot._owner);
        }
        return panels;
    }

    accept(visitor) {
        for (let panel of this.panels) {
            visitor.visit(panel);
        }
        return this;
    }

}

export class ToolExpandablePopup extends ToolPopup {

    constructor(width, height,
                panelWidth=width,
                panelHeight=height-ToolPopup.HEADER_HEIGHT-ToolPopup.CORNER_SIZE-ToolExpandablePanel.PANEL_TITLE_MARGIN) {
        super(width, height);
        let y = (height-panelHeight)/2-ToolPopup.HEADER_HEIGHT/2+ToolExpandablePanel.PANEL_TITLE_MARGIN;
        this._panelSet = new ToolExpandablePanelSet(0, y, panelWidth, panelHeight);
        this.add(this._panelSet);
        this._refresh();
    }

    get currentPane() {
        return this._panelSet.currentPane();
    }

    addPanel(panel) {
        this._panelSet.add(panel);
        this._refresh();
        return this;
    }

    _refresh() {
        this._panelSet._refresh();
        return this;
    }

    accept(visitor) {
        visitor.visit(this._panelSet);
        return this;
    }

}

export class ToolCell {

    constructor() {
        this._root = new Group();
        this._root._owner = this;
    }

    activate(owner, width, height) {
        this._owner = owner;
        this._width = width;
        this._height = height;
    }

    get owner() {
        return this._owner;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get visible() {
        return true;
    }

    accept(visitor) {
        return this;
    }

}

export function all() {
    return true;
}

export class ToolGridPanelContent extends ToolPanelContent {

    constructor(width, cellWidth, cellHeight) {
        super(width, cellHeight);
        this._dirty = false;
        this._predicate = all;
        this._maxHeight = cellHeight;
        this._cellWidth = cellWidth;
        this._cellHeight = cellHeight;
        this._clipRect = new Rect(
            -this.width / 2 + 5,
            -this.height / 2 + 5,
            this.width - 10,
            this.height - 10
        );
        this._clipPath = new ClipPath(toolId()).add(this._clipRect);
        this._root.add(this._clipPath);
        this._content = new Group();
        this._root.add(this._content);
        this._background = new Rect(-width / 2, -this.height / 2, width, this.height)
            .attrs({ stroke: Colors.NONE, fill: Colors.WHITE });
        this._content.add(this._background);
        this._content.clip_path = this._clipPath;
        this._cells = new List();
        this._shownCells = new ESet();
        this._content.on(MouseEvents.WHEEL, event => {
            if (event.deltaY > 0) {
                this.scroll(-ToolGridPanelContent.SCROLL_WHEEL_STEP);
            } else {
                this.scroll(ToolGridPanelContent.SCROLL_WHEEL_STEP);
            }
            event.preventDefault();
            event.stopPropagation();
        });
        Layers.instance.addObserver(this);
    }

    _notified(source, event) {
        if (source === Layers.instance && event === Layers.events.ACTIVATE) {
            this._askForRefresh();
        }
    }

    _getCellsToShow() {
        let shownCells = new ESet();
        for (let cell of this._cells) {
            if (this._accept(cell)) {
                shownCells.add(cell);
            }
        }
        return shownCells;
    }

    get predicate() {
        return this._predicate;
    }

    set predicate(predicate) {
        this._predicate = predicate;
        this._askForRefresh();
    }

    scroll(step) {
        let y = this._content.matrix.dy + step;
        if (y + this._maxHeight < this.height) {
            y = this.height - this._maxHeight;
            this._fire(Events.SCROLL_END);
        }
        if (y >= 0) y = 0;
        this.move(0, y);
    }

    _accept(cell) {
        return cell.visible && this._predicate(cell);
    }

    _refresh() {
        this._dirty = false;
        this._clipRect.attrs({ y: -this.height / 2 + 5, height: this.height - 10 });
        this._background.y = -this.height / 2;
        if (this._cellsLayer) {
            this._cellsLayer.detach();
        }
        this._cellsLayer = new Group();
        this._content.add(this._cellsLayer);
        let startX = this._cellWidth / 2;
        let startY = this._cellHeight / 2;
        for (let cell of this._shownCells) {
            if (this._accept(cell)) {
                if (startX+this._cellWidth > this.width) {
                    startX = this._cellWidth / 2;
                    startY += this._cellHeight;
                }
                cell._root.matrix = Matrix.translate(startX - this.width / 2, startY - this.height / 2);
                startX += this._cellWidth;
                this._cellsLayer.add(cell._root);
            }
        }
        this._maxHeight = startY + this._cellHeight / 2 + ToolGridPanelContent.CELL_MARGIN;
        this._background.attrs({ height: this._maxHeight });
        let step = this._content.matrix.dy;
        this.move(0, 0);
        this.scroll(step);
    }

    move(x, y) {
        this._content.matrix = Matrix.translate(x, y);
        this._clipRect.matrix = Matrix.translate(0, -y);
    }

    addCell(cell) {
        this._cells.add(cell);
        cell.activate(this, this._cellWidth * 0.9, this._cellHeight * 0.8);
        this._askForRefresh();
        return this;
    }

    removeCell(cell) {
        this._cells.remove(cell);
        this._askForRefresh();
        return this;
    }

    _askForRefresh() {
        let shownCells = this._getCellsToShow();
        if (!shownCells.same(this._shownCells)) {
            this._shownCells = shownCells;
            if (!this._dirty) {
                win.setTimeout(() => this._refresh(), 0);
            }
            this._dirty = true;
        }
    }

    accept(visitor) {
        for (let cell of this._cells) {
            visitor.visit(cell);
        }
        return this;
    }

}
makeObservable(ToolGridPanelContent);
ToolGridPanelContent.SCROLL_WHEEL_STEP = 50;
ToolGridPanelContent.CELL_MARGIN = 20;

export class ToolGridExpandablePanel extends ToolExpandablePanel {

    constructor(title, content, predicate = all) {
        super(title, content);
        this._predicate = predicate;
    }

    open() {
        super.open();
        this._content.predicate = this._predicate;
    }

}

export class BoardItemBuilder extends ToolCell {

    constructor(proto) {
        super();
        this._proto = proto;
        this._support = new Group();
        this._root.add(this._support);
    }

    get gx() {
        return this._root.globalMatrix.dx;
    }

    get gy() {
        return this._root.globalMatrix.dy;
    }

    _addMenuOption(menuOption) {
        if (!this._menuOptions) {
            this._menuOptions = new List();
        }
        this._menuOptions.add(menuOption);
        return this;
    }

    activate(owner, width, height) {
        super.activate(owner, width, height);
        this._makeItems();
        this._glass = new Rect(
            -width/2-BoardItemBuilder.MARGIN, -height/2-BoardItemBuilder.MARGIN,
            width+BoardItemBuilder.MARGIN*2, height+BoardItemBuilder.MARGIN*2).attrs({
           fill:Colors.WHITE, stroke:Colors.NONE, opacity:0.01
        });
        this._root.add(this._glass);
        this._glass.on(MouseEvents.MOUSE_DOWN, event=>{
            event.stopPropagation();
            this.select();
            let anchor = [...this._currentItems][0];
            let eventSpecs = {bubbles:true, clientX:event.clientX, clientY:event.clientY};
            let dragEvent = new MouseEvent(MouseEvents.MOUSE_DOWN, eventSpecs);
            anchor._root._node.dispatchEvent(dragEvent);
            this._makeItems();
        });
        this._glass.on(MouseEvents.CONTEXT_MENU, event=>{
            event.preventDefault();
            if (this._menuOptions) {
                Canvas.instance.openMenu(this.gx, this.gy, this._menuOptions);
            }
        });
        return this;
    }

    select() {
        Selection.instance.unselectAll();
        for (let element of this._currentItems) {
            Selection.instance.select(element);
        }
    }

    _makeItems() {
        //let mementoOpened = Memento.instance.opened;
        this._currentItems = CopyPaste.instance.duplicateForPaste(this._proto);
        for (let item of this._currentItems) {
            item._parent = this;
            this._support.add(item._root);
        }
        this._adjustSize();
        return this._currentItems;
    }

    add(element) {}

    detachChild(element) {
        this._support.remove(element._root);
        element._parent = null;
    }

    _adjustSize() {
        let bbox = l2pBoundingBox(this._currentItems);
        let sizeWidthFactor = this.width / bbox.width;
        let sizeHeightFactor = this.height / bbox.height;
        let sizeFactor = Math.min(sizeWidthFactor, sizeHeightFactor, 10);
        this._support.matrix = Matrix.scale(sizeFactor, sizeFactor, 0, 0).translate(-bbox.cx, -bbox.cy)
    }

    applyOr(predicate) {
        for (let element of this._proto) {
            if (predicate(element)) return true;
        }
        return false;
    }

    applyAnd(predicate) {
        for (let element of this._proto) {
            if (!predicate(element)) return false;
        }
        return true;
    }

    accept(visitor) {
        for (let item of this._proto) {
            visitor.visit(item);
        }
        for (let item of this._currentItems) {
            visitor.visit(item);
        }
        return this;
    }

    get visible() {
        for (let element of this._currentItems) {
            if (element.visible) {
                return true;
            }
        }
        return false;
    }

    _unexecuteDrop(element) {
        element._root.detach();
        element._parent = null;
    }
}
BoardItemBuilder.MARGIN = 4;

export class FavoriteItemBuilder extends BoardItemBuilder {

    constructor(proto) {
        super(proto);
        this._addMenuOption({that:this, line:new TextMenuOption("Remove", ()=>{this.owner.removeCell(this);})});
    }

}

export const Tools = {
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
    deleteSelection() {
        Memento.instance.open();
        for (let child of [...Selection.instance.selection()]) {
            if (child.deletable) {
                child.delete();
            }
        }
    },
    allowElementDeletion() {
        Anchor.instance.addEventListener(KeyboardEvents.KEY_UP, event => {
                if (!Context.freezed) {
                    if (event.key === "Delete" || event.key === "Backspace")
                        Tools.deleteSelection();
                }
            }
        );
    },
    selectionDeletable() {
        let selection = [...Selection.instance.selection()];
        if (!selection.length) return false;
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
        }, () => StandardDragMode.mode === StandardDragMode.ELEMENT_DRAG)
    );
}

export function selectAreaModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/select_many_on.svg", "./images/icons/select_many_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.SELECT_AREA;
        }, () => StandardDragMode.mode === StandardDragMode.SELECT_AREA)
    );
}

export function scrollModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/pan_on.svg", "./images/icons/pan_off.svg",
        () => {
            StandardDragMode.mode = StandardDragMode.SCROLL;
        }, () => StandardDragMode.mode === StandardDragMode.SCROLL)
    );
}

export function pdfModeCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/pdf_on.svg", "./images/icons/pdf_off.svg",
        () => {
            Tools.zoomInSelect();
        }, () => !Tools.isMaxZoom())
    );
}

export function zoomInCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-in_on.svg", "./images/icons/zoom-in_off.svg",
        () => {
            Tools.zoomInSelect();
        }, () => !Tools.isMaxZoom())
    );
}

export function zoomOutCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-out_on.svg", "./images/icons/zoom-out_off.svg",
        () => {
            Tools.zoomOutSelect();
        }, () => !Tools.isMinZoom())
    );
}

export function zoomExtentCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-extent_on.svg", "./images/icons/zoom-extent_off.svg",
        () => {
            Tools.zoomExtent();
        }, () => !Tools.isMinZoom())
    );
}

export function zoomSelectionCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/zoom-selection_on.svg", "./images/icons/zoom-selection_off.svg",
        () => {
            Tools.zoomSelection();
        }, () => !Tools.selectionEmpty())
    );
}

export function copyCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/copy_on.svg", "./images/icons/copy_off.svg",
        () => {
            Tools.copy();
        }, () => !Tools.selectionEmpty())
    );
}

export function pasteCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/paste_on.svg", "./images/icons/paste_off.svg",
        () => {
            Tools.paste();
        }, () => Tools.pastable())
    );
}

export function undoCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/undo_on.svg", "./images/icons/undo_off.svg",
        () => {
            Tools.undo();
        }, () => Tools.undoable())
    );
}

export function redoCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/redo_on.svg", "./images/icons/redo_off.svg",
        () => {
            Tools.redo();
        }, () => Tools.redoable())
    );
}

export function deleteCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/trash_on.svg", "./images/icons/trash_off.svg",
        () => {
            Tools.deleteSelection();
        }, () => Tools.selectionDeletable(), 66)
    );
}

export function regroupCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/group_on.svg", "./images/icons/group_off.svg",
        () => {
            Tools.regroup();
        }, () => Tools.groupable())
    );
}

export function ungroupCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/ungroup_on.svg", "./images/icons/ungroup_off.svg",
        () => {
            Tools.ungroup();
        }, () => Tools.ungroupable())
    );
}

export function lockCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/lock_on.svg", "./images/icons/lock_off.svg",
        () => {
            Tools.lock();
        }, () => Tools.lockable())
    );
}

export function unlockCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/unlock_on.svg", "./images/icons/unlock_off.svg",
        () => {
            Tools.unlock();
        }, () => Tools.unlockable())
    );
}

export function favoritesCommand(toolPopup, paletteContent) {
    toolPopup.add(new ToolToggleCommand("./images/icons/favorites_on.svg", "./images/icons/favorites_off.svg",
        () => {
            Tools.addToFavorites(paletteContent);
        }, () => Tools.mayAddToFavorites())
    );
}

export function layersCommand(toolPopup) {
    toolPopup.add(new ToolToggleCommand("./images/icons/layers_on.svg", "./images/icons/layers_off.svg",
        function() {
            let x = this._root.globalMatrix.x(0, 0);
            let y = this._root.globalMatrix.y(0, 0);
            Tools.manageLayers(x, y, [Context.table, Context.palettePopup]);
        }, always)
    );
}

export function showInfosCommand(toolPopup) {
    toolPopup.add(new ToolCommand("./images/icons/info_on.svg",
        function() {
            Tools.showInfos();
        })
    );
}