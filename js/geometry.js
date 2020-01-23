'use strict';
import {
    assert, defineGetProperty
} from "./misc.js";

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
        intersect && result.push(intersect);
    }
    return result;
}

function _norm2D(array) {
    return Math.sqrt(array[0] * array[0] + array[1] * array[1]);
}

function _normalize2D(array) {
    var norm = _norm2D(array);
    array[0] /= norm;
    array[1] /= norm;
}

function _determinant2D(a, b, c, d) {
    return a * d - b * c;
}

function _norm3D(array) {
    return Math.sqrt(array[0] * array[0] + array[1] * array[1] + array[2] * array[2]);
}

function _normalize3D(array) {
    var norm = _norm3D(array);
    array[0] /= norm;
    array[1] /= norm;
    array[2] /= norm;
}

function _determinant3D(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
    let z20 = m12 * m23 - m22 * m13;
    let z10 = m32 * m13 - m12 * m33;
    let z00 = m22 * m33 - m32 * m23;

    return m31 * z20 + m21 * z10 + m11 * z00;
}

export function rad(deg) {
    return ((deg % 360) * Math.PI) / 180;
}

export function deg(rad) {
    return ((rad * 180) / Math.PI) % 360;
}

export class Matrix2D {

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
            assert("Invalid matrix:", this);
        }
    }

    clone() {
        return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    _compute() {
        if (!this._split) {
            let split = {};
            let row = [[this.a, this.b], [this.c, this.d]];
            split.scalex = _norm2D(row[0]);
            _normalize2D(row[0]);
            split.shear = row[0][0] * row[1][0] + row[0][1] * row[1][1];
            row[1] = [
                row[1][0] - row[0][0] * split.shear,
                row[1][1] - row[0][1] * split.shear
            ];
            split.scaley = _norm2D(row[1]);
            _normalize2D(row[1]);
            split.shear /= split.scaley;
            if (_determinant2D(this.a, this.b, this.c, this.d) < 0) {
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

    point(point) {
        return new Point2D(
            this.x(point.x, point.y),
            this.y(point.x, point.y)
        );
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

    equals(matrix) {
        return this.a===matrix.a && this.b===matrix.b && this.c===matrix.c &&
               this.d===matrix.d && this.e===matrix.e && this.f===matrix.f;
    }

    toString() {
        return "matrix("+this.a+" "+this.b+" "+this.c+" "+this.d+" "+this.e+" "+this.f+")";
    }
}
Matrix2D.translate = function(dx, dy) {
    return new Matrix2D()._translate(dx, dy);
};
Matrix2D.scale = function(sx, sy, cx, cy) {
    return new Matrix2D()._scale(sx, sy, cx, cy);
};
Matrix2D.rotate = function(a, cx, cy) {
    return new Matrix2D()._rotate(a, cx, cy);
};
Matrix2D.skew = function(x, y) {
    return new Matrix2D()._skew(x, y);
};
defineGetProperty(Matrix2D,
    function identity() {return new Matrix2D();}
);

export class Matrix3D {

    constructor(m11=1, m12=0, m13=0, m21=0, m22=1, m23=0, m31=0, m32=0, m33=1, o1=0, o2=0, o3=0) {
        this.m11 = m11;
        this.m12 = m12;
        this.m13 = m13;
        this.m21 = m21;
        this.m22 = m22;
        this.m23 = m23;
        this.m31 = m31;
        this.m32 = m32;
        this.m33 = m33;
        this.o1 = o1;
        this.o2 = o2;
        this.o3 = o3;
        this._check();
    }

    _check() {
        if (isNaN(
            this.m11+this.m12+this.m13+
            this.m21+this.m22+this.m23+
            this.m31+this.m32+this.m33+
            this.o1+this.o2+this.o3)) {
            assert(false);
        }
    }

    clone() {
        return new Matrix3D(
            this.m11, this.m12, this.m13,
            this.m21, this.m22, this.m23,
            this.m31, this.m32, this.m33,
            this.o1, this.o2, this.o3);
    }

    _invert() {
        delete this._split;
        let z20 = this.m12 * this.m23 - this.m22 * this.m13;
        let z10 = this.m32 * this.m13 - this.m12 * this.m33;
        let z00 = this.m22 * this.m33 - this.m32 * this.m23;
        let x = this.m31 * z20 + this.m21 * z10 + this.m11 * z00;
        // Compute 3x3 non-zero cofactors for the 2nd column
        let z21 = this.m21 * this.m13 - this.m11 * this.m23;
        let z11 = this.m11 * this.m33 - this.m31 * this.m13;
        let z01 = this.m31 * this.m23 - this.m21 * this.m33;
        // Compute all six 2x2 determinants of 1st two columns
        let y01 = this.m11 * this.m22 - this.m21 * this.m12;
        let y02 = this.m11 * this.m32 - this.m31 * this.m12;
        let y03 = this.m11 * this.o2 - this.o1 * this.m12;
        let y12 = this.m21 * this.m32 - this.m31 * this.m22;
        let y13 = this.m21 * this.o2 - this.o1 * this.m22;
        let y23 = this.m31 * this.o2 - this.o1 * this.m32;
        // Compute all non-zero and non-one 3x3 cofactors for 2nd two columns
        let z23 = this.m23 * y03 - this.o3 * y01 - this.m13 * y13;
        let z13 = this.m13 * y23 - this.m33 * y03 + this.o3 * y02;
        let z03 = this.m33 * y13 - this.o3 * y12 - this.m23 * y23;
        let z22 = y01;
        let z12 = -y02;
        let z02 = y12;
        // Multiply all 3x3 cofactors by reciprocal & transpose
        this.m11 = z00/x;
        this.m12 = z10/x;
        this.m13 = z20/x;
        this.m21 = z01/x;
        this.m22 = z11/x;
        this.m23 = z21/x;
        this.m31 = z02/x;
        this.m32 = z12/x;
        this.m33 = z22/x;
        this.o1 = z03/x;
        this.o2 = z13/x;
        this.o3 = z23/x;
        this._check();
        return this;
    }

    invert() {
        return this.clone()._invert();
    }

    _add(m11, m12, m13, m21, m22, m23, m31, m32, m33, o1, o2, o3) {
        delete this._split;
        let m11New = this.m11*m11 + this.m21*m12 + this.m31*m13;
        let m12New = this.m12*m11 + this.m22*m12 + this.m32*m13;
        let m13New = this.m13*m11 + this.m23*m12 + this.m33*m13;
        let m21New = this.m11*m21 + this.m21*m22 + this.m31*m23;
        let m22New = this.m12*m21 + this.m22*m22 + this.m31*m23;
        let m23New = this.m13*m21 + this.m23*m22 + this.m33*m23;
        let m31New = this.m11*m31 + this.m21*m32 + this.m31*m33;
        let m32New = this.m12*m31 + this.m22*m32 + this.m32*m33;
        let m33New = this.m13*m31 + this.m23*m32 + this.m33*m33;
        this.o1 += this.m11*o1 + this.m21*o2 + this.m31*o3;
        this.o2 += this.m12*o1 + this.m22*o2 + this.m32*o3;
        this.o3 += this.m13*o1 + this.m23*o2 + this.m33*o3;
        this.m11 = m11New;
        this.m12 = m12New;
        this.m13 = m13New;
        this.m21 = m21New;
        this.m22 = m22New;
        this.m23 = m23New;
        this.m31 = m31New;
        this.m32 = m32New;
        this.m33 = m33New;
        this._check();
        return this;
    };

    add(matrix) {
        return this.clone()._add(
            matrix.m11, matrix.m12, matrix.m13,
            matrix.m21, matrix.m22, matrix.m23,
            matrix.m31, matrix.m32, matrix.m33,
            matrix.o1, matrix.o2, matrix.o3);
    }

    diff(matrix) {
        return this.add(matrix.invert());
    }

    _mult(matrix) {
        delete this._split;
        this._add(
            matrix.m11, matrix.m12, matrix.m13,
            matrix.m21, matrix.m22, matrix.m23,
            matrix.m31, matrix.m32, matrix.m33,
            matrix.o1, matrix.o2, matrix.o3);
        return this;
    };

    mult(matrix) {
        return this.clone()._mult(matrix);
    }

    _multLeft(m11, m12, m13, m21, m22, m23, m31, m32, m33, o1, o2, o3) {
        delete this._split;
        let m11New = m11*this.m11 + m21*this.m12 + m31*this.m13;
        let m12New = m12*this.m11 + m22*this.m12 + m32*this.m13;
        let m13New = m13*this.m11 + m23*this.m12 + m33*this.m13;
        let m21New = m11*this.m21 + m21*this.m22 + m31*this.m23;
        let m22New = m12*this.m21 + m22*this.m22 + m31*this.m23;
        let m23New = m13*this.m21 + m23*this.m22 + m33*this.m23;
        let m31New = m11*this.m31 + m21*this.m32 + m31*this.m33;
        let m32New = m12*this.m31 + m22*this.m32 + m32*this.m33;
        let m33New = m13*this.m31 + m23*this.m32 + m33*this.m33;
        this.o1 = m11*this.o1 + m21*this.o2 + m31*this.o3 + o1;
        this.o2 = m12*this.o1 + m22*this.o2 + m32*this.o3 + o2;
        this.o3 = m13*this.o1 + m23*this.o2 + m33*this.o3 + o3;
        this.m11 = m11New;
        this.m12 = m12New;
        this.m13 = m13New;
        this.m21 = m21New;
        this.m22 = m22New;
        this.m23 = m23New;
        this.m31 = m31New;
        this.m32 = m32New;
        this.m33 = m33New;
        this._check();
        return this;
    };

    multLeft(matrix) {
        return this.clone()._multLeft(
            matrix.m11, matrix.m12, matrix.m13,
            matrix.m21, matrix.m22, matrix.m23,
            matrix.m31, matrix.m32, matrix.m33,
            matrix.o1, matrix.o2, matrix.o3);
    }

    x(x, y, z) {
        return this.m11*x+this.m21*y+this.m31*z+this.o1;
    }

    y(x, y, z) {
        return this.m12*x+this.m22*y+this.m32*z+this.o2;
    }

    z(x, y, z) {
        return this.m13*x+this.m23*y+this.m33*z+this.o3;
    }

    point(point) {
        return new Point3D(
            this.x(point.x, point.y, point.z),
            this.y(point.x, point.y, point.z),
            this.z(point.x, point.y, point.z)
        );
    }

    _translate(dx, dy, dz) {
        delete this._split;
        this.o1 += dx * this.m11 + dy * this.m21 + dz * this.m31;
        this.o2 += dx * this.m12 + dy * this.m22 + dz * this.m32;
        this.o3 += dx * this.m13 + dy * this.m23 + dz * this.m33;
        this._check();
        return this;
    }

    translate(dx, dy, dz) {
        return this.clone()._translate(dx, dy, dz);
    }

    _scale(sx, sy, sz, cx, cy, cz) {
        delete this._split;
        (cx || cy || cz) && this._translate(cx, cy, cz);
        this.m11 *= sx;
        this.m12 *= sx;
        this.m13 *= sx;
        this.m21 *= sy;
        this.m22 *= sy;
        this.m23 *= sy;
        this.m31 *= sz;
        this.m32 *= sz;
        this.m33 *= sz;
        (cx || cy || cz) && this._translate(-cx, -cy, -cz);
        this._check();
        return this;
    }

    scale(x, y, z, cx, cy, cz) {
        return this.clone()._scale(x, y, cx, cy, cz);
    }
}
Matrix3D.translate = function(x, y, z) {
    return new Matrix3D()._translate(x, y, z);
};
Matrix3D.scale = function(sx, sy, sz, cx, cy, cz) {
    return new Matrix3D()._scale(sx, sy, sz, cx, cy, cz);
};

export class Box2D {

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
        return new Box2D(left, top, right-left, bottom-top);
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

    grow(increment) {
        return new Box2D(
            this.x-increment,
            this.y-increment,
            this.width+increment*2,
            this.height+increment*2
        );
    }
}

export class Box3D extends Box2D {

    constructor(x, y, z, width, height, depth) {
        super(x, y, width, height);
        this.z = z;
        this.depth = depth;
    }

    get front() {
        return this.z;
    }

    get back() {
        return this.z+this.depth;
    }

    get cz() {
        return this.z+this.depth/2;
    }

    add(box) {
        let left = Math.min(this.left, box.left);
        let top = Math.min(this.top, box.top);
        let front = Math.min(this.front, box.front);
        let right = Math.max(this.right, box.right);
        let bottom = Math.max(this.bottom, box.bottom);
        let back = Math.max(this.back, box.back);
        return new Box3D(left, top, front, right-left, bottom-top, back-front);
    }

    intersects(box) {
        return super.intersects(box) &&
            box.front < this.front &&
            box.back > this.back;
    }

    includes(box) {
        return super.includes(box) &&
            box.front > this.front &&
            box.back < this.back;
    }

    grow(increment) {
        return new Box3D(
            this.x-increment,
            this.y-increment,
            this.z-increment,
            this.width+increment*2,
            this.height+increment*2,
            this.depth+increment*2
        );
    }
}

export class Point2D {

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    getDistance(point) {
        return Math.sqrt((point.x-this.x)*(point.x-this.x)+(point.y-this.y)*(point.y-this.y));
    }

    equals(point) {
        return this.x===point.x && this.y===point.y;
    }

    duplicate() {
        return new Point3D(this.x, this.y);
    }
}

export class Point3D {

    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    getDistance(point) {
        return Math.sqrt(
            (point.x-this.x)*(point.x-this.x)+
            (point.y-this.y)*(point.y-this.y)+
            (point.z-this.z)*(point.z-this.z));
    }

    equals(point) {
        return this.x===point.x && this.y===point.y && this.z===point.z;
    }

    duplicate() {
        return new Point3D(this.x, this.y, this.z);
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
    return new Box2D(left, top, right-left, bottom-top);
}
