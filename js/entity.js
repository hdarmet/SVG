import {
    SigmaElement
} from "./base-element.js";
import {
    makeContainer,
    makePart, makePartsOwner
} from "./container-mixins.js";
import {
    makeClickable, makeElevable, makeShaped
} from "./core-mixins.js";
import {
    Group, Rect,Rotation, Translation, Colors, Stroke, Line, defer
} from "./graphics.js";
import {
    assert, defined,
    defineGetProperty, defineMethod, defineProperty, extendMethod, replaceMethod
} from "./misc.js";
import {
    makeObservable, Memento, Canvas, Selection, CloneableObject, CopyPaste
} from "./toolkit.js";
import {
    PlainArrow, Bubble
} from "./svgtools.js";
import {
    Matrix2D, Matrix3D, Point2D, Point3D, Box3D
} from "./geometry.js";
import {
    List, EMap, ESet
} from "./collections.js";

export class SigmaTrigger extends SigmaElement {

    constructor(width, height, shaper, action) {
        super(width, height);
        let shape = shaper.call(this);
        this._initShape(shape);
        this._animageShape(shape);
        this._setElevation(SigmaExpansionBubble.ELEVATION);
        this._clickHandler(action);
    }

    _animageShape(shape) {
        shape.onDrag(
            ()=>{shape.matrix = Matrix2D.scale(0.8, 0.8, 0, 0)},
            ()=>{},
            ()=>{shape.matrix = Matrix2D.scale(1, 1, 0, 0)}
        );
    }

    _cloned(copy, duplicata) {
        super._cloned(copy, duplicata);
        this._animageShape(copy.shape);
    }

}
SigmaTrigger.STD_WIDTH = 12;
SigmaTrigger.STD_HEIGHT = 12;
makeShaped(SigmaTrigger);
makePart(SigmaTrigger);
makeClickable(SigmaTrigger);
makeElevable(SigmaTrigger);

export class SigmaExpansionBubble extends SigmaElement {

    constructor(width, height, spikeHeight) {
        function closerShape() {
            let closer = new Group().attrs({stroke:Colors.BLACK, stroke_width:2, stroke_linecap:Stroke.lineCap.ROUND});
            closer.add(new Rect(-this.width/2, -this.height/2, this.width, this.height).attrs({opacity:0.001}));
            closer.add(new Line(-this.width/2, -this.height/2, this.width/2, this.height/2));
            closer.add(new Line(-this.width/2, this.height/2, this.width/2, -this.height/2));
            return closer;
        }

        super(width, height);
        this._spikeHeight = spikeHeight;
        this._initShape(this._buildExpansionShape());
        this._setElevation(SigmaExpansionBubble.ELEVATION);
        this._closer = new SigmaTrigger(SigmaTrigger.STD_WIDTH/2, SigmaTrigger.STD_HEIGHT/2, closerShape,
            function() {
                return ()=>this.parent.hide();
            });
        this._closer.matrix = Matrix2D.translate(this.width/2-SigmaTrigger.STD_WIDTH/2, -this.height/2+SigmaTrigger.STD_WIDTH/2);
        this._addPart(this._closer);
    }

    _buildExpansionShape() {
        return new Bubble(-this.width/2, -this.height/2, this.width, this.height, 0, this.height/2+this._spikeHeight, 20, 5)
            .attrs({fill:Colors.WHITE, stroke:Colors.BLACK, filter:Canvas.instance.shadowFilter});
    }

    get spikeHeight() {
        return this._spikeHeight;
    }

    show() {
        super.show();
        if (this.parent._expansionShown) {
            this.parent._expansionShown(this);
        }
        return this;
    }

    hide() {
        super.hide();
        if (this.parent._expansionHidden) {
            this.parent._expansionHidden(this);
        }
        return this;
    }

}
SigmaExpansionBubble.ELEVATION = 2;
SigmaExpansionBubble.MARGIN_FACTOR = 1.4;
SigmaExpansionBubble.SPIKE_HEIGHT = 20;
makeShaped(SigmaExpansionBubble);
makePart(SigmaExpansionBubble);
makePartsOwner(SigmaExpansionBubble);
makeContainer(SigmaExpansionBubble);
makeElevable(SigmaExpansionBubble);

export function makeExpansionOwner(superClass, expansionBubbleClass = SigmaExpansionBubble) {

    makePartsOwner(superClass);

    extendMethod(superClass, $improve=>
        function _improve(...args) {
            function triggerShape() {
                let arrow = new PlainArrow(this.width/2, this.height, this.width, this.height/2, 0.25)
                    .attrs({fill:Colors.PINK, stroke:Colors.CRIMSON, stroke_width:0.25, filter:Canvas.instance.highlightFilter});
                return new Group().add(
                    new Rotation(180, 0, this.height/2).add(
                        new Translation(0, this.height/2).add(arrow)
                    )
                ).attrs({filter:Canvas.instance.highlightFilter});
            }

            $improve.call(this, ...args);
            this._expander = new SigmaTrigger(SigmaTrigger.STD_WIDTH, SigmaTrigger.STD_HEIGHT, triggerShape,
                function() {
                    return ()=>{
                        if (!this.parent._expansionBubble) {
                            this.parent._buildExpansion();
                        }
                        this.parent._expansionBubble.show();
                    }
                });
            this._expander.matrix = Matrix2D.translate(0, -this.height/2+this._expander.height/6);
            this._addPart(this._expander);
            this._expander.hide();
        }
    );

    defineGetProperty(superClass,
        function expansionBubble() {
            return this._expansionBubble;
        }
    );

    defineMethod(superClass,
        function _createExpansionBubble(width, height, spikeHeight) {
            return new expansionBubbleClass(width, height, spikeHeight);
        }
    );

    defineMethod(superClass,
        function _buildExpansion() {
            let expansionWidth = this.width*SigmaExpansionBubble.MARGIN_FACTOR;
            let expansionHeight = this.height*SigmaExpansionBubble.MARGIN_FACTOR;
            this._expansionBubble = this._createExpansionBubble(expansionWidth, expansionHeight, SigmaExpansionBubble.SPIKE_HEIGHT);
            this._expansionBubble.addChild(this._createExpansion());
            this._expansionBubble.matrix = Matrix2D.translate(0, -this.height / 2 - expansionHeight / 2 - this._expansionBubble.spikeHeight * 0.9);
            this._addPart(this._expansionBubble);
            this._expansionBubble.hide();
        }
    );

    defineMethod(superClass,
        function _expansionShown(expansion) {
            this._expander.hide();
        }
    );

    defineMethod(superClass,
        function _expansionHidden(expansion) {
            if (Selection.instance.selected(this)) {
                this._expander.show();
            }
        }
    );

    defineGetProperty(superClass,
        function expansionVisible() {
            return this._expansionBubble && this._expansionBubble.visible;
        }
    );

    extendMethod(superClass, $select=>
        function select() {
            $select && $select.call(this);
            if (!this.expansionVisible) {
                this._expander.show();
            }
        }
    );

    extendMethod(superClass, $unselect=>
        function unselect() {
            $unselect && $unselect.call(this);
            this._expander.hide();
        }
    );

    extendMethod(superClass, $cloned=>
        function _cloned(copy, duplicata) {
            $cloned && $cloned.call(this, copy, duplicata);
            copy._expander.hide();
            if (copy.expansionVisible) {
                copy._expansionBubble.hide();
            }
        }
    );

}

export class SigmaPolymorphicElement extends SigmaElement {

    constructor(morphs, defaultMorphKey) {
        super(0, 0);
        this._morphs = new CloneableObject();
        for (let key in morphs) {
            this._addMorph(key, morphs[key]);
        }
        if (defaultMorphKey) this._defaultMorphKey = defaultMorphKey;
    }

    get width() {
        return this._currentMorph ? this._currentMorph.width : 0;
    }

    get height() {
        return this._currentMorph ? this._currentMorph.height : 0;
    }

    _addMorph(key, morph) {
        this._morphs[key] = morph;
        if (!this._defaultMorphKey) this._defaultMorphKey = key;
        return this;
    }

    addMorph(key, morph) {
        Memento.register(this);
        return this._addMorph(key, morph);
    }

    _removeMorph(key) {
        delete this._morphs[key];
        return this;
    }

    removeMorph(key) {
        Memento.register(this);
        return this._removeMorph(key);
    }

    get defaultMorphKey() {
        return this._defaultMorphKey;
    }

    _setMorph(key) {
        if (this._currentMorph) {
            this.removeChild(this._currentMorph);
        }
        this._morphKey = key;
        this._currentMorph = this._morphs[this._morphKey];
        assert(this._currentMorph);
        this.addChild(this._currentMorph);
        return this;
    }

    setMorph(key) {
        Memento.register(this);
        return this._setMorph(key);
    }

    get currentMorph() {
        return this._currentMorph;
    }

    setDefaultMorph() {
        return this.setMorph(this.defaultMorphKey);
    }

    get morphKey() {
        return this._morphKey;
    }

    setMorphFromSupport(support) {
        let elementMorph = support && support.elementMorph;
        if (elementMorph) {
            return this.setMorph(elementMorph);
        }
        else {
            return this.setDefaultMorph();
        }
    }

    _hoverOn(support) {
        this.setMorphFromSupport(support);
    }

    _memento() {
        let memento = super._memento();
        memento._morphKey = this._morphKey;
        memento._currentMorph = this._currentMorph;
        memento._morphs = {...this._morphs};
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._morphKey = memento._morphKey;
        this._currentMorph = memento._currentMorph;
        this._morphs = new CloneableObject(memento._morphs);
    }

}
makeContainer(SigmaPolymorphicElement);

export function makeEmbodiment(superClass) {

    defineProperty(superClass,
        function entity() {
            return this._entity;
        },
        function entity(entity) {
            Memento.register(this);
            assert(entity instanceof SigmaEntity);
            this._entity = entity;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento._entity = this._entity;
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._entity = memento._entity;
        }
    );

    if (defined(superClass, function movable() {})) {

        extendMethod(superClass, $setLocation =>
            function setLocation(point) {
                let result = $setLocation.call(this, point);
                if (result) {
                    let entityLocation =
                        this._entity.getEntityLocationFromEmbodimentLocation(this, point, this._entity.lloc);
                    this._entity && this._entity.adjustEmbodimentsLocations(this, entityLocation);
                }
                return result;
            }
        );

        extendMethod(superClass, $hoverOn =>
            function _hoverOn(support) {
                $hoverOn && $hoverOn.call(this, support);
                this.entity._hoverOn(support, this);
            }
        );

        extendMethod(superClass, $registerValidLocation=>
            function registerValidLocation() {
                $registerValidLocation.call(this);
                this.entity.registerValidLocation();
                return this;
            }
        );

        extendMethod(superClass, $unregisterValidLocation=>
            function unregisterValidLocation() {
                $unregisterValidLocation.call(this);
                this.entity.unregisterValidLocation();
                return this;
            }
        );

        extendMethod(superClass, $getExtension=>
            function getExtension(extension) {
                let elemExtension = $getExtension ? $getExtension.call(this, extension) : new ESet();
                if (this._entity.getExtension) {
                    let entitiesExtension = this._entity.getExtension();
                    for (let entity of entitiesExtension) {
                        elemExtension.add(entity.getEmbodiment(this.support));
                    }
                }
                return elemExtension;
            }
        );
    }

    defineGetProperty(superClass,
        function isEmbodiment() {
            return true;
        }
    );
}

export function makeEmbodimentContainerPart(superClass) {

    makePart(superClass);

    extendMethod(superClass, $hover=>
        function hover(elements) {
            $hover && $hover.call(this, elements);
            this.entity.hover(this, elements);
        }
    );

    replaceMethod(superClass,
        function _executeDrag(element) {
            this.entity.executeDrag(element, this);
            return true;

        }
    );

    replaceMethod(superClass,
        function _executeDrop(element) {
            this.entity.executeDrop(element, this);
            return true;
        }
    );
}

export class SigmaEntity {

    constructor(width, height, depth, ...args) {
        this._width = width;
        this._height = height;
        this._depth = depth;
        this._matrix = new Matrix3D();
        this._init(...args);
        this._improve(...args);
        this._finish(...args);
    }

    _init(...args) {}
    _improve(...args) {}
    _finish(...args) {}

    _setLocation(point) {
        this._matrix = Matrix3D.translate(point.x, point.y, point.z);
    }

    setLocation(point) {
        Memento.register(this);
        this._setLocation(point);
    }

    _geometry(matrix) {
        let v = [this.left, this.right],
            h = [this.top, this.bottom],
            d = [this.back, this.front];
        let left, right, top, bottom, front, back;
        for (let x of v) {
            for (let y of h) {
                for (let z of d) {
                    let {x:lx, y:ly, z:lz} = matrix.point(new Point3D(x, y, z));
                    if (left===undefined || left>lx) left = lx;
                    if (right===undefined || right<lx) right = lx;
                    if (top===undefined || top>ly) top = ly;
                    if (bottom===undefined || bottom<ly) bottom = ly;
                    if (back===undefined || back>lz) back = lz;
                    if (front===undefined || front<lz) front = lz;
                }
            }
        }
        return new Box3D(left, top, back, right-left, bottom-top, front-back);
    }

    get x() {return 0;}
    get y() {return 0;}
    get z() {return 0;}
    get width() { return this._width; }
    get height() { return this._height; }
    get depth() { return this._depth; }
    get left() {return this.x - this.width/2;}
    get right() {return this.x + this.width/2;}
    get top() {return this.y - this.height/2;}
    get bottom() {return this.y + this.height/2;}
    get back() {return this.z - this.depth/2;}
    get front() {return this.z + this.depth/2;}

    get matrix() { return this._matrix; }
    set matrix(matrix) {
        Memento.register(this);
        this._matrix = matrix;
    }
    get lx() { return this.matrix.x(0, 0, 0); }
    get ly() { return this.matrix.y(0, 0, 0); }
    get lz() { return this.matrix.z(0, 0, 0); }
    get lloc() { return new Point3D(this.lx, this.ly, this.lz)}
    get localGeometry() { return this._geometry(this.matrix); }

    _memento() {
        let memento = {
            _width: this._width,
            _height: this._height,
            _depth: this._depth,
            _matrix: this._matrix.clone()
        };
        return memento;
    }

    _revert(memento) {
        this._width = memento._width;
        this._height = memento._height;
        this._depth = memento._depth;
        this._matrix = memento._matrix.clone();
    }

    clone(duplicata) {
        let copy = CopyPaste.clone(this, duplicata);
        return copy;
    }

}
makeObservable(SigmaEntity);
SigmaEntity.projections = {
    FRONT : "front",
    LEFT: "left",
    TOP : "top",
    BACK : "back",
    RIGHT: "right",
    BOTTOM : "bottom"
};

export function makeEntityMovable(superClass) {

    defineMethod(superClass,
        function registerValidLocation() {
            this._validLocation = new Point3D(this.lx, this.ly, this.lz);
            return this;
        }
    );

    defineMethod(superClass,
        function unregisterValidLocation() {
            delete this._validLocation;
            return this;
        }
    );

    defineGetProperty(superClass,
        function validLocation() {
            return this._validLocation ? this._validLocation : new Point3D(this.lx, this.ly, this.lz);
        }
    );

}

export class SigmaPolymorphicEntity extends SigmaEntity {

    _init(...args) {
        super._init(...args);
        this._morphs = new CloneableObject();
        this._embodiments = new EMap();
        this._supports = new EMap();
    }

    _addMorph(projection, morph) {
        this._morphs[projection] = morph;
        return this;
    }

    addMorph(projection, morph, dimension) {
        Memento.register(this);
        morph._projections = dimension;
        return this._addMorph(projection, morph);
    }

    _removeMorph(projection) {
        delete this._morphs[projection];
        return this;
    }

    removeMorph(projection) {
        Memento.register(this);
        this._removeMorph(projection);
    }

    createEmbodiment(support) {
        assert(!this._embodiments.has(support));
        let embodiment = this._createEmbodiment(support);
        this._registerEmbodiment(embodiment, support);
        return this._embodiments.get(support);
    }

    getEmbodiment(support) {
        return this._embodiments.get(support);
    }

    getSupport(embodiment) {
        return this._supports.get(embodiment);
    }

    removeEmbodiment(embodiment) {
        this._unregisterEmbodiment(embodiment);
        return embodiment;
    }

    _hoverOn(support, embodiment) {
        let currentSupport = this._supports.get(embodiment);
        if (support !== currentSupport) {
            this._unregisterEmbodiment(embodiment);
            this._registerEmbodiment(embodiment, support);
        }
    }

    _unregisterEmbodiment(embodiment) {
        let support = this._supports.get(embodiment);
        this._embodiments.delete(support);
        this._supports.delete(embodiment);
    }

    _registerEmbodiment(embodiment, support) {
        assert(!this._embodiments.has(support));
        this._embodiments.set(support, embodiment);
        this._supports.set(embodiment, support);
        embodiment.setMorphFromSupport(support);
        embodiment._entity = this;
        return embodiment;
    }

    getEntityLocationFromEmbodimentLocation(embodiment, {x, y}, defaultLocation) {
        let key = embodiment.morphKey;
        let ex, ey, ez;
        if (key===SigmaEntity.projections.FRONT || key===SigmaEntity.projections.BACK) {
            ex = key===SigmaEntity.projections.FRONT ? x : -x;
            ey = y;
            ez = defaultLocation.z;
        }
        else if (key===SigmaEntity.projections.TOP || key===SigmaEntity.projections.BOTTOM) {
            ex = x;
            ey = defaultLocation.y;
            ez = key===SigmaEntity.projections.TOP ? y : -y;
        }
        else if (key===SigmaEntity.projections.LEFT || key===SigmaEntity.projections.RIGHT) {
            ex = defaultLocation.x;
            ey = y;
            ez = key===SigmaEntity.projections.RIGHT ? x : -x;
        }
        assert(!isNaN(ex+ey+ez));
        return new Point3D(ex, ey, ez);
    }

    getEmbodimentLocationFromEntityLocation(embodiment, {x, y, z}) {
        let key = embodiment.morphKey;
        let lx, ly;
        if (key===SigmaEntity.projections.FRONT || key===SigmaEntity.projections.BACK) {
            lx = key===SigmaEntity.projections.FRONT ? x : -x;
            ly = y;
        }
        else if (key===SigmaEntity.projections.TOP || key===SigmaEntity.projections.BOTTOM) {
            lx = x;
            ly = key===SigmaEntity.projections.TOP ? z : -z;
        }
        else if (key===SigmaEntity.projections.LEFT || key===SigmaEntity.projections.RIGHT) {
            ly = y;
            lx = key===SigmaEntity.projections.RIGHT ? x : -x;
        }
        return new Point2D(lx, ly);
    }

    adjustEmbodimentsLocations(entity, entityLocation) {
        if (!this.__moveEmbodiments) {
            try {
                this.__moveEmbodiments = true;
                this._setLocation(entityLocation);
                for (let support of this._embodiments.keys()) {
                    let aEmbodiment = this._embodiments.get(support);
                    if (aEmbodiment.movable) {
                        let location = this.getEmbodimentLocationFromEntityLocation(aEmbodiment, entityLocation);
                        aEmbodiment.move(location);
                    }
                }
            }
            finally {
                delete this.__moveEmbodiments;
            }
        }
    }

    setLocation(point) {
        super.setLocation(point);
        try {
            this.__moveEmbodiments = true;
            for (let support of this._embodiments.keys()) {
                let aEmbodiment = this._embodiments.get(support);
                let location = this.getEmbodimentLocationFromEntityLocation(aEmbodiment, point);
                aEmbodiment.move(location);
            }
        }
        finally {
            delete this.__moveEmbodiments;
        }
    }

    get morphs() {
        return this._morphs;
    }

    getMorph(projection) {
        return this._morphs[projection];
    }

    _memento() {
        let memento = super._memento();
        memento._morphs = {...this._morphs};
        return memento;
    }

    _revert(memento) {
        super._revert(memento);
        this._morphs = new CloneableObject(memento._morphs);
    }

}

export function makeEntityASupport(superClass) {

    extendMethod(superClass, $hover=>
        function hover(embodiment, elements) {
            $hover && $hover.call(this, elements);
            let lastSet = this._hoveredEmbodiments && this._hoveredEmbodiments.get(embodiment) || new ESet();
            let hoveredEmbodiments = new ESet();
            for (let element of elements) {
                if (element.isEmbodiment) {
                    hoveredEmbodiments.add(element);
                    if (lastSet.has(element)) {
                        this._moveHovered(element);
                        lastSet.delete(element);
                    }
                    else {
                        this._addHovered(element);
                        this._moveHovered(element);
                    }
                }
            }
            for (let element of lastSet) {
                this._removeHovered(element);
            }
            if (hoveredEmbodiments.size) {
                if (!this._hoveredEmbodiments) this._hoveredEmbodiments = new EMap();
                this._hoveredEmbodiments.set(embodiment, hoveredEmbodiments);
            }
            else {
                if (this._hoveredEmbodiments) {
                    this._hoveredEmbodiments.delete(embodiment);
                    if (!this._hoveredEmbodiments.size) delete this._hoveredEmbodiments;
                }
            }
        }
    );

    defineMethod(superClass,
        function getSupportEmbodiments(entity) {
            let embodiments = new List();
            for (let support of this.parent._embodiments.keys()) {
                embodiments.add(this.parent._embodiments.get(support).getContainer(entity));
            }
            return embodiments;
        }
    );

    defineMethod(superClass,
        function _addChildrenEmbodiments(entity) {
            if (!this.__addChildenEmbodiments) {
                try {
                    this.__addChildenEmbodiments = true;
                    for (let supportEmbodiment of this.getSupportEmbodiments(entity)) {
                        let embodiment = entity.getEmbodiment(supportEmbodiment);
                        if (!embodiment) {
                            embodiment = entity.createEmbodiment(supportEmbodiment);
                            supportEmbodiment.addChild(embodiment);
                        }
                        entity.adjustEmbodimentsLocations(entity, entity.lloc);
                    }
                }
                finally {
                    delete this.__addChildenEmbodiments;
                }
            }
        }
    );

    defineMethod(superClass,
        function _removeChildrenEmbodiments(entity) {
            if (!this.__removeChildenEmbodiments) {
                try {
                    this.__removeChildenEmbodiments = true;
                    for (let supportEmbodiment of this.getSupportEmbodiments(entity)) {
                        let embodiment = entity.getEmbodiment(supportEmbodiment);
                        if (embodiment) {
                            entity.removeEmbodiment(embodiment);
                            supportEmbodiment.removeChild(embodiment);
                        }
                    }
                }
                finally {
                    delete this.__removeChildenEmbodiments;
                }
            }
        }
    );

    defineMethod(superClass,
        function _addHovered(element) {
            if (!this.containsChild(element.entity)) {
                console.log()
                let location = element.entity.getEntityLocationFromEmbodimentLocation(
                    element, element.lloc, new Point3D(0, -this.height/2+element.entity.height/2, 0)
                );
                element.entity._setLocation(location);
                this.addChild(element.entity);
            }
        }
    );

    defineMethod(superClass,
        function _moveHovered(element) {
            element.entity.adjustEmbodimentsLocations(element.entity, element.entity.lloc);
        }
    );

    defineMethod(superClass,
        function _removeHovered(element) {
            this.removeChild(element.entity);
        }
    );

    defineMethod(superClass,
        function executeDrag(element, target) {
            target.removeChild(element);
        }
    );

    defineMethod(superClass,
        function executeDrop(element, target) {
            this._hoveredEmbodiments.get(target).delete(element);
            target.addChild(element);
        }
    );

    defineMethod(superClass,
        function containsChild(entity) {
            return this._children && this._children.has(entity);
        }
    );

    extendMethod(superClass, $addChild=>
        function addChild(entity) {
            if (!this._children || !this._children.has(entity)) {
                if (!this._children) {
                    this._children = new ESet();
                }
                this._children.add(entity);
                $addChild && $addChild.call(this, entity);
                this._addChildrenEmbodiments(entity);
            }
        }
    );

    extendMethod(superClass, $removeChild=>
        function removeChild(entity) {
            if (this._children && this._children.has(entity)) {
                this._children.delete(entity);
                if (!this._children.size) {
                    delete this._children;
                }
                this._removeChildrenEmbodiments(entity);
                $removeChild && $removeChild.call(this, entity);
            }
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            if (this._children) {
                memento._children = new ESet(this._children);
            }
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            delete this._children;
            if (memento._children) {
                this._children = new ESet(memento._children);
            }
            return this;
        }
    );

    defineGetProperty(superClass,
        function children() {
            return this._children ? this._children : new ESet();
        }
    );
}

export function changePolymorphicProjection(superClass, projection) {

    defineGetProperty(superClass,
        function elementMorph() {
            return projection;
        }
    );
}

export class SigmaTopExpansionBubble extends SigmaExpansionBubble {}
changePolymorphicProjection(SigmaTopExpansionBubble, SigmaEntity.projections.TOP);