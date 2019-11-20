'use strict';

export function distanceToSegment(p, s1, s2) {
    return Math.sqrt(distanceToSegmentSquared(p, s1, s2));

    function squareDistance(p1, p2) {
        return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)
    }

    function distanceToSegmentSquared(p, s1, s2) {
        let l2 = squareDistance(s1, s2);
        if (l2 === 0) return squareDistance(p, s1);
        let t = ((p.x - s1.x) * (s2.x - s1.x) + (p.y - s1.y) * (s2.y - s1.y)) / l2;
        if (t < 0) return squareDistance(p, s1);
        if (t > 1) return squareDistance(p, s2);
        return squareDistance(p, {x: s1.x + t * (s2.x - s1.x), y: s1.y + t * (s2.y - s1.y)});
    }
}

export function distanceToEllipse(p, c, rx, ry) {
    let x = p.x - c.x;
    let y = p.y - c.y;
    let d1 = ry*x*ry*x;
    let d2 = rx*y*rx*y;
    let d3 = rx*rx*ry*ry;
    let r1 = Math.sqrt(d1+d2)-Math.sqrt(d3);
    return Math.sqrt(r1);
}

export function insidePolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i].x, yi = polygon[i].y;
        let xj = polygon[j].x, yj = polygon[j].y;

        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function angle(y, x) {
    return Math.atan2(y, -x)/Math.PI*180;
}

export function rotate(x, y, angle) {
    angle = angle * Math.PI / 180;
    return {
        x: x * Math.cos(_angle) - y * Math.sin(_angle),
        y: x * Math.sin(_angle) + y * Math.cos(_angle)
    };
}

export function intersectLineWithLine(a1, a2, b1, b2) {
    let uat = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    let ubt = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    let ubd = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

    if (ubd !== 0) {
        let ua = uat / ubd;
        let ub = ubt / ubd;
        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            return { x:a1.x + ua * (a2.x - a1.x), y:a1.y + ua * (a2.y - a1.y)};
        }
    }
    return null;
}

export function intersectLinePolygon(a1, a2, points) {
    let result = [];
    let length = points.length;

    for ( let i = 0; i < points.length; i++ ) {
        let b1 = points[i];
        let b2 = points[(i+1) % points.length];
        let intersect = intersectLineWithLine(a1, a2, b1, b2);
        intersect && result.push(inter);
    }
    return result;
}


function _norm(array) {
    return Math.sqrt(array[0] * array[0] + array[1] * array[1]);
}

function _normalize(array) {
    var norm = _norm(array);
    array[0] /= norm;
    array[1] /= norm;
}

function _determinant(a, b, c, d) {
    return a * d - b * c;
}

export function rad(deg) {
    return ((deg % 360) * Math.PI) / 180;
}

export function deg(rad) {
    return ((rad * 180) / Math.PI) % 360;
}

export class Matrix {

    constructor(a=1, b=0, c=0, d=1, e=0, f=0) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
        this._check();
    }

    _check() {
        if (isNaN(this.a+this.b+this.c+this.d+this.e+this.f)) {
            error();
        }
    }

    clone() {
        return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    _compute() {
        if (!this._split) {
            let split = {};
            let row = [[this.a, this.b], [this.c, this.d]];
            split.scalex = _norm(row[0]);
            _normalize(row[0]);
            split.shear = row[0][0] * row[1][0] + row[0][1] * row[1][1];
            row[1] = [
                row[1][0] - row[0][0] * split.shear,
                row[1][1] - row[0][1] * split.shear
            ];
            split.scaley = _norm(row[1]);
            _normalize(row[1]);
            split.shear /= split.scaley;
            if (_determinant(this.a, this.b, this.c, this.d) < 0) {
                split.scalex = -split.scalex;
            }
            let sin = row[0][1];
            let cos = row[1][1];
            if (cos < 0) {
                split.angle = deg(Math.acos(cos));
                if (sin < 0) {
                    split.angle = 360 - split.angle;
                }
            } else {
                split.angle = deg(Math.asin(sin));
            }
            this._split = split;
        }
        return this._split;
    }

    _add(a, b, c, d, e, f) {
        delete this._split;
        let aNew = a * this.a + b * this.c;
        let bNew = a * this.b + b * this.d;
        this.e += e * this.a + f * this.c;
        this.f += e * this.b + f * this.d;
        this.c = c * this.a + d * this.c;
        this.d = c * this.b + d * this.d;
        this.a = aNew;
        this.b = bNew;
        this._check();
        return this;
    };

    add(matrix) {
        return this.clone()._add(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    }

    diff(matrix) {
        return this.add(matrix.invert());
    }

    _mult(matrix) {
        delete this._split;
        this._add(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
        return this;
    };

    mult(matrix) {
        return this.clone()._mult(matrix);
    }

    _multLeft(matrix) {
        delete this._split;
        let aNew = matrix.a * this.a + matrix.c * this.b;
        let cNew = matrix.a * this.c + matrix.c * this.d;
        let eNew = matrix.a * this.e + matrix.c * this.f + matrix.e;
        this.b = matrix.b * this.a + matrix.d * this.b;
        this.d = matrix.b * this.c + matrix.d * this.d;
        this.f = matrix.b * this.e + matrix.d * this.f + matrix.f;
        this.a = aNew;
        this.c = cNew;
        this.e = eNew;
        this._check();
        return this;
    };

    multLeft(matrix) {
        return this.clone()._multLeft(matrix);
    }

    _invert() {
        delete this._split;
        let x = this.a * this.d - this.b * this.c;
        let a = this.d / x;
        let b = -this.b / x;
        let c = -this.c / x;
        let d = this.a / x;
        let e = (this.c * this.f - this.d * this.e) / x;
        let f = (this.b * this.e - this.a * this.f) / x;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
        this._check();
        return this;
    }

    invert() {
        return this.clone()._invert();
    }

    _translate(dx, dy) {
        delete this._split;
        this.e += dx * this.a + dy * this.c;
        this.f += dx * this.b + dy * this.d;
        this._check();
        return this;
    }

    translate(dx, dy) {
        return this.clone()._translate(dx, dy);
    }

    _scale(sx, sy, cx, cy) {
        delete this._split;
        (cx || cy) && this._translate(cx, cy);
        this.a *= sx;
        this.b *= sx;
        this.c *= sy;
        this.d *= sy;
        (cx || cy) && this._translate(-cx, -cy);
        this._check();
        return this;
    }

    scale(x, y, cx, cy) {
        return this.clone()._scale(x, y, cx, cy);
    }

    _rotate(a, cx, cy) {
        delete this._split;
        a = rad(a);
        cx = cx || 0;
        cy = cy || 0;
        let cos = +Math.cos(a).toFixed(9);
        let sin = +Math.sin(a).toFixed(9);
        this._add(cos, sin, -sin, cos, cx, cy);
        return this._add(1, 0, 0, 1, -cx, -cy);
    };

    rotate(a, cx, cy) {
        return this.clone()._rotate(a, cx, cy);
    }

    _skew(x, y) {
        delete this._split;
        x = rad(x);
        y = rad(y);
        let c = Math.tan(x).toFixed(9);
        let b = Math.tan(y).toFixed(9);
        return this._add(1, b, c, 1, 0, 0);
    };

    skew(x, y) {
        return this.clone()._skew(x, y);
    }

    x(x, y) {
        return this.a*x+this.c*y+this.e;
    }

    y(x, y) {
        return this.b*x+this.d*y+this.f;
    }

    get dx() {
        return this.e;
    }

    get dy() {
        return this.f;
    }

    get angle() {
        return this._compute().angle;
    }

    get scalex() {
        return this._compute().scalex;
    }

    get scaley() {
        return this._compute().scaley;
    }

    get shear() {
        return this._compute().shear;
    }

    toString() {
        return "matrix("+this.a+" "+this.b+" "+this.c+" "+this.d+" "+this.e+" "+this.f+")";
    }
}
Matrix.translate = function(dx, dy) {
    return new Matrix()._translate(dx, dy);
};
Matrix.scale = function(sx, sy, cx, cy) {
    return new Matrix()._scale(sx, sy, cx, cy);
};
Matrix.rotate = function(a, cx, cy) {
    return new Matrix()._rotate(a, cx, cy);
};
Matrix.skew = function(x, y) {
    return new Matrix()._skew(x, y);
};
Object.defineProperty(Matrix, "identity", {
    get: function() {return new Matrix();}
});

export class Box {

    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get left() {
        return this.x;
    }

    get top() {
        return this.y;
    }

    get right() {
        return this.x+this.width;
    }

    get bottom() {
        return this.y+this.height;
    }

    get cx() {
        return this.x+this.width/2;
    }

    get cy() {
        return this.y+this.height/2;
    }

    add(box) {
        let left = Math.min(this.left, box.left);
        let top = Math.min(this.top, box.top);
        let right = Math.max(this.right, box.right);
        let bottom = Math.max(this.bottom, box.bottom);
        return new Box(left, top, right-left, bottom-top);
    }

    intersects(box) {
        return (
            box.left < this.right &&
            box.right > this.left &&
            box.top < this.bottom &&
            box.bottom > this.top
        );
    }

    includes(box) {
        return (
            box.left > this.left &&
            box.right < this.right &&
            box.top > this.top &&
            box.bottom < this.bottom
        );
    }

}

export function getBox(points) {
    let left = points[0];
    let right = points[0];
    let top = points[1];
    let bottom = points[1];
    for (let index=2; index<points.length; index+=2) {
        if (points[index]<left) left=points[index];
        else if (points[index]>right) right=points[index];
        if (points[index+1]<top) top=points[index+1];
        else if (points[index+1]>bottom) bottom=points[index+1];
    }
    return new Box(left, top, right-left, bottom-top);
}