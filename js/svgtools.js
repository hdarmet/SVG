'use strict';

import {
    win, Group, Rect, Line, Path, Filter, FeDropShadow, PC, FilterUnits, FeIn, M, L, l, Z, Q, q, Colors, Fill, Text, Tspan, doc, SVG_NS,
    AlignmentBaseline, TextAnchor, Translation
} from "./graphics.js";
import {
    Matrix, angle, intersectLinePolygon
} from "./geometry.js";
import {
    List, ESet
} from "./collections.js";

let ghost = doc.createElementNS(SVG_NS, "svg");
ghost.setAttribute("visibility", "hidden");
ghost.setAttribute("id", "ghost");
ghost.setAttribute("width", "1");
ghost.setAttribute("height", "1");
ghost.setAttribute("style", "position:fixed;top:0;left:0;");
doc.body.appendChild(ghost);

let rect = new Rect(10, 10, 200, 200);
ghost.appendChild(rect._node);

export function __askForRefresh(element) {
    if (!win.__toRefresh) {
        win.__toRefresh = new ESet();
        win.setTimeout(function() {
            for (let element of win.__toRefresh) {
                element._build();
            }
            delete win.__toRefresh;
        }, 0);
    }
    win.__toRefresh.add(element);
}

export function __cancelForRefresh(element) {
    if (win.__toRefresh) {
        win.__toRefresh.delete(element);
    }
}

export function defineShadow(id, color) {

    let shadowFilter = new Filter();
    shadowFilter.attrs({
        id:id,
        filterUnits:FilterUnits.OBJECTBOUNDINGBOX, primitiveUnits:FilterUnits.USERSPACEONUSE,
        x:PC(-20),
        y:PC(-20),
        width:PC(140),
        height:PC(140)
    });
    shadowFilter.feDropShadow = new FeDropShadow().attrs({
        stdDeviation:[3, 3], in:FeIn.SOURCEGRAPHIC, dx:0, dy:0, flood_color:color, flood_opacity:1,
    });
    return shadowFilter.add(shadowFilter.feDropShadow);
}

export class MultiLineText extends Group {

    constructor(...lines) {
        super();
        this._lines = lines;
        this._build();
    }

    _build() {
        ghost.appendChild(this._node);
        this._textSupport = new Translation();
        this.add(this._textSupport);
        let allLines = new List();
        for (let line of this._lines) {
            allLines.push(...line.split("\n"));
        }
        let line = allLines.shift();
        this._text = new Text(0, 0, line).attrs({text_anchor:TextAnchor.MIDDLE});
        this._textSupport.add(this._text);
        let bbox = this._text.bbox;
        let textHeight = bbox.height;
        for (let line of allLines) {
            let tspan = new Tspan(0, 0, line).attrs({x:0, dy:bbox.height});
            this._text.add(tspan);
            bbox = tspan.bbox;
        }
        bbox = super.bbox;
        this._textSupport.set(0, -bbox.height/2+textHeight*.66);
        this._width = bbox.width;
        this._height = bbox.height;
    }

    get bbox() {
        let bbox = super.bbox;
        if (!bbox.width) bbox.width = this._width;
        if (!bbox.height) bbox.height = this._height;
        return bbox;
    }

    get width() { return this._width; }

    get height() { return this._height; }

    get lines() { return this._lines; };
    set lines(lines) { this._lines = lines; __askForRefresh(this); };

    attrs(values) {
        super.attrs(values);
        __cancelForRefresh(this);
        this._build();
        return this;
    }

    _cloneAttrs(copy) {
        copy._width = this._width;
        copy._height = this._height;
        copy._lines = this._lines;
        super._cloneAttrs(copy);
    }
}

export class Arrow extends Group {

    constructor(x1, y1, x2, y2, [lhwidth, lhheight], [rhwidth, rhheight]) {
        super();
        this.attrs({x1, y1, x2, y2, lhwidth, lhheight, rhwidth, rhheight});
    }

    _build() {
        this.clear();
        let dx=this._x2-this._x1;
        let dy=this._y2-this._y1;
        let distance = Math.sqrt(dx*dx+dy*dy);
        let matrix = Matrix.translate((this._x1+this._x2)/2, (this._y1+this._y2)/2);
        if (dx || dy) {
            matrix = matrix.rotate(angle(dy, dx), 0, 0);
        }
        let line = new Line(-distance/2, 0, distance/2, 0);
        this.add(line);
        let leftHead = new Path(M(-distance/2+this._lhwidth, -this._lhheight/2),
            l(-this._lhwidth, this._lhheight/2), l(this._lhwidth, this._lhheight/2))
            .attrs({"stroke-dasharray":"none", fill:Fill.NONE});
        this.add(leftHead);
        let rightHead = new Path(M(distance/2-this._rhwidth, -this._rhheight/2),
            l(this._rhwidth, this._rhheight/2), l(-this._rhwidth, this._rhheight/2))
            .attrs({"stroke-dasharray":"none", fill:Fill.NONE});
        this.add(rightHead);
        this.matrix = matrix;
    }

    setPosition(x1, y1, x2, y2) {
        this.attrs({
            x1, y1, x2, y2
        });
        return this;
    }

    setLeftHeadGeometry(lhwidth, lhheight) {
        this.attrs({
            lhwidth, lhheight
        });
        return this;
    }

    setRightHeadGeometry(rhwidth, rhheight) {
        this.attrs({
            rhwidth, rhheight
        });
        return this;
    }

    get x1() { return this._x1; };
    set x1(x1) { this._x1 = x1; __askForRefresh(this); };

    get y1() { return this._y1; };
    set y1(y1) { this._y1 = y1; __askForRefresh(this); };

    get x2() { return this._x2; };
    set x2(x2) { this._x2 = x2; __askForRefresh(this); };

    get y2() { return this._y2; };
    set y2(y2) { this._y2 = y2; __askForRefresh(this); };

    get lhwidth() { return this._lhwidth; };
    set lhwidth(lhwidth) { this._lhwidth = lhwidth; __askForRefresh(this); };

    get lhheight() { return this._lhheight; };
    set lhheight(lhheight) { this._lhheight = lhheight; __askForRefresh(this); };

    get rhwidth() { return this._rhwidth; };
    set rhwidth(rhwidth) { this._rhwidth = rhwidth; __askForRefresh(this); };

    get rhheight() { return this._rhheight; };
    set rhheight(rhheight) { this._rhheight = rhheight; __askForRefresh(this); };

    attrs(values) {
        super.attrs(values);
        __cancelForRefresh(this);
        this._build();
        return this;
    }

    _cloneAttrs(copy) {
        copy._x1 = this._x1;
        copy._y1 = this._y1;
        copy._x2 = this._x2;
        copy._y2 = this._y2;
        copy._lhwidth = this._lhwidth;
        copy._lhheight = this._lhheight;
        copy._rhwidth = this._rhwidth;
        copy._rhheight = this._rhheight;
        super._cloneAttrs(copy);
    }

}

export class Bubble extends Group {

    constructor(x, y, width, height, px, py, bw, r) {
        super();
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._px = px;
        this._py = py;
        this._bw = bw;
        this._r = r;
        this._build();
    }

    _build() {

        function getPoints(x, y, width, height, px, py, bw) {
            let points = new List();
            let bases = intersectLinePolygon({x:px, y:py}, {x:x+width/2, y:y+height/2}, [
                {x, y}, {x:x+width, y}, {x:x+width, y:y+height}, {x, y:y+height}
            ]);
            if (bases.length) {
                let base = bases[0];
                if (base.x === x) {
                    let ly = base.y-bw/2;
                    if (ly>=y) {
                        points.add({x, y});
                        points.add({x, y:ly});
                    } else {
                        points.add({x:x + y-ly, y});
                    }
                    points.add({x:px, y:py});
                    ly = base.y+bw/2;
                    if (ly<=y+height) {
                        points.add({x, y:ly});
                        points.add({x, y:y+height});
                    } else {
                        points.add({x:x - y-height+ly, y:y+height});
                    }
                    points.add({x:x+width, y:y+height});
                    points.add({x:x+width, y});
                }
                else if (base.y === y+height) {
                    let ly = y+height;
                    let lx = base.x+bw/2;
                    if (lx<=x+width) {
                        points.add({x:x+width, y:ly});
                        points.add({x:lx, y:ly});
                    } else {
                        points.add({x:x+width, y:ly + x+width-lx});
                    }
                    points.add({x:px, y:py});
                    lx = base.x-bw/2;
                    if (lx>=x) {
                        points.add({x:lx, y:ly});
                        points.add({x, y:ly});
                    } else {
                        points.add({x, y:ly -x+lx});
                    }
                    points.add({x, y});
                    points.add({x:x+width, y});
                }
                else if (base.x === x+width) {
                    let lx = x+width;
                    let ly = base.y+bw/2;
                    if (ly<=y+height) {
                        points.add({x:lx, y:y+height});
                        points.add({x:lx, y:ly});
                    } else {
                        points.add({x:lx + y+height-ly, y:y+height});
                    }
                    points.add({x:px, y:py});
                    ly = base.y-bw/2;
                    if (ly>=y) {
                        points.add({x:lx, y:ly});
                        points.add({x:lx, y});
                    } else {
                        points.add({x:lx -y+ly, y});
                    }
                    points.add({x, y});
                    points.add({x, y:y+height});
                }
                else if (base.y === y) {
                    let lx = base.x-bw/2;
                    if (lx>=x) {
                        points.add({x, y});
                        points.add({x:lx, y});
                    } else {
                        points.add({x, y:y + x-lx});
                    }
                    points.add({x:px, y:py});
                    lx = base.x+bw/2;
                    if (lx<=x+width) {
                        points.add({x:lx, y});
                        points.add({x:x+width, y});
                    } else {
                        points.add({x:x+width, y:y - x-width+lx});
                    }
                    points.add({x:x+width, y:y+height});
                    points.add({x, y:y+height});
                }
            }
            return points;
        }

        function getCornerPoints(point1, point2, r) {
            let distance = Math.sqrt((point1.x-point2.x)*(point1.x-point2.x)+(point1.y-point2.y)*(point1.y-point2.y));
            if (distance<=2*r) {
                let center = {x:(point1.x+point2.x)/2, y:(point1.y+point2.y)/2};
                return [center, center];
            }
            else {
                let delta = {x: (point2.x - point1.x) * r / distance, y: (point2.y - point1.y) * r / distance};
                return [ {x: point1.x + delta.x, y: point1.y + delta.y},{x:point2.x-delta.x, y:point2.y-delta.y}];
            }
        }

        function getSegment(points, index) {
            if (!index) return [points[points.length-1], points[0]]; else return [points[index-1], points[index]];
        }

        let points = getPoints(this.x, this.y, this.width, this.height, this.px, this.py, this.bw);
        let directives = new List();
        let segment = getSegment(points, points.length-1);
        let corners = getCornerPoints(segment[0], segment[1], this._r);
        directives.add(M(corners[1].x, corners[1].y));
        for (let index=0; index<points.length; index++) {
            let segment = getSegment(points, index);
            let corners = getCornerPoints(segment[0], segment[1], this._r);
            directives.add(Q(segment[0].x, segment[0].y, corners[0].x, corners[0].y));
            directives.add(L(corners[1].x, corners[1].y));
        }

        this.clear().add(new Path(...directives));
    }

    get x() { return this._x; };
    set x(x) { this._x = x; __askForRefresh(this); };

    get y() { return this._y; };
    set y(y) { this._y = y; __askForRefresh(this); };

    get width() { return this._width; }
    set width(width) { this._width = width; __askForRefresh(this); };

    get height() { return this._height; }
    set height(height) { this._height = height; __askForRefresh(this); };

    get px() { return this._px; }
    set px(px) { this._px = px; __askForRefresh(this); };

    get py() { return this._py; }
    set py(py) { this._py = py; __askForRefresh(this); };

    get bw() { return this._bw; }
    set bw(bw) { this._bw = bw; __askForRefresh(this); };

    get r() { return this._r; }
    set r(r) { this._r = r; __askForRefresh(this); };

    attrs(values) {
        super.attrs(values);
        __cancelForRefresh(this);
        this._build();
        return this;
    }

    _cloneAttrs(copy) {
        copy._x = this._x;
        copy._y = this._y;
        copy._width = this._width;
        copy._height = this._height;
        copy._px = this._px;
        copy._py = this._py;
        copy._bw = this._bw;
        copy._r = this._r;
        super._cloneAttrs(copy);
    }

}

export class PlainArrow extends Group {

    constructor(width, height, hwidth, hheight, r=0) {
        super();
        this._width = width;
        this._height = height;
        this._hwidth = hwidth;
        this._hheight = hheight;
        this._r = r;
        this._build();
    }

    _build() {
        if (this._r) {
            let hr = this._r/this._hwidth*this._hheight*2;
            this.clear().add(
                new Path(M(-this._width/2, 0), l(this._width/2-this._r, 0), q(this._r, 0, this._r, this._r),
                    l(0, this._height-this._hheight-this._r*2), q(0, this._r, this._r, this._r),
                    l((this._hwidth-this._width)/2-this._r*2, 0), q(this._r, 0, 0, hr),
                    l(-this._hwidth/2+this._r*2, this._hheight-hr*2), q(-this._r, hr, -this._r*2, 0),
                    l(-this._hwidth/2+this._r*2, -this._hheight+hr*2), q(-this._r, -hr, 0, -hr),
                    l((this._hwidth-this._width)/2-this._r*2, 0), q(this._r, 0, this._r, -this._r),
                    l(0, -this._height+this._hheight+this._r*2), q(0, -this._r, this._r, -this._r),
                    l(this._width/2-this._r, 0)
                )
            )
        }
        else {
            this.clear().add(
                new Path(M(-this._width/2, 0), l(this._width/2, 0),
                    l(0, this._height-this._hheight), l((this._hwidth-this._width)/2, 0),
                    l(-this._hwidth/2, this._hheight), l(-this._hwidth/2, -this._hheight),
                    l((this._hwidth-this._width)/2, 0), l(0, -this._height+this._hheight),
                    l(this._width/2, 0)
                )
            )
        }
    }

    get width() { return this._width; }
    set width(width) { this._width = width; __askForRefresh(this); };

    get height() { return this._height; }
    set height(height) { this._height = height; __askForRefresh(this); };

    get hwidth() { return this._hwidth; }
    set hwidth(hwidth) { this._hwidth = hwidth; __askForRefresh(this); };

    get hheight() { return this._hheight; }
    set hheight(hheight) { this._hheight = hheight; __askForRefresh(this); };

    get r() { return this._r; }
    set r(r) { this._r = r; __askForRefresh(this); };

    attrs(values) {
        super.attrs(values);
        __cancelForRefresh(this);
        this._build();
        return this;
    }

    _cloneAttrs(copy) {
        copy._width = this._width;
        copy._height = this._height;
        copy._hwidth = this._hwidth;
        copy._hheight = this._hheight;
        copy._r = this._r;
        super._cloneAttrs(copy);
    }

}
