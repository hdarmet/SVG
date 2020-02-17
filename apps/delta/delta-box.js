
import {
    makeLayered
} from "../../js/container-mixins.js";
import {
    addPhysicToContainer, ClipDecoration, makeClipsOwner, PhysicSelector, Clip, createPositioningPhysic
} from "../../js/physics.js";
import {
    makeDecorationsOwner, makeShaped
} from "../../js/core-mixins.js";
import {
    DeltaItem, DeltaEmbodiment, DeltaLayers, DeltaSupport, DeltaElement, DeltaStaticEmbodiment
} from "./delta-core.js";
import {
    Colors,  Group, Rect
} from "../../js/graphics.js";
import {
    addBordersToCollisionPhysicForElements, createGravitationPhysicForElements, makeCarrier
} from "../../js/collision-physics.js";
import {
    TextMenuOption
} from "../../js/tools.js";
import {
    always, is, defineMethod, extendMethod, defineGetProperty, assert, replaceMethod
} from "../../js/misc.js";
import {
    Point3D, Point2D
} from "../../js/geometry.js";
import {
    DeltaAbstractModule, DeltaModuleEmbodiment, DeltaModuleEntity
} from "./delta-products.js";
import {
    makeExpansionOwner, SigmaEntity, SigmaPolymorphicEntity, SigmaTopExpansionBubble, makeEntityASupport,
    makeEmbodimentContainerPart, makeEntityMovable
} from "../../js/entity.js";
import {
    addPhysicToEntity, createGravitationPhysicForEntities, EmbodimentPhysic, makeContainerSortedFromTop, makeContainerSortedFromFront,
    addBordersTo3DCollisionPhysic
} from "../../js/entity-physics.js";
import {
    makeFasciaSupport, makeFooterOwner, makeFrameSupport, makeHeaderOwner, DeltaFascia, DeltaFrame
} from "./delta-objects.js";

export class DeltaBoxEntityContent extends SigmaEntity {

    _createPhysic() {
        let CollisionPhysic = createGravitationPhysicForEntities({
            predicate:is(DeltaModuleEntity)
        });
        addBordersTo3DCollisionPhysic(CollisionPhysic, {
            bordersCollide: {left: true, right: true, top: true, bottom: true, back:true}
        });
        return new CollisionPhysic(this);
    }

}
makeEntityASupport(DeltaBoxEntityContent);
addPhysicToEntity(DeltaBoxEntityContent,  {
    physicBuilder: function() {
        return this._createPhysic();
    }
});

export class DeltaBoxEntity extends SigmaPolymorphicEntity {

    constructor({width, height, depth, contentX, contentY, contentWidth, contentHeight, contentDepth, ...args}) {
        super(width, height, depth, {contentX, contentY, contentWidth, contentHeight, contentDepth, ...args});
        this._createContent(contentWidth, contentHeight, contentDepth);
        let contentZ = (depth-contentDepth)/2;
        this._content.setLocation(new Point3D(contentX, contentY, contentZ))
    }

    _createContent(width, height, depth) {
        this._content = new DeltaBoxEntityContent(width, height, depth);
        this._content._setParent(this);
    }

    get content() {
        return this._content;
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
makeEntityMovable(DeltaBoxEntity);

export class DeltaBoxContent extends DeltaSupport {
    constructor({width, height, ...args}) {
        super({width, height, strokeColor:Colors.GREY, backgroundColor:Colors.LIGHTEST_GREY, ...args});
    }

    showRealistic() {
        this.shape.fill = Colors.DARKEST_GREY;
    }

    showSchematic() {
        this.shape.fill = Colors.LIGHTEST_GREY;
    }

}
makeDecorationsOwner(DeltaBoxContent);

export function makeBox(superClass) {

    makeShaped(superClass);

    extendMethod(superClass, $improve=>
        function _improve({clips, contentX, contentY, contentWidth, contentHeight, contentDepth, ...args}) {
            $improve.call(this, {color:Colors.WHITE});
            this._initShape(this._buildShape());
            this._boxContent = this._buildBoxContent(contentWidth, contentHeight, args);
            this._boxContent._setLocation(new Point2D(contentX, contentY));
            this._addPart(this._boxContent);
        }
    );

    replaceMethod(superClass,
        function _buildShape() {
            let base = new Group();
            base.fill = Colors.WHITE;
            let item = new Rect(-this.width / 2, -this.height / 2, this.width, this.height)
                .attrs({stroke: Colors.INHERIT, fill:Colors.INHERIT});
            base.add(item);
            return base;
        }
    );

    defineGetProperty(superClass,
        function boxContent() {
            return this._boxContent;
        }
    );

    defineMethod(superClass,
        function showRealistic() {
            this.shape.fill = Colors.BLACK;
        }
    );

    defineMethod(superClass,
       function showSchematic() {
           this.shape.fill = Colors.WHITE;
       }
    );

}

export class DeltaBox extends DeltaItem {
    _buildBoxContent(contentWidth, contentHeight) {
        return new DeltaBoxContent({width:contentWidth, height:contentHeight});
    }
}
makeBox(DeltaBox);
makeLayered(DeltaBox, {
    layer:DeltaLayers.MIDDLE
});
makeCarrier(DeltaBox);

export function makeBoxFrontContent(superClass) {

    replaceMethod(superClass,
        function _dropTarget(element) {
            if (is(DeltaFascia, DeltaFrame)(element)) {
                return this.parent._dropTarget(element);
            }
            return this;
        }
    );

}

export function makeClipsedOnFixings(superClass) {

    makeClipsOwner(superClass);

    extendMethod(superClass, $improve=>
        function _improve({clips, ...args}) {
            $improve.call(this, args);
            for (let clipSpec of clips) {
                let clip = new Clip(this, clipSpec.x, clipSpec.y);
                this._addClips(clip);
                this._boxContent._addDecoration(new ClipDecoration(this, clip));
            }
        }
    );

    defineGetProperty(superClass,
        function mabBeClipsedOnFixings() {
            return true;
        }
    );

}

export function makeCellsOwner(superClass) {

    extendMethod(superClass, $init=>
        function _init({slotWidth, ...args}) {
            $init && $init.call(this, {slotWidth, ...args});
            this._slotWidth = slotWidth;
            this._cells = [];
            this._cells.length = Math.floor(this.width/slotWidth);
        }
    );

    defineMethod(superClass,
        function _buildPositions(element) {
            let positions = [];
            let ceilCount = Math.ceil(element.width / this._slotWidth);
            for (let index = 0; index < this._cells.length - ceilCount + 1; index++) {
                let cellOk = true;
                for (let inCell = 0; inCell < ceilCount; inCell++) {
                    if (this._cells[index + inCell] && this._cells[index + inCell] !== element) {
                        cellOk = false;
                        break;
                    }
                }
                if (cellOk) {
                    positions.push({
                        x: -this.width / 2 + (index + ceilCount / 2) * this._slotWidth,
                        y: this.height / 2 - element.height / 2
                    });
                }
            }
            return positions;
        }
    );

    defineMethod(superClass,
        function _createPhysic() {
            let PositioningPhysic = createPositioningPhysic({
                predicate:is(DeltaAbstractModule, DeltaModuleEmbodiment),
                positionsBuilder:function(element) {return this._host._buildPositions(element);}
            });
            return new PositioningPhysic(this);
        }
    );

    defineMethod(superClass,
        function _allocateCells(element) {
            let MARGIN = 0.0001;
            let ceilFirst = Math.floor((this.width/2+element.lx-element.width/2)/this._slotWidth+MARGIN);
            let ceilCount = Math.ceil(element.width/this._slotWidth);
            for (let index=0; index<ceilCount; index++) {
                this._cells[index+ceilFirst] = element;
            }
        }
    );

    defineMethod(superClass,
        function _freeCells(element) {
            for (let index = 0; index<this._cells.length; index++) {
                if (this._cells[index]===element) {
                    delete this._cells[index];
                }
            }
        }
    );

    extendMethod(superClass, $add=>
        function _add(element) {
            let result = $add.call(this, element);
            this._allocateCells(element);
            return result;
        }
    );

    extendMethod(superClass, $remove=>
        function _remove(element) {
            let result = $remove.call(this, element);
            this._freeCells(element);
            return result;
        }
    );

    extendMethod(superClass, $insert=>
        function _insert(previous, element) {
            let result = $insert.call(this, previous, element);
            this._allocateCells(element);
            return result;
        }
    );

    extendMethod(superClass, $replace=>
        function _replace(previous, element) {
            let result = $replace.call(this, previous, element);
            this._freeCells(previous);
            this._allocateCells(element);
            return result;
        }
    );

    extendMethod(superClass, $memento=>
        function _memento() {
            let memento = $memento.call(this);
            memento._cells = [...this._cells];
            return memento;
        }
    );

    extendMethod(superClass, $revert=>
        function _revert(memento) {
            $revert.call(this, memento);
            this._cells = [...memento._cells];
        }
    );

    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return this._createPhysic();
        }
    });
}

export class DeltaSlottedBoxContent extends DeltaBoxContent {}
makeCellsOwner(DeltaSlottedBoxContent);

export class DeltaSlottedBox extends DeltaBox {

    _buildBoxContent(contentWidth, contentHeight, {slotWidth, ...args}) {
        return new DeltaSlottedBoxContent({width:contentWidth, height:contentHeight, slotWidth, ...args});
    }

}
makeBoxFrontContent(DeltaSlottedBox);
makeClipsedOnFixings(DeltaSlottedBox);

export class DeltaSlottedRichBox extends DeltaSlottedBox {

    _improve({
                 clips, depth,
                 contentX, contentY, contentWidth, contentHeight, contentDepth,
                 slotWidth,
                 headerHeight, footerHeight}
    ) {
        super._improve({clips, depth, contentX, contentY, contentWidth, contentHeight, contentDepth, slotWidth});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
        this._initFrameSupport();
    }

}
makeHeaderOwner(DeltaSlottedRichBox);
makeFooterOwner(DeltaSlottedRichBox);
makeFasciaSupport(DeltaSlottedRichBox);
makeFrameSupport(DeltaSlottedRichBox);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class DeltaBoxContentEmbodiment extends DeltaBoxContent {

    get entity() {
        return this.parent.entity.content;
    }

    _createPhysic() {
        return new EmbodimentPhysic(this);
    }

}
makeEmbodimentContainerPart(DeltaBoxContentEmbodiment);
addPhysicToContainer(DeltaBoxContentEmbodiment, {
        physicBuilder: function() {
            return this._createPhysic();
        }
    }
);

export class DeltaBoxEmbodiment extends DeltaBox {

    _buildBoxContent(contentWidth, contentHeight) {
        return new DeltaBoxContentEmbodiment({width:contentWidth, height:contentHeight});
    }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class DeltaBoxFrontContentEmbodiment extends DeltaBoxContentEmbodiment {
}
makeContainerSortedFromFront(DeltaBoxFrontContentEmbodiment);
makeBoxFrontContent(DeltaBoxFrontContentEmbodiment);

export class DeltaBoxTopContentEmbodiment extends DeltaBoxContentEmbodiment {
}
makeContainerSortedFromTop(DeltaBoxTopContentEmbodiment);

/*
makeEmbodimentContainerPart(DeltaBoxExpansionContent);
makeDecorationsOwner(DeltaBoxExpansionContent);
addPhysicToContainer(DeltaBoxExpansionContent, {
        physicBuilder: function() {
            return this._createPhysic();
        }
    }
);
*/

export class DeltaBoxTopEmbodiment extends DeltaBoxEmbodiment {

    get elementMorph() {
        return DeltaBoxExpansion.PROJECTION;
    }

    _buildBoxContent({contentWidth, contentDepth}) {
        return new DeltaBoxTopContentEmbodiment({width:contentWidth, depth:contentDepth});
    }

}
DeltaBoxTopEmbodiment.PROJECTION = "top";

export class DeltaBoxFrontEmbodiment extends DeltaBoxEmbodiment {

    get elementMorph() {
        return DeltaBoxFrontEmbodiment.PROJECTION;
    }

    _buildBoxContent({contentWidth, contentDepth}) {
        return new DeltaBoxFrontContentEmbodiment({width:contentWidth, depth:contentDepth});
    }

}
DeltaBoxFrontEmbodiment.PROJECTION = "front";
makeExpansionOwner(DeltaBoxFrontEmbodiment);

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function makeCaddy(superClass) {

    extendMethod(superClass, $createContextMenu=>
        function _createContextMenu() {
            $createContextMenu && $createContextMenu.call(this);
            this.addMenuOption(new TextMenuOption("generate ladders",
                function () { callForGenerateLadders(this); })
            );
        }
    );

    defineMethod(superClass,
        function _createPhysic() {
            let ModulePhysic = createGravitationPhysicForElements({
                predicate:is(DeltaAbstractModule, DeltaModuleEmbodiment, DeltaShelf),
                gravitationPredicate:is(DeltaAbstractModule, DeltaModuleEmbodiment),
                carryingPredicate:always});
            addBordersToCollisionPhysicForElements(ModulePhysic, {
                bordersCollide: {all: true}
            });
            let LadderPhysic = createSlotsAndClipsPhysic({
                predicate: is(DeltaShelf),
                slotProviderPredicate: is(DeltaAbstractLadder)
            });
            return new PhysicSelector(this,
                is(DeltaAbstractModule, DeltaModuleEmbodiment, DeltaShelf, DeltaAbstractLadder)
            )
                .register(new LadderPhysic(this))
                .register(new ModulePhysic(this));
        }
    );

    addPhysicToContainer(superClass, {
        physicBuilder: function() {
            return this._createPhysic();
        }
    })
};

/*
export class DeltaCaddyContent extends DeltaBoxContent {};
//makeCaddy(DeltaCaddyContent);

export class DeltaCaddy extends DeltaBox {

    _buildBoxContent(contentWidth, contentHeight, color) {
        return new DeltaCaddyContent({width:contentWidth, height:contentHeight, color:Colors.LIGHTEST_GREY});
    }

    _createExpansion() {
        return new DeltaCaddyExpansion({width:this.width, depth:this.depth, main:this});
    }

}
*/

/*
export class DeltaCaddyExpansionContent extends DeltaBoxExpansionContent {}
//makeCaddy(DeltaCaddyExpansionContent);

export class DeltaCaddyExpansion extends DeltaBoxExpansion {

    _buildBoxContent({contentWidth, contentDepth, slotWidth, ...args}) {
        return new DeltaCaddyExpansionContent({width:contentWidth, depth:contentDepth, ...args});
    }

}
*/

///// START //////////////////////////////////////////////////////////////////////////////////////

export class DeltaMorphElement extends DeltaElement {

    _init({entity, ...args}) {
        super._init(args);
        this._entity = entity;
    }

    get entity() {
        return this.parent ? this.parent.entity : null;
    }
}

export class DeltaCaddyFrontMorph extends DeltaMorphElement {

    get elementMorph() {
        return SigmaEntity.projections.FRONT;
    }

    getContainer(entity) {
        return this.boxContent;
    }

    _buildBoxContent(width, height, args) {
        return new DeltaBoxFrontContentEmbodiment({width, height, ...args});
    }

    _createExpansion() {
        return this._entity.createEmbodiment(this.expansionBubble)
    }
}
makeBox(DeltaCaddyFrontMorph);
makeExpansionOwner(DeltaCaddyFrontMorph, SigmaTopExpansionBubble);

export class DeltaCaddyTopMorph extends DeltaMorphElement {

    constructor({width, depth, contentX, contentWidth, contentDepth, ...args}) {
        super({width, height:depth, contentX, contentWidth, contentHeight:contentDepth, ...args});
    }

    get elementMorph() {
        return SigmaEntity.projections.TOP;
    }

    getContainer(entity) {
        return this.boxContent;
    }

    _buildBoxContent(width, height, args) {
        return new DeltaBoxTopContentEmbodiment({width, height, ...args});
    }

}
makeBox(DeltaCaddyTopMorph);

export function makeEmbodimentClipOnCapable(superClass) {

    defineGetProperty(superClass,
        function clips() {
            return this.entity.clips;
        }
    );

    defineMethod(superClass,
        function _acceptPosition(physic, position) {
            return this.entity._acceptPosition(physic, position);
        }
    );

    defineMethod(superClass,
        function _positioned(physic, position) {
            return this.entity._positioned(physic, position);
        }
    );

    defineGetProperty(superClass,
        function isClipOnCapable() {
            return true;
        }
    );
}

export class DeltaCaddyFrontEmbodiment extends DeltaEmbodiment {

    constructor({morphs}) {
        assert(morphs);
        super(morphs, SigmaEntity.projections.FRONT);
    }


    get mabBeClipsedOnFixings() {
        return true;
    }
}
//makeEmbodimentClipOnCapable(DeltaCaddyEmbodiment);
makeLayered(DeltaCaddyFrontEmbodiment, {
    layer:DeltaLayers.MIDDLE
});

export class DeltaCaddyTopEmbodiment extends DeltaStaticEmbodiment {

    constructor({morphs}) {
        assert(morphs);
        super(morphs, SigmaEntity.projections.TOP);
    }

}

export class DeltaCaddyEntity extends DeltaBoxEntity {
    /*
    _init({clips, ...args}) {
        super._init(args);
        for (let clipSpec of clips) {
            let clip = new Clip(this, clipSpec.x, clipSpec.y);
            this._addClips(clip);
        }
    }
*/

    _init({clips, color, headerHeight, footerHeight, contentX, contentY, contentWidth, contentHeight, contentDepth}) {
        super._init({clips});
        // Define TOP morph first, because, it is used when FRONT morph is built.
        this._addMorph(SigmaEntity.projections.TOP, new DeltaCaddyTopMorph({
            entity:this,
            width:this.width, depth:this.depth,
            color,
            contentX, contentWidth, contentDepth
        }));
        this._addMorph(SigmaEntity.projections.FRONT, new DeltaCaddyFrontMorph({
            entity:this,
            width:this.width, height:this.height,
            color, headerHeight, footerHeight,
            contentX, contentY, contentWidth, contentHeight
        }));


        for (let clipSpec of clips) {
            let clip = new Clip(this, clipSpec.x, clipSpec.y);
            this._addClips(clip);
        }

    }

    _createEmbodiment(support) {
        if (support instanceof SigmaTopExpansionBubble) {
            return new DeltaCaddyTopEmbodiment({morphs: this.morphs});
        }
        else {
            return new DeltaCaddyFrontEmbodiment({morphs: this.morphs});
        }
    }

    get defaultEmbodiment() {
        return this.createEmbodiment(null);
    }

}
makeClipsOwner(DeltaCaddyEntity);

/*
export class DeltaRichCaddyEntity extends DeltaCaddyEntity {

    _init({clips, color, headerHeight, footerHeight, contentX, contentY, contentWidth, contentHeight, contentDepth}) {
        super._init({clips});
        // Define TOP morph first, because, it is used when FRONT morph is built.
        this._addMorph(SigmaEntity.projections.TOP, new DeltaRichCaddyTopMorph({
            entity:this,
            width:this.width, depth:this.depth,
            color,
            contentX, contentWidth, contentDepth
        }));
        this._addMorph(SigmaEntity.projections.FRONT, new DeltaRichCaddyFrontMorph({
            entity:this,
            width:this.width, height:this.height,
            color, headerHeight, footerHeight,
            contentX, contentY, contentWidth, contentHeight
        }));
    }

    _createEmbodiment(support) {
        if (support instanceof SigmaTopExpansionBubble) {
            return new DeltaCaddyTopEmbodiment({morphs: this.morphs});
        }
        else {
            return new DeltaCaddyEmbodiment({morphs: this.morphs});
        }
    }

    get defaultEmbodiment() {
        return this.createEmbodiment(null);
    }

}
*/

////////// END ///////////////////////////////////////////////////////////////////////////

/*
export class DeltaRichCaddy extends DeltaCaddy {

    _improve({
                 clips, depth,
                 contentX, contentY, contentWidth, contentHeight, contentDepth,
                 color,
                 headerHeight, footerHeight}
    ) {
        super._improve({clips, depth, contentX, contentY, contentWidth, contentHeight, contentDepth, color});
        this._initHeader(headerHeight);
        this._initFooter(footerHeight);
        this._initFasciaSupport(headerHeight, footerHeight);
        this._initFrameSupport();
    }

}
makeHeaderOwner(DeltaRichCaddy);
makeFooterOwner(DeltaRichCaddy);
makeFasciaSupport(DeltaRichCaddy);
makeFrameSupport(DeltaRichCaddy);
*/