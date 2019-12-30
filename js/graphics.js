'use strict';

import {
    assert
} from "./misc.js";
import {
    List
} from "./collections.js";
import {
    Matrix, Box
} from "./geometry.js";

console.log("Svgbase loaded");

export let SVG_NS = "http://www.w3.org/2000/svg";
export let XLINK_NS = "http://www.w3.org/1999/xlink";

export let dom = {
    clientWidth(node) {
        return node.clientWidth;
    },
    clientHeight(node) {
        return node.clientHeight;
    },
    getBoundingClientRect(node) {
        return node.getBoundingClientRect();
    },
    getCTM(node) {
        return node.getCTM();
    },
    addEventListener(node, event, callback) {
        return node.addEventListener(event, callback);
    },
    removeEventListener(node, event, callback) {
        return node.removeEventListener(event, callback);
    }
};

export let doc = {
    createElement(type) {
        return document.createElement(type);
    },
    createElementNS(ns, type) {
        return document.createElementNS(ns, type);
    },
    createTextNode(data) {
        return document.createTextNode(data);
    },
    createDocumentFragment() {
        return document.createDocumentFragment();
    },
    addEventListener(event, callback) {
        return dom.addEventListener(document, event, callback);
    },
    removeEventListener(event, callback) {
        return dom.removeEventListener(document, event, callback);
    },
    querySelector(selectors) {
        return document.querySelector(selectors);
    },
    get documentElement() {
        return document.documentElement;
    },
    get body() {
        return document.body;
    },
    elementFromPoint(x, y) {
        return document.elementFromPoint(x, y);
    },
    dispatchEvent(event) {
        document.dispatchEvent(event);
    }
};

export let win = {
    get pageXOffset() {
        return window.pageXOffset;
    },
    get pageYOffset() {
        return window.pageYOffset;
    },
    setInterval(callback, delay, ...args) {
        return window.setInterval(callback, delay, ...args);
    },
    setTimeout(callback, delay, ...args) {
        return window.setTimeout(callback, delay, ...args);
    },
    addEventListener(event, callback) {
        return dom.addEventListener(window, event, callback);
    },
    removeEventListener(event, callback) {
        return dom.removeEventListener(window, event, callback);
    }
};

export function localOffset(svgNode) {
    let box = dom.getBoundingClientRect(svgNode._node);
    let body = doc.body;
    let html = doc.documentElement;
    let left = box.left + (win.pageXOffset || html.scrollLeft || body.scrollLeft);
    let top = box.top + (win.pageYOffset || html.scrollTop || body.scrollTop);
    return {
        x: -left,
        y: -top
    };
}

export function globalOffset(svgNode) {
    let box = dom.getBoundingClientRect(svgNode._node);
    return {
        x: box.left,
        y: box.top
    };
}

export function computeMatrix(from, to) {
    if (!from) console.log("from null !");
    if (!to) console.log("to null !");
    let matrix = to.matrix;
    let parent = to.parent;
    while (parent && parent!==from) {
        let pmatrix = parent._attrs.matrix;
        if (pmatrix) {
            matrix._multLeft(pmatrix);
        }
        parent = parent.parent;
    }
    if (!parent) console.log("from not included in to !");
    return parent ? matrix : null;
}

export function computePosition(source, target, x = 0, y = 0) {
    let sourceMatrix = source ? source.globalMatrix : null;
    let targetMatrix = target.globalMatrix;
    let finalMatrix = sourceMatrix
        ? sourceMatrix.multLeft(targetMatrix.invert())
        : targetMatrix.invert();
    let fx = finalMatrix.x(x, y);
    let fy = finalMatrix.y(x, y);
    return { x: fx, y: fy };
}

export function computeAngle(source, target) {
    let sourceMatrix = source ? source.globalMatrix : null;
    let targetMatrix = target.globalMatrix;
    let finalMatrix = sourceMatrix
        ? sourceMatrix.multLeft(targetMatrix.invert())
        : targetMatrix.invert();
    return finalMatrix.angle;
}

export let MouseEvents = {
    CLICK : "click",
    CONTEXT_MENU : "contextmenu",
    DOUBLE_CLICK : "dblclick",
    MOUSE_DOWN : "mousedown",
    MOUSE_ENTER : "mouseenter",
    MOUSE_LEAVE : "mouseleave",
    MOUSE_MOVE : "mousemove",
    MOUSE_OUT : "mouseout",
    MOUSE_OVER : "mouseover",
    MOUSE_UP : "mouseup",
    WHEEL : "wheel"
};

export let KeyboardEvents = {
    KEY_DOWN : "keydown",
    KEY_UP : "keyup",
    INPUT : "input"
};

export let Buttons = {
    LEFT_BUTTON : 0,
    WHEEL_BUTTON : 1,
    RIGHT_BUTTON : 2,
    FOURTH_BUTTON : 3,
    FIFTH_BUTTON : 4
};

export const Attrs = {
    CLASS : "class",
    STYLE : "style",
    X : "x",
    Y : "y",
    Z : "z",
    X1 : "x1",
    Y1 : "y1",
    X2 : "x2",
    Y2 : "y2",
    RX : "rx",
    RY : "ry",
    CX : "cx",
    CY : "cy",
    FX : "fx",
    FY : "fy",
    DX : "dx",
    DY : "dy",
    R : "r",
    D : "d",
    WIDTH : "width",
    HEIGHT : "height",
    HREF : "href",
    FILTER : "filter",
    ID : "id",
    TRANSFORM : "transform",
    OPACITY : "opacity",
    VISIBILITY : "visibility",
    STROKE : "stroke",
    STROKE_DASHARRAY : "stroke-dasharray",
    STROKE_DASHOFFSET : "stroke-dashoffset",
    STROKE_LINECAP : "stroke-linecap",
    STROKE_LINEJOIN : "stroke-linejoin",
    STROKE_MITERLIMIT : "stroke-miterlimit",
    STROKE_OPACITY : "stroke-opacity",
    STROKE_WIDTH : "stroke-width",
    TEXT_ANCHOR : "text-anchor",
    ALIGNMENT_BASELINE : "alignment-baseline",
    TEXT : "text",
    FONT_FAMILY : "font-family",
    FONT_SIZE : "font-size",
    FONT_STYLE : "font-style",
    FONT_VARIANT : "font-variant",
    FONT_WEIGHT : "font-weight",
    FONT_SIZE_ADJUST : "font-size-adjust",
    FONT_STRETCH : "font-stretch",
    FILL : "fill",
    FILL_OPACITY : "fill-opacity",
    CLIP_PATH : "clip-path",
    MASK : "mask",
    FILTERRES : "filterRes",
    FILTERUNITS : "filterUnits",
    PRIMITIVEUNITS : "primitiveUnits",
    COLOR_INTERPOLATION_FILTER: "color-interpolation-filters",
    STDDEVIATION : "stdDeviation",
    IN : "in",
    EDGEMODE : "edgeMode",
    FLOOD_COLOR : "flood-color",
    FLOOD_OPACITY : "flood-opacity",
    RESULT : "result",
    RADIUS : "radius",
    IN2 : "in2",
    SCALE : "scale",
    MODE : "mode",
    TYPE : "type",
    VALUES : "values",
    XCHANNELSELECTOR : "xChannelSelector",
    YCHANNELSELECTOR : "YChannelSelector",
    ORDER : "order",
    KERNELMATRIX : "kernelMatrix",
    DIVISOR : "divisor",
    BIAS : "bias",
    TARGETX : "targetX",
    TARGETY : "targetY",
    PRESERVEALPHA : "preserveAlpha",
    ATTRIBUTENAME : "attributeName",
    ATTRIBUTETYPE : "attributeType",
    FROM : "from",
    TO : "to",
    DUR : "dur",
    REPEATCOUNT : "repeatCount",
    BEGIN : "begin",
    END : "end",
    MIN : "min",
    MAX : "max",
    BY : "by",
    RESTART : "restart",
    REPEATDUR : "repeatDur",
    KEYTIMES : "keyTimes",
    KEYSPLINES : "keySplines",
    KEYFRAMES : "keyFrames",
    CALCMODE : "calcMode",
    ADDITIVE : "additive",
    ACCUMULATE : "accumulate",
    MOTION : "motion",
    PATH : "path",
    MPATH : "mpath",
    ROTATE : "rotate",
    TABLEVALUES : "tableValues",
    SLOPE : "slope",
    INTERCEPT : "intercept",
    AMPLITUDE : "amplitude",
    EXPONENT : "exponent",
    OFFSET : "offset",
    GRADIENTUNIT : "gradientUnit",
    SPREADMETHOD : "spreadMethod",
    GRADIENTTRANSFORM : "gradientTransform",
    STOP_COLOR : "stop-color",
    STOP_OPACITY : "stop-opacity",
    SURFACESCALE : "surfaceScale",
    LIGHTING_COLOR : "lighting-color",
    SPECULARCONSTANT : "specularConstant",
    SPECULAREXPONENT : "specularExponent",
    DIFFUSECONSTANT : "diffuseConstant",
    AZIMUTH : "azimuth",
    ELEVATION : "elevation",
    POINTSATX : "pointsAtX",
    POINTSATY : "pointsAtY",
    POINTSATZ : "pointsAtZ",
    LIMITINGCONEANGLE : "limitingOneAngle",
    BASEFREQUENCY : "baseFrequency",
    NUMOCTAVES : "numOctaves",
    SEED : "seed",
    STITCHTILES : "stitchTiles",
    PRESERVEASPECTRATIO : "preserveAspectRatio",
    CROSSORIGIN : "crossOrigin",
    OPERATOR : "operator"
};
Attrs.STROKE_PROPERTIES = {
    stroke:Attrs.STROKE,
    stroke_dasharray:Attrs.STROKE_DASHARRAY,
    stroke_dashoffset:Attrs.STROKE_DASHOFFSET,
    stroke_linecap:Attrs.STROKE_LINECAP,
    stroke_miterlimit:Attrs.STROKE_MITERLIMIT,
    stroke_width:Attrs.STROKE_MITERLIMIT
};
Attrs.FONT_PROPERTIES = {
    fill:Attrs.FILL,
    font_family:Attrs.FONT_FAMILY,
    font_size:Attrs.FONT_SIZE,
    font_style:Attrs.FONT_STYLE,
    font_variant:Attrs.FONT_VARIANT,
    font_weight:Attrs.FONT_WEIGHT,
    font_size_adjust:Attrs.FONT_SIZE_ADJUST,
    font_stretch:Attrs.FONT_STRETCH
};

export const Fill = {
    NONE : "none"
};

let Cache = {
    rasterImages : new Map(),
    rasterImageLoaders : new Map(),
    svgImages : new Map(),
    svgImageLoaders : new Map()
};

export function loadRasterImage(url, callback) {
    if (Cache.rasterImages.get(url)) {
        // forced timeout so that `callback` is always called asynchronously
        // even if the image is already in cache
        setTimeout(() => callback(Cache.rasterImages.get(url)), 0);
    } else {
        if (!Cache.rasterImageLoaders.get(url)) {
            Cache.rasterImageLoaders.set(url, new List());
            let img = new Image();
            img.onload = function() {
                Cache.rasterImages.set(url, img);
                for (let callback of Cache.rasterImageLoaders.get(url)) {
                    callback(img);
                }
            };
            img.src = url;
        }
        Cache.rasterImageLoaders.get(url).add(callback);
    }
}

win.httpRequest = function(url, postData, callback) {
    let req = new XMLHttpRequest();
    if (req) {
        if (typeof(postData)==="object") {
            let pd = [];
            for (let key in postData) {
                if (postData.hasOwnProperty(key)) {
                    pd.push(encodeURIComponent(key)+"="+encodeURIComponent(postData[key]));
                }
            }
            postData = pd.join("&");
        }
        req.open(postData ? "POST" : "GET", url, true);
        if (postData) {
            req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            req.setRequestHeader(
                "Content-type",
                "application/x-www-form-urlencoded"
            );
        }
        req.onreadystatechange = function() {
            if (req.readyState !== 4) return;
            callback(req);
        };
        if (req.readyState === 4) {
            return req;
        }
        req.send(postData);
        return req;
    }
};

export function svgParse(text) {
    let full = true;
    let div = doc.createElement("div");
    if (!text.match(/^\s*<\s*svg(?:\s|>)/)) {
        text = "<svg>" + text + "</svg>";
        full = false;
    }
    div.innerHTML = text;
    let svg = div.getElementsByTagName("svg")[0];
    if (svg) {
        if (full) {
            return svg;
        } else {
            let fragment = doc.createDocumentFragment();
            while (svg.firstChild) {
                matrixOp++;
                fragment.appendChild(svg.firstChild);
            }
            return fragment;
        }
    }
    return doc.createDocumentFragment();
}

export function loadSvgImage(url, callback) {
    function load(url, callback) {
        win.httpRequest(url, null, function(req) {
            if (req.status === 200) {
                var fragment = svgParse(req.responseText);
                callback(fragment);
            }
        });
    }

    if (Cache.svgImages.get(url)) {
        // forced timeout so that `callback` is always called asynchronously
        // even if the image is already in cache
        setTimeout(() => callback(Cache.svgImages.get(url)), 0);
    } else {
        if (!Cache.svgImageLoaders.get(url)) {
            Cache.svgImageLoaders.set(url, new List());
            load(url, function(fragment) {
                Cache.svgImages.set(url, fragment);
                for (let callback of Cache.svgImageLoaders.get(url)) {
                    callback(fragment);
                }
            });
        }
        Cache.svgImageLoaders.get(url).add(callback);
    }
}

export function rasterizeSvg(img, callback) {

    function getSize(node) {
        let width = node.getAttribute(Attrs.WIDTH);
        if (width) {
            width = parseInt(width);
            let height = node.getAttribute(Attrs.HEIGHT);
            if (height) return {width, height:parseInt(height)};
        }
        let viewBox = node.getAttribute("viewBox");
        if (viewBox) {
            viewBox = viewBox.split(' ');
            return {width:parseInt(viewBox[2]), height:parseInt(viewBox[3])};
        }
        console.assert(false);
    }

    let node =
        img instanceof DocumentFragment
            ? img.querySelector("svg")
            : img;
    let svgText = node.outerHTML;
    if (!svgText.match(/xmlns=\"/mi)){
        svgText = svgText.replace ('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ') ;
    }
    let svg = new Blob([svgText], {type: "image/svg+xml;charset=utf-8"});
    let url = URL.createObjectURL(svg);
    // create a canvas element to pass through
    let canvas = doc.createElement("canvas");
    let {width, height} = getSize(node);
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext("2d");
    // create a new image to hold it the converted type
    let rasterImage = new Image();
    // load the image
    rasterImage.src = url;
    // draw it to the canvas
    rasterImage.onload = function() {
        ctx.drawImage(this, 0, 0);
        let raster = doc.createElementNS(SVG_NS,'image');
        raster.setAttribute("height",""+width);
        raster.setAttribute("width", ""+height);
        raster.setAttributeNS(XLINK_NS, "href", canvas.toDataURL());
        raster.setAttribute("x","0");
        raster.setAttribute("y","0");
        callback(raster);
    }
}

export function loadRasterSvgImage(url, callback) {
    if (Cache.rasterImages.get(url)) {
        // forced timeout so that `loaded` is always called asynchronously
        // even if the image is in cache
        setTimeout(() => callback(Cache.rasterImages.get(url)), 0);
    } else {
        if (!Cache.rasterImageLoaders.get(url)) {
            Cache.rasterImageLoaders.set(url, new List());
            loadSvgImage(url, function(img) {
                rasterizeSvg(img, raster=> {
                    Cache.rasterImages.set(url, raster);
                    for (let callback of Cache.rasterImageLoaders.get(url)) {
                        callback(raster);
                    }
                });
            });
        }
        Cache.rasterImageLoaders.get(url).add(callback);
    }
}

export class Dimension {
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
    }

    toString() {
        return ""+this.value+this.unit;
    }
}

export function EM(value) {
    return new Dimension(value, "em");
}
export function PX(value) {
    return new Dimension(value, "px");
}
export function P100(value) {
    return new Dimension(value, "%");
}
export function EX(value) {
    return new Dimension(value, "ex");
}
export function CM(value) {
    return new Dimension(value, "cm");
}
export function MM(value) {
    return new Dimension(value, "mm");
}
export function PT(value) {
    return new Dimension(value, "pt");
}
export function IN(value) {
    return new Dimension(value, "in");
}
export function PC(value) {
    return new Dimension(value, "pc");
}

function defineProperty(clazz, name, get, set) {
    let attrName = name.replace("-", "_");
    clazz[attrName.toUpperCase()] = name;
    Object.defineProperty(clazz.prototype, attrName, {
        get, set
    });
}

function defineAnyProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            return this.attr(name);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value): this.attr(name, null);
        }
    );
}

// Testé
function defineDimensionProperty(clazz, name) {
    defineProperty(clazz, name,
        // Testé
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : value;
        },
        // Testé
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineStringProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value === undefined ? "" : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, value): this.attr(name, null);
        }
    );
}

function defineAttributeProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? "" : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, value.replace("_", "-")): this.attr(name, null);
        }
    );
}

function defineFloatProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : parseFloat(value);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineIntegerProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : parseInt(value);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value): this.attr(name, null);
        }
    );
}

function defineBooleanProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? false : value==="true";
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            value!==null ? this.attr(name, ""+value, value): this.attr(name, null);
        }
    );
}

function defineElementProperty(clazz, name, pattern="#ELEMENT") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (element) {
            if (element === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            element!==null ? this.attr(name, pattern.replace("ELEMENT", element.id), element) : this.attr(name, null);
        }
    );
}

function defineFloatListProperty(clazz, name, separator=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbers) {
            if (numbers === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbers!==null) {
                let list = numbers.join(separator);
                this.attr(name, list, numbers);
            }
            else this.attr(name, null);
        }
    );
}

function defineDimensionListProperty(clazz, name, separator) {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? 0 : value;
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (value!==null) {
                let list = value.join(separator);
                this.attr(name, list, value);
            }
            else this.attr(name, null);
        }
    );
}

function defineStringListProperty(clazz, name, separator=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbers) {
            if (numbers === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbers!==null) {
                let list = numbers.join(separator);
                this.attr(name, list, numbers);
            }
            else this.attr(name, null);
        }
    );
}

function defineListOfFloatListProperty(clazz, name, separator="; ", separator2=" ") {
    defineProperty(clazz, name,
        function () {
            let value = this.attr(name);
            return value===undefined ? null : value;
        },
        function (numbersArray) {
            if (numbersArray === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (numbersArray!==null) {
                let list = numbersArray.map(numbers => numbers.join(separator2)).join(separator);
                this.attr(name, list, numbersArray);
            }
            else this.attr(name, null);
        }
    );
}

function defineClockProperty(clazz, name) {
    defineProperty(clazz, name,
        function () {
            return this.attr(name);
        },
        function (value) {
            if (value === undefined) {
                throw TypeError("Attribute value must be defined");
            }
            if (value!==null) {
                if (typeof(value) === "number") {
                    this.attr(name, "" + value + "ms", value);
                }
                else {
                    this.attr(name, value);
                }
            }
            else this.attr(name, null);
        }
    );
}

function defineXYWidthHeightProperties(clazz) {
    defineDimensionProperty(clazz, Attrs.WIDTH);
    defineDimensionProperty(clazz, Attrs.HEIGHT);
    defineDimensionProperty(clazz, Attrs.X);
    defineDimensionProperty(clazz, Attrs.Y);
}

export function definePropertiesSet(prefix, properties) {
    let result = {};
    for (let property in properties) {
        result[prefix+"_"+property] = properties[property];
    }
    return result;
}

export function collectProperties(specs, properties) {
    let attrs = {};
    for (let property in properties) {
        let value = specs[property];
        if (value !== undefined) {
            attrs[properties[property]] = value;
        }
    }
    return attrs;
}

export function filterProperties(specs, properties) {
    let attrs = {};
    for (let property in properties) {
        let value = specs[property];
        if (value !== undefined) {
            attrs[property] = value;
        }
    }
    return attrs;
}

export const Visibility = {
    VISIBLE : "visible",
    HIDDEN : "hidden",
    COLLAPSE : "collapse"
};

let ref = 0;

export class DOMElement {

    constructor(type) {
        this.node(type);
        this._ref = ref++;
        this._attrs = {};
    }

    get ref() {
        return this._parent ? ""+this._ref+"-"+this._parent.ref : ""+this._ref;
    }

    clone(duplicata = new Map()) {
        let copy = duplicata.get(this);
        if (copy) return copy;
        copy = this._clone();
        duplicata.set(this, copy);
        // IMPORTANT: cloning == false (default) means deep cloning !
        if (!this.cloning) {
            this._cloneContent(copy, duplicata);
        }
        if (this.cloning!==undefined) {
            copy.cloning = this.cloning;
        }
        if (this.eventCloning) {
            this._cloneEvents(copy, duplicata);
        }
        return copy;
    }

    _clone() {
        let copy = {};
        copy.__proto__ = this.__proto__;
        copy.node(this._node.nodeName);
        copy._attrs = {};
        this._cloneAttrs(copy);
        return copy;
    }

    _cloneAttrs(copy) {
        copy.attrs(this._attrs);
        return this;
    }

    _cloneContent(copy, duplicata) {
        if (this._children) {
            for (let child of this._children) {
                copy.add(child.clone(duplicata));
            }
        }
    }

    _cloneEvents(copy, duplicata) {
        if (this._dnd) {
            copy.onDrag(this._dnd.dragStart, this._dnd.dragMove, this._dnd.dragDrop);
        }
        if (this._events) {
            for (let event of this._events.keys()) {
                for (let action of this._events.get(event)) {
                    copy.on(event, action);
                }
            }
        }
        return copy;
    }

    attr(name, nodeValue, value=nodeValue) {
        if (value && value.isNaN) {
            throw new TypeError("Attribute value cannot be NaN.");
        }
        if (value!==undefined) {
            if (value===null) {
                delete this._attrs[name];
                this._node.removeAttribute(name);
            }
            else {
                this._attrs[name] = value;
                this._node.setAttribute(name, nodeValue);
            }
            return this;
        }
        else {
            let attr = this._attrs[name];
            if (attr===undefined) {
                attr = this._node.getAttribute(name);
                this._attrs[name] = attr;
            }
            return attr;
        }
    }

    attrs(values) {
        function getPropertyDescriptor(proto, name) {
            let desc = Object.getOwnPropertyDescriptor(proto, name);
            return desc ? desc : proto.__proto__ ? getPropertyDescriptor(proto.__proto__, name) : null;
        }

        for (let name in values) {
            let desc = getPropertyDescriptor(this.__proto__, name);
            if (desc && desc.set) {
                this[name] = values[name];
            }
            else {
                let _name = name.replace("_", "-");
                this.attr(_name, values[_name]);
            }
        }
        return this;
    }

    get inDOM() {
        return this._parent && this._parent.inDOM;
    }

    _add(element) {
        this._node.appendChild(element._node);
    }

    _reset(element) {
        this._node.replaceChild(element._node, element._old);
    }

    _replace(oldElement, element) {
        this._node.replaceChild(element._node, oldElement._node);
    }

    _insert(beforeElement, element) {
        this._node.insertBefore(element._node, beforeElement._node);
    }

    _remove(element) {
        this._node.removeChild(element._node);
    }

    _clear() {
        this._node.innerHTML = '';
    }

    _register() {
        if (this._svg !== this._parent._svg) {
            this._svg = this._parent._svg;
            if (this._children) {
                for (let child of this._children) {
                    child._register();
                }
            }
            return true;
        }
        return false;
    }

    _unregister() {
        if (this._svg) {
            delete this._svg;
            if (this._children) {
                for (let child of this._children) {
                    child._unregister();
                }
            }
            return true;
        }
        return false;
    }

    add(element) {
        element.detach();
        if (!this._children) {
            this._children = new List();
        }
        this._children.add(element);
        matrixOp++;
        this._add(element);
        element._parent = this;
        element._register();
        return this;
    }

    reset(element) {
        if (element._parent!==this) {
            throw "Not a child."
        }
        matrixOp++;
        this._reset(element);
        return this;
    }

    replace(oldElement, element) {
        if (oldElement._parent!==this) {
            throw "Not a child."
        }
        if (this._children) {
            element.detach();
            this._children.replace(oldElement, element);
            matrixOp++;
            this._replace(oldElement, element);
            oldElement._parent = null;
            element._parent = this;
            oldElement._unregister();
            element._register();
        }
        return this;
    }

    insert(beforeElement, element) {
        if (beforeElement.parent!==this) {
            throw "Not a child."
        }
        if (this._children) {
            element.detach();
            this._children.insert(beforeElement, element);
            matrixOp++;
            this._insert(beforeElement, element);
            element._parent = this;
            element._register(this);
        }
        return this;
    }

    remove(element) {
        if (this._children) {
            this._children.remove(element);
            matrixOp++;
            element._unregister();
            this._remove(element);
            element._parent = null;
        }
        return this;
    }

    contains(element) {
        return this._children && this._children.contains(element);
    }

    clear() {
        if (this._children) {
            for (let child of this._children) {
                child._unregister();
                child._parent = null;
            }
            this._children.clear();
            matrixOp++;
            this._clear();
        }
        return this;
    }

    node(type) {
        if (type) {
            this._node = doc.createElement(type);
            this._node._owner = this;
        }
        return this._node;
    }

    get innerHTML() {
        return this._node.innerHTML;
    }

    set innerHTML(innerHTML) {
        this._node.innerHTML = innerHTML;
        this._children.clear();
    }

    get outerHTML() {
        return this._node.outerHTML;
    }

    on(event, action) {
        if (!this._events) {
            this._events = new Map();
        }
        let actions = this._events.get(event);
        if (!actions) {
            actions = new List();
            this._events.set(event, actions);
        }
        actions.add(action);
        dom.addEventListener(this._node, event, action);
        return this;
    }

    off(event, action) {
        let actions = this._events ? this._events.get(event) : null;
        if (actions) {
            if (actions.remove(action)) {
                if (actions.length===0) {
                    this._events.delete(event);
                    if (this._events.size === 0) {
                        delete this._events;
                    }
                }
                dom.removeEventListener(this._node, event, action);
            }
        }
        return this;
    }

    get parent() {return this._parent;}

    get children() {return this._children ? new List(...this._children) : new List();}

    get empty() {return !this._children || !this._children.length;}

    get child() {return this._children && this._children.length>0 ? this._children[0] : null }

    set child(element) {
        if (this._children && this._children.length>0) {
            this.replace(this._children[0], element);
        }
        else {
            this.add(element);
        }
    }

    attach(parent) {
        return parent.add(this);
    }

    detach() {
        if (this._parent) {
            this._unregister();
            return this._parent.remove(this);
        }
        return null;
    }

    memento() {
        let memento = {_attrs:{}};
        memento._target = this;
        for (let property in this._attrs) {
            if (this._attrs.hasOwnProperty(property)) {
                memento._attrs[property] = this._attrs[property];
            }
        }
        if (this._children) {
            memento._children = new List();
            for (let child of this._children) {
                memento._children.push(child.memento());
            }
        }
        memento._dnd = this._dnd;
        if (this._events) {
            memento._events = new Map();
            for (let event of this._events.keys()) {
                memento.events.set(event, [...this._events.get(event)]);
            }
        }
        return memento;
    }

    revert(memento) {
        this.attrs(memento._attrs);
        if (this._children) {
            for (let child of [...this._children]) {
                this.remove(child);
            }
        }
        if (memento._children) {
            for (let record of memento._children) {
                this.add(record._target);
                record._target.revert(record);
            }
        }
        this._dnd = memento._dnd;
        if (this._events) {
            for (let event of [...this._events.keys()]) {
                for (let action of [...this._events.get(event)]) {
                    this.off(event, action);
                }
            }
        }
        if (memento._events) {
            for (let event of memento._events.keys()) {
                for (let action of memento._events.get(event)) {
                    this.on(event, action);
                }
            }
        }
    }

    get owner() {
        let elem = this;
        while (elem) {
            if (elem._owner) return elem._owner;
            elem = elem.parent;
        }
        return null;
    };

}
defineStringProperty(DOMElement, Attrs.ID);
defineStringProperty(DOMElement, Attrs.CLASS);
defineStringProperty(DOMElement, Attrs.STYLE);

export class SVGElement extends DOMElement {

    constructor(type) {
        super(type);
    }

    node(type) {
        if (type) {
            this._node = doc.createElementNS(SVG_NS, type);
            this._node._owner = this;
        }
        return this._node;
    }

    onDrag(dragStart, dragMove, dragDrop) {
        if (this._dnd) this.offDrag();
        let dndMove;
        let dndDrop;
        this._dnd = {
            dragStart : dragStart,
            dragMove : dragMove,
            dragDrop : dragDrop,
            event: null,
            start : event=> {
                if (!event._drag) {
                    this._dnd.event = event;
                    dndMove = this._dnd.move;
                    dndDrop = this._dnd.drop;
                    if (this._node.setCapture) {
                        this._node.setCapture(true);
                    }
                    else {
                        doc.addEventListener(MouseEvents.MOUSE_MOVE, dndMove);
                        doc.addEventListener(MouseEvents.MOUSE_UP, dndDrop);
                    }
                    this.off(MouseEvents.MOUSE_DOWN, this._dnd.start);
                    this.on(MouseEvents.MOUSE_MOVE, dndMove);
                    this.on(MouseEvents.MOUSE_UP, dndDrop);
                    dragStart.call(this, event);
                    event.preventDefault();
                    event._drag = true;
                }
            },
            move : event=> {
                if (event.pageX!==this._dnd.event.pageX||event.pageY!==this._dnd.event.pageY) {
                    this._dnd.event = event;
                    dragMove.call(this, event);
                    event.preventDefault();
                }
            },
            drop : event=> {
                dragDrop.call(this, event);
                this._dnd && this.on(MouseEvents.MOUSE_DOWN, this._dnd.start);
                this.off(MouseEvents.MOUSE_MOVE, dndMove);
                this.off(MouseEvents.MOUSE_UP, dndDrop);
                doc.removeEventListener(MouseEvents.MOUSE_MOVE, dndMove);
                doc.removeEventListener(MouseEvents.MOUSE_UP, dndDrop);
                event.preventDefault();
            }
        };
        this.on(MouseEvents.MOUSE_DOWN, this._dnd.start);
    }

    offDrag() {
        if (this._dnd) {
            this.off(MouseEvents.MOUSE_DOWN, this._dnd.start);
            delete this._dnd;
        }
    }

    getElementFromPoint(x, y) {
        let offset = globalOffset(this);
        return SVGElement.getElementFromPoint(x+offset.x, y+offset.y);
    }

}
defineFloatProperty(SVGElement, Attrs.OPACITY);
defineStringProperty(SVGElement, Attrs.VISIBILITY);
defineStringProperty(SVGElement, Attrs.STROKE);
defineFloatListProperty(SVGElement, Attrs.STROKE_DASHARRAY);
defineFloatProperty(SVGElement, Attrs.STROKE_DASHOFFSET);
defineStringProperty(SVGElement, Attrs.STROKE_LINECAP);
defineStringProperty(SVGElement, Attrs.STROKE_LINEJOIN);
defineIntegerProperty(SVGElement, Attrs.STROKE_MITERLIMIT);
defineFloatProperty(SVGElement, Attrs.STROKE_OPACITY);
defineFloatProperty(SVGElement, Attrs.STROKE_WIDTH);
defineStringProperty(SVGElement, Attrs.FILL);
defineFloatProperty(SVGElement, Attrs.FILL_OPACITY);
defineElementProperty(SVGElement, Attrs.CLIP_PATH, "url(#ELEMENT)");
defineElementProperty(SVGElement, Attrs.MASK, "url(#ELEMENT)");

SVGElement.elementOn = function(node) {
    while (node) {
        if (node._owner) return node._owner;
        node = node.parentNode;
    }
    return null;
};

SVGElement.getElementFromPoint = function(x, y) {
    let node = doc.elementFromPoint(x, y);
    return SVGElement.elementOn(node);
};

export const Stroke = {
  NONE : "none",
  lineCap : {
      BUTT: "butt",
      ROUND: "round",
      SQUARE: "square"
  },
  lineJoin : {
      ARCS: "arcs",
      BEVELS: "bevel",
      MITER: "miter",
      MITER_CLIP: "miter-clip",
      ROUND: "round"
  }
};

let idGenerator = 1;

export class Defs extends SVGElement {
    // Testé
    constructor() {
        super("defs");
    }

    add(element) {
        let id = element.id;
        if (!id) {
            element.id = "ID"+idGenerator++;
        }
        super.add(element);
    }
}

class ZLayer {

    constructor(index, svg, beforeLayer) {
        this._index = index;
        this._node = doc.createElementNS(SVG_NS, "g");
        this._node._owner = svg;
        if (beforeLayer) {
            svg._node.insertBefore(this._node, beforeLayer._node);
        }
        else {
            svg._node.appendChild(this._node);
        }
        this._children = new List();
    }

    _getInheritedAttribute(element, attrName) {
        while (element) {
            let attr = element._attrs[attrName];
            if (attr) {
                return attr;
            }
            element = element._parent;
        }
        return null;
    }

    update() {
        if (this._index) {
            for (let element of this._children) {
                if (element._parent) {
                    element._zMatrix = element._parent.globalMatrix;
                    //let style = window.getComputedStyle(element._parent._node);
                    if (element._attrs.visibility===null || element._attrs.visibility===undefined) {
                        let visibility = this._getInheritedAttribute(element._parent, Attrs.VISIBILITY);
                        element._node.setAttribute(Attrs.VISIBILITY, visibility);
                    }
                }
            }
        }
    }

    add(element) {
        this._node.appendChild(element._node);
        this._children.add(element);
    }

    reset(element) {
        this._node.replaceChild(element._node, element._old);
    }

    replace(oldElement, element) {
        this._node.replaceChild(element.node, oldElement._node);
        this._children.replace(oldElement, element);
    }

    insert(beforeElement, element) {
        this._node.insertChildBefore(element.node, beforeElement._node);
        this._children.insert(beforeElement, element);
    }

    remove(element) {
        this._node.removeChild(element._node);
        this._children.remove(element);
    }

    get empty() {
        return !this._children.length;
    }

}

export class Svg extends SVGElement {

    constructor(width, height) {
        super("svg");
        this.attr("xmlns", SVG_NS);
        this.attr("xmlns:xlink", XLINK_NS);
        width && (this.width = width);
        height && (this.height = height);
        this._layers = new List();
        this._createZLayer(0);
        this.defs = new Defs();
        this._node.appendChild(this.defs._node);
        this.defs._parent = this;
        this._svg = this;
        this._mutationObserver = new MutationObserver(()=>this._updateLayers());
        this._mutationConfig = { childList: true, attributes: true, subtree:true };
        this._mutationObserver.observe(this._node, this._mutationConfig);
    }

    _updateLayers() {
        this._mutationObserver.disconnect();
        for (let index of this._layers.indexes()) {
            this._layers[parseInt(index)].update();
        }
        this._mutationObserver.observe(this._node, this._mutationConfig);
    }

    _createZLayer(index) {
        let beforeLayer;
        if (index<this._layers.length) {
            for (let next of this._layers.indexes()) {
                let nextIndex = parseInt(next);
                if (nextIndex > index) {
                    beforeLayer = this._layers[nextIndex];
                    break;
                }
            }
        }
        let layer = new ZLayer(index, this, beforeLayer);
        layer._parent = this;
        this._layers[index] = layer;
    }

    get _zOrder() {
        return 0;
    }

    _putOnLayer(element, index) {
        if (!this._layers[index]) {
            this._createZLayer(index);
        }
        this._layers[index].add(element); // TODO ? Manage order ?
        element._zMatrix = element._parent ? element._parent.globalMatrix : null;
    }

    _removeFromLayer(element, index) {

        function reinsertInRightLocation(element) {
            if (element._parent) {
                let index = element._parent._children.indexOf(element);
                while(element._parent._children[index].parentNode !== element._parent._node
                && index<element._parent._children.length - 1) {
                    index++;
                }
                if (index === element._parent._children.length - 1) {
                    element._parent._node.appendChild(element._node);
                }
                else {
                    let before = element._parent._children[index];
                    element._parent._node.insertBefore(element._node, before._node);
                }
            }
        }

        assert(this._layers[index]);
        this._layers[index].remove(element);
        // To re-insert in the right place.
        reinsertInRightLocation(element);
        assert(this._layers[index]);
        if (this._layers[index].empty) {
            delete this._layers[index];
        }
        element._zMatrix = null;
    }

        /*
        get globalMatrix() {
            return new Matrix();
        }
        */

    attach(node) {
        matrixOp++;
        node.appendChild(this._node);
        return this;
    }

    get inDOM() {
        return true;
    }

    addDef(element) {
        this.defs.add(element);
        return this;
    }

    removeDef(element) {
        this.defs.remove(element);
        return this;
    }

    get clientWidth() {
        return dom.clientWidth(this._node);
    }

    get clientHeight() {
        return dom.clientHeight(this._node);
    }

    _add(element) {
        this._layers[0].add(element);
    }

    _reset(element) {
        this._layers[0].reset(element, element);
    }

    _replace(oldElement, element) {
        this._layers[0].replace(element, oldElement);
    }

    _insert(beforeElement, element) {
        this._layers[0].insert(element, beforeElement);
    }

    _remove(element) {
        this._layers[0].remove(element);
    }

    _clear() {
        this._layers[0]._node.innerHTML = '';
    }

}
defineDimensionProperty(Svg, Attrs.WIDTH);
defineDimensionProperty(Svg, Attrs.HEIGHT);

let matrixOp = 0;

export const Cursor = {
    ALIAS: "alias",
    ALL_SCROLL: "all-scroll",
    AUTO: "auto",
    CELL: "cell",
    CONTEXT_MENU: "context-menu",
    COL_RESIZE: "col-resize",
    COPY: "copy",
    CROSSHAIR: "crosshair",
    DEFAULT: "default",
    E_RESIZE: "e-resize",
    EW_RESIZE: "ew-resize",
    GRAB: "grab",
    GRABBING: "grabbing",
    HELP: "help",
    MOVE: "move",
    N_RESIZE: "n-resize",
    NE_RESIZE: "ne-resize",
    NESW_RESIZE: "nesw-resize",
    NS_RESIZE: "ns-resize",
    NW_RESIZE: "nw-resize",
    NWSE_RESIZE: "nwse-resize",
    NO_DROP: "no-drop",
    NONE: "none",
    NOT_ALLOWED: "not-allowed",
    POINTER: "pointer",
    PROGRESS: "progress",
    ROW_RESIZE: "row-resize",
    S_RESIZE: "s-resize",
    SE_RESIZE: "se-resize",
    SW_RESIZE: "sw-resize",
    TEXT: "text",
    URL: "URL",
    VERTICAL_TEXT: "vertical-text",
    W_RESIZE: "w-resize",
    WAIT: "wait",
    ZOOM_IN: "zoom-in",
    ZOOM_OUT: "zoom-out",
    INITIAL: "initial",
    INHERIT: "inherit"
};

export class SVGCoreElement extends SVGElement {

    constructor(type) {
        super(type);
    }

    get _matrix() {
        return this._attrs.matrix;
    }

    get matrix() {
        let matrix = this._matrix;
        if (matrix===undefined) {
            matrix = new Matrix();
        }
        return matrix;
    }

    set _zMatrix(zMatrix) {
        matrixOp++;
        if (zMatrix) {
            this.__zMatrix = zMatrix;
        }
        else {
            delete this.__zMatrix;
        }
        let matrix = this._matrix;
        if (matrix) {
            let fMatrix = this.__zMatrix ? this.__zMatrix.mult(matrix) : matrix;
            this.attr(Attrs.TRANSFORM, fMatrix.toString());
        }
        else {
            this.attr(Attrs.TRANSFORM, this.__zMatrix);
        }
    }

    set _matrix(matrix) {
        matrixOp++;
        if (matrix) {
            this._attrs.matrix = matrix;
            let fMatrix = this.__zMatrix ? this.__zMatrix.mult(matrix) : matrix;
            this.attr(Attrs.TRANSFORM, fMatrix.toString());
        }
        else {
            delete this._attrs.matrix;
            this.attr(Attrs.TRANSFORM, this.__zMatrix?this.__zMatrix:null);
        }
    }

    set matrix(matrix) {
        this._matrix = matrix;
    }

    get globalMatrix() {
        if (!this._globalMatrix || this._globalMatrix.op!==matrixOp) {
            let globalMatrix = dom.getCTM(this._node);
            //let globalMatrix = this._parent ? this._matrix ? this._parent.globalMatrix.mult(this._matrix) : this._parent.globalMatrix : this.matrix;
            this._globalMatrix = new Matrix(
                globalMatrix.a, globalMatrix.b,
                globalMatrix.c, globalMatrix.d,
                globalMatrix.e, globalMatrix.f);
            this._globalMatrix.op = matrixOp;
        }
        return this._globalMatrix;
    }

    get z_index() {
        return this._attrs.z_index;
    }

    set z_index(zIndex) {
        assert(zIndex===undefined || zIndex>=0);
        let zOrder = this._zOrder;
        if (this._zOrder !== zIndex) {
            this._unregister();
        }
        if (zIndex!==undefined) {
            this._attrs.z_index = zIndex;
        }
        else {
            delete this._attrs.z_index;
        }
        if (this._zOrder !== zIndex) {
            this._register();
        }
    }

    _register() {
        if (this._parent && this._svg !== this._parent._svg) {
            let z_index = this.z_index;
            this._zOrder = z_index !== undefined ? z_index : this._parent._zOrder;
            if (z_index!==undefined && this._parent._svg && this._zOrder !== this._parent._zOrder) {
                this._parent._node.removeChild(this._node);
                this._parent._svg._putOnLayer(this, this._zOrder);
            }
            super._register();
            return true;
        }
        return false;
    }

    _unregister() {
        if (this._svg) {
            let svg = this._svg;
            super._unregister();
            if (svg && this._parent && this._zOrder !== this._parent._zOrder) {
                svg._removeFromLayer(this, this._zOrder);
                this._parent._node.appendChild(this._node);
            }
            delete this._zOrder;
            return true;
        }
        return false;
    }

    get bbox() {
        return this._node.getBBox();
    }

    get gbox() {
        let bbox = this._node.getBBox();
        let p1 = this.local2global(bbox.x, bbox.y);
        let p2 = this.local2global(bbox.x+bbox.width, bbox.y);
        let p3 = this.local2global(bbox.x+bbox.width, bbox.y+bbox.height);
        let p4 = this.local2global(bbox.x, bbox.y+bbox.height);
        let minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        let maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        let minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        let maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
        return {
            x: minX,
            y: minY,
            width: maxX-minX,
            height: maxY-minY
        }
    }

    global2local(x, y) {
        let imatrix = this.globalMatrix.invert();
        return {
            x: imatrix.x(x, y),
            y: imatrix.y(x, y)
        }
    }

    local2global(x, y) {
        let gmatrix = this.globalMatrix;
        return {
            x: gmatrix.x(x, y),
            y: gmatrix.y(x, y)
        }
    }

    get cursor() {
        return this._node.style.cursor;
    }

    set cursor(cursor) {
        this._node.style.cursor = cursor;
    }

}

export class Group extends SVGCoreElement {
    constructor(matrix=null) {
        super("g");
        matrix && (this.matrix = matrix);
    }
}
defineElementProperty(Group, Attrs.FILTER, "url(#ELEMENT)");

// Testé
export class Translation extends Group {
    // Testé
    constructor(dx=0, dy=0) {
        super();
        this.set(dx, dy);
    }

    // Testé
    set(dx, dy) {
        this._attrs.dx = dx;
        this._attrs.dy = dy;
        this.matrix = Matrix.translate(dx, dy);
        return this;
    }

    // Testé
    move(dx, dy) {
        this._attrs.dx += dx;
        this._attrs.dy += dy;
        this.matrix = Matrix.translate(this._attrs.dx, this._attrs.dy);
        return this;
    }

    _cloneAttrs(copy) {
        let attrs = Object.assign({}, this._attrs);
        delete attrs.dx;
        delete attrs.dy;
        copy.attrs(attrs);
        return this;
    }

    // Testé
    get dx() {
        return this._attrs.dx;
    }

    // Testé
    get dy() {
        return this._attrs.dy;
    }
}

// Testé
export class Rotation extends Group {
    // Testé
    constructor(a, cx=0, cy=0) {
        super();
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.angle = a;
    }

    // Testé
    center(cx, cy) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.matrix = Matrix.rotate(this._attrs.angle, cx, cy);
        return this;
    }

    // Testé
    get angle() {
        return this._attrs.angle;
    }

    // Testé
    set angle(angle) {
        this._attrs.angle = angle;
        this.matrix = Matrix.rotate(angle, this._attrs.cx, this._attrs.cy);
        return this;
    }

    // Testé
    get cx() {
        return this._attrs.cx;
    }

    // Testé
    get cy() {
        return this._attrs.cy;
    }
}

// Testé
export class Scaling extends Group {
    //Testé
    constructor(sx, sy, cx=0, cy=0) {
        super();
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.scale(sx, sy);
    }

    // Testé
    center(cx, cy) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this.matrix = Matrix.scale(this._attrs.sx, this._attrs.sy, cx, cy);
        return this;
    }

    // Testé
    scale(sx, sy) {
        this._attrs.sx = sx;
        this._attrs.sy = sy;
        this.matrix = Matrix.scale(sx, sy, this._attrs.cx, this._attrs.cy);
    }

    // Testé
    get cx() {
        return this._attrs.cx;
    }

    // Testé
    get cy() {
        return this._attrs.cy;
    }

    // Testé
    get scalex() {
        return this._attrs.sx;
    }

    // Testé
    get scaley() {
        return this._attrs.sy;
    }
}

// Testé
export class ClipPath extends SVGElement {

    // Testé
    constructor(id) {
        super("clipPath");
        this.id = id;
    }

}

export class Mask extends SVGElement {

    constructor(id, x, y, width, height) {
        super("mask");
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

}
defineXYWidthHeightProperties(Mask);

// Testé
export class Shape extends SVGCoreElement {
    // Testé
    constructor(type) {
        super(type);
    }
}
// Testé
defineElementProperty(Shape, Attrs.FILTER, "url(#ELEMENT)");

// Testé
export class Rect extends Shape {
    // Testé
    constructor(x=0, y=0, width=100, height=100) {
        super("rect");
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}
// Testé
defineXYWidthHeightProperties(Rect);
// Testé
defineDimensionProperty(Rect, Attrs.RX);
// Testé
defineDimensionProperty(Rect, Attrs.RY);

// Testé
export class Circle extends Shape {
    // Testé
    constructor(cx=0, cy=0, r) {
        super("circle");
        this.cx = cx;
        this.cy = cy;
        this.r = r;
    }
}
// Testé
defineDimensionProperty(Circle, Attrs.CX);
// Testé
defineDimensionProperty(Circle, Attrs.CY);
// Testé
defineDimensionProperty(Circle, Attrs.R);

// Testé
export class Ellipse extends Shape {
    // Testé
    constructor(cx=0, cy=0, rx, ry) {
        super("ellipse");
        this.cx = cx;
        this.cy = cy;
        this.rx = rx;
        this.ry = ry;
    }
}
// Testé
defineDimensionProperty(Ellipse, Attrs.CX);
// Testé
defineDimensionProperty(Ellipse, Attrs.CY);
// Testé
defineDimensionProperty(Ellipse, Attrs.RX);
// Testé
defineDimensionProperty(Ellipse, Attrs.RY);

// Testé
export class Line extends Shape {
    // Testé
    constructor(x1, y1, x2, y2) {
        super("line");
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}
// Testé
defineDimensionProperty(Line, Attrs.X1);
// Testé
defineDimensionProperty(Line, Attrs.Y1);
// Testé
defineDimensionProperty(Line, Attrs.X2);
// Testé
defineDimensionProperty(Line, Attrs.Y2);

// Testé
export class Polyshape extends Shape {
    // Testé
    constructor(type, points) {
        super(type);
        this.points = points;
    }

    // Testé
    get points() {
        let points = this._attrs.points;
        return points ? points : new List();
    }

    // Testé
    set points(points) {
        this._attrs.points = points;
        let def = "";
        for (let point of points) {
            if (def.length) def+=" ";
            def+=point[0]+","+point[1];
        }
        this._node.setAttribute("points", def);
        return this;
    }
}

// Testé
export class Polygon extends Polyshape {
    // Testé
    constructor(...points) {
        super("polygon", points);
    }
}

// Testé
export class Polyline extends Polyshape {
    // Testé
    constructor(...points) {
        super("polyline", points);
    }
}

export class MovetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "M "+this.x+" "+this.y;
    }
}
export function M(x, y) {
    return new MovetoDirective(x, y);
}

export class RelativeMovetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "m "+this.x+" "+this.y;
    }
}
export function m(x, y) {
    return new RelativeMovetoDirective(x, y);
}

export class LinetoDirective {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return "L "+this.x+" "+this.y;
    }
}
export function L(x, y) {
    return new LinetoDirective(x, y);
}

export class RelativeLinetoDirective {
    constructor(x, y) {
        assert(!isNaN(x)&&!isNaN(y));
        this.x = x;
        this.y = y;
    }

    toString() {
        return "l "+this.x+" "+this.y;
    }
}
export function l(x, y) {
    return new RelativeLinetoDirective(x, y);
}

export class HorizontalDirective {
    constructor(x) {
        assert(!isNaN(x));
        this.x = x;
    }

    toString() {
        return "H "+this.x;
    }
}
export function H(x) {
    return new HorizontalDirective(x);
}

export class RelativeHorizontalDirective {
    constructor(x) {
        assert(!isNaN(x));
        this.x = x;
    }

    toString() {
        return "h "+this.x;
    }
}
export function h(x) {
    return new RelativeHorizontalDirective(x);
}

export class VerticalDirective {
    constructor(y) {
        assert(!isNaN(y));
        this.y = y;
    }

    toString() {
        return "V "+this.y;
    }
}
export function V(y) {
    return new VerticalDirective(y);
}

export class RelativeVerticalDirective {
    constructor(y) {
        assert(!isNaN(y));
        this.y = y;
    }

    toString() {
        return "v "+this.y;
    }
}
export function v(y) {
    return new RelativeVerticalDirective(y);
}

export class CloseDirective {
    constructor() {
    }

    toString() {
        return "Z";
    }
}
export function Z() {
    return new CloseDirective();
}

export class CurveToDirective {
    constructor(x1, y1, x2, y2, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "C "+this.x1+","+this.y1+" "+this.x2+","+this.y2+" "+this.x+","+this.y;
    }
}
export function C(x1, y1, x2, y2, x, y) {
    return new CurveToDirective(x1, y1, x2, y2, x, y);
}

export class RelativeCurveToDirective {
    constructor(x1, y1, x2, y2, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "c "+this.x1+","+this.y1+" "+this.x2+","+this.y2+" "+this.x+","+this.y;
    }
}
export function c(x1, y1, x2, y2, x, y) {
    return new RelativeCurveToDirective(x1, y1, x2, y2, x, y);
}

export class ShorthandCurveToDirective {
    constructor(x2, y2, x, y) {
        assert(!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "S "+this.x2+","+this.y2+" "+this.x+","+this.y;
    }
}
export function S(x2, y2, x, y) {
    return new ShorthandCurveToDirective(x2, y2, x, y);
}

export class RelativeShorthandCurveToDirective {
    constructor(x2, y2, x, y) {
        assert(!isNaN(x2)&&!isNaN(y2)&&!isNaN(x)&&!isNaN(y));
        this.x2 = x2;
        this.y2 = y2;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "s "+this.x2+","+this.y2+" "+this.x+","+this.y;
    }
}
export function s(x2, y2, x, y) {
    return new RelativeShorthandCurveToDirective(x2, y2, x, y);
}

export class QuadraticBezierDirective {
    constructor(x1, y1, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "Q "+this.x1+","+this.y1+" "+this.x+","+this.y;
    }
}
export function Q(x1, y1, x, y) {
    return new QuadraticBezierDirective(x1, y1, x, y);
}

export class RelativeQuadraticBezierDirective {
    constructor(x1, y1, x, y) {
        assert(!isNaN(x1)&&!isNaN(y1)&&!isNaN(x)&&!isNaN(y));
        this.x1 = x1;
        this.y1 = y1;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "q "+this.x1+","+this.y1+" "+this.x+","+this.y;
    }
}
export function q(x1, y1, x, y) {
    return new RelativeQuadraticBezierDirective(x1, y1, x, y);
}

export class EllipticArcDirective {
    constructor(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.rx = rx;
        this.ry = ry;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "A "+this.rx+" "+this.ry+" "+this.xAxisRotation+" "+this.largeArcFlag+" "+this.sweepFlag+" "+this.x+" "+this.y;
    }
}
export function A(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
    return new EllipticArcDirective(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
}

export class RelativeEllipticArcDirective {
    constructor(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
        this.rx = rx;
        this.ry = ry;
        this.xAxisRotation = xAxisRotation;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
        this.x = x;
        this.y = y;
    }

    toString() {
        return "a "+this.rx+" "+this.ry+" "+this.xAxisRotation+" "+this.largeArcFlag+" "+this.sweepFlag+" "+this.x+" "+this.y;
    }
}
export function a(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y) {
    return new RelativeEllipticArcDirective(rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
}

export function defineDirectiveProperty(clazz, name) {
    defineProperty(clazz, name,
        function() {
            let d = this._attrs.d;
            return d ? d : new List();
        },
        function(directives) {
            this._attrs.d = directives;
            let def = "";
            for (let directive of directives) {
                if (def.length) def+=", ";
                def+=directive;
            }
            this._node.setAttribute(Attrs.D, def);
            return this;
        }
    );
}
export class Path extends Shape {
    constructor(...directives) {
        super("path", directives);
        this.d = directives;
    }
}
defineDirectiveProperty(Path, "d");

export const TextAnchor = {
    START : "start",
    MIDDLE : "middle",
    END : "end",
    INHERIT : "inherit"
};

export const AlignmentBaseline = {
    NONE : "none",
    AUTO : "auto",
    BASELINE : "baseline",
    BEFORE_EDGE : "before-edge",
    TEXT_BEFORE_EDGE : "text-before-edge",
    MIDDLE : "middle",
    CENTRAL : "central",
    AFTER_EDGE : "after-edge",
    TEXT_AFTER_EDGE : "text-after-edge",
    IDEOGRAPHIC : "ideographic",
    ALPHABETIC : "alphabetic",
    HANGING : "hanging",
    MATHEMATICAL : "mathematical",
    TOP : "top",
    CENTER : "center",
    BOTTOM : "bottom"
};

export const FontStyle = {
    NORMAL : "normal",
    ITALIC : "italic",
    OBLIQUE : "oblique",
    INHERIT : "inherit"
};

export const FontStretch = {
    NORMAL : "normal",
    WIDER : "wider",
    NARROWER : "narrower",
    ULTRA_CONDENSED : "ultra-condensed",
    EXTRA_CONDENSED : "extra-condensed",
    CONDENSED : "condensed",
    SEMI_CONDENSED : "semi-condensed",
    SEMI_EXPANDED : "semi-expanded",
    EXPANDED : "expanded",
    EXTRA_EXPANDED : "extra-expanded",
    ULTRA_EXPANDED : "ultra-expanded",
    INHERIT : "inherit"
};

export const FontSize = {
    INHERIT : "inherit"
};

export const FontSizeAdjust = {
    NONE: "none",
    INHERIT : "inherit"
};

export const FontVariant = {
    NORMAL : "normal",
    SMALL_CAPS : "small-caps",
    INHERIT : "inherit"
};

export const FontWeight = {
    NORMAL : "normal",
    BOLD : "bold",
    BOLDER : "bolder",
    LIGHTER : "lighter",
    W100 : 100,
    W200 : 200,
    W300 : 300,
    W400 : 400,
    W500 : 500,
    W600 : 600,
    W700 : 700,
    W800 : 800,
    W900 : 900,
    INHERIT : "inherit"
};

export class TextItem extends Shape {
    constructor(type, x, y, text) {
        super(type);
        this.x = x;
        this.y = y;
        this.text = text;
    }

    get text() {
        let text = this._attrs.text;
        if (text===undefined) {
           let textNode = Array.from(this._node.childNodes)
               .find(node=>node.nodeType===Node.TEXT_NODE);
           if (textNode) {
               text = textNode.nodeValue;
               this._attrs.text = text;
           }
        }
        return text;
    }

    set text(text) {
        this._attrs.text = text;
        let textNode = Array.from(this._node.childNodes)
            .find(node=>node.nodeType===Node.TEXT_NODE);
        if (!textNode) {
            textNode = doc.createTextNode(text);
            matrixOp++;
            this._node.appendChild(textNode);
        }
        else {
            textNode.nodeValue = text;
        }
    }

    _clone() {
        let copy = super._clone();
        copy.text = this.text;
        return copy;
    }

}
defineStringProperty(TextItem, Attrs.TEXT_ANCHOR);
defineStringProperty(TextItem, Attrs.ALIGNMENT_BASELINE);
defineDimensionProperty(TextItem, Attrs.X);
defineDimensionProperty(TextItem, Attrs.Y);
defineFloatProperty(TextItem, Attrs.ROTATE);
defineStringProperty(TextItem, Attrs.FONT_FAMILY);
defineAnyProperty(TextItem, Attrs.FONT_SIZE);
defineStringProperty(TextItem, Attrs.FONT_STYLE);
defineStringProperty(TextItem, Attrs.FONT_VARIANT);
defineAnyProperty(TextItem, Attrs.FONT_WEIGHT);
defineAnyProperty(TextItem, Attrs.FONT_SIZE_ADJUST);
defineStringProperty(TextItem, Attrs.FONT_STRETCH);

export class Tspan extends TextItem {
    constructor(x, y, text) {
        super("tspan", x, y, text);
    }
}
defineDimensionProperty(Tspan, Attrs.DX);
defineDimensionProperty(Tspan, Attrs.DY);

export class Text extends TextItem {
    constructor(x, y, text) {
        super("text", x, y, text);
    }
}

export const AspectRatio = {
    NONE: "none"
};

export class RasterImage extends Shape {

    constructor(url, x=0, y=0, width=0, height=0) {
        super();
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href=url;
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.preserveAspectRatio = AspectRatio.NONE;
        if (!width || !height) {
            this.node("g");
            loadRasterImage(url, raster=>{
               this._setImage(raster, width, height)
            });
        }
        else {
            this._build();
        }
    }

    // Testé
    _build() {
        this.node("image");
        this.attrs(this._attrs);
    }

    _setImage(raster, width, height) {
        if (!width || !height) {
            if (!height) {
                height = raster.height * width / raster.width;
            } else if (!width) {
                width = raster.width * height / raster.height;
            } else {
                let factor = Math.min(width / raster.width, height / raster.height);
                width = raster.width * factor;
                height = raster.height * factor;
            }
        }
        else {
            width = raster.width;
            height = raster.height;
        }
        this._old = this._node;
        this._attrs.width = width;
        this._attrs.height = height;
        this._build();
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _clone() {
        let copy = super._clone();
        loadRasterImage(this.href, raster=> {
            copy._setImage(raster, this.width, this.height);
        });
        return copy;
    }

    get href() {
        return this._attrs.href;
    }
}
// Partiel
defineXYWidthHeightProperties(RasterImage);

export class ClippedRasterImage extends Shape {

    constructor(url, cx, cy, cw, ch, x=0, y=0, width=0, height=0) {
        super();
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href=url;
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this._attrs.cw = cw;
        this._attrs.ch = ch;
        this._attrs.preserveAspectRatio = AspectRatio.NONE;
        this.node("g");
        this.setImage();
    }

    _build(rasterImage, cx, cy, cw, ch) {
        let canvas = doc.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(rasterImage, cx, cy, cw, ch, 0, 0, cw, ch);
        this.node('image');
        this._node.setAttributeNS(XLINK_NS, "href", canvas.toDataURL());
        this.attrs({
            x: this._attrs.x,
            y: this._attrs.y,
            width: this._attrs.width,
            height: this._attrs.height
        });
    }

    setImage() {
        loadRasterImage(this._attrs.href, raster=>{
            this._setImage(raster,
                this._attrs.cx, this._attrs.cy,
                this._attrs.cw, this._attrs.ch,
                this._attrs.width, this._attrs.height)
        });
    }

    _setImage(raster, cx, cy, cw, ch, width, height) {
        if (!width || !height) {
            if (width) {
                height = ch * width / cw;
            } else if (height) {
                width = cw * height / ch;
            } else {
                width = cw;
                height = ch;
            }
        }
        this._old = this._node;
        this._attrs.width = width;
        this._attrs.height = height;
        this._build(raster, cx, cy, cw, ch);
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _clone() {
        let copy = super._clone();
        loadRasterImage(this.href, raster=> {
            copy._setImage(raster,
                this._attrs.cx, this._attrs.cy,
                this._attrs.cw, this._attrs.ch,
                this._attrs.width, this._attrs.height);
        });
        return copy;
    }

    get href() {
        return this._attrs.href;
    }

    set href(href) {
        this._attrs.href = href;
        this.setImage();
    }

    clip(cx, cy, cw, ch) {
        this._attrs.cx = cx;
        this._attrs.cy = cy;
        this._attrs.cw = cw;
        this._attrs.ch = ch;
        this.setImage();
    }

}
// Partiel
defineXYWidthHeightProperties(ClippedRasterImage);

// Testé
export class SvgImage extends Shape {

    // Testé
    constructor(url, x = 0, y = 0, width = 0, height = 0) {
        super();
        this.node("g");
        this._sizer = doc.createElementNS(SVG_NS, "g");
        matrixOp++;
        this._node.appendChild(this._sizer);
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.width = width;
        this._attrs.height = height;
        this._attrs.href = url;
        loadSvgImage(url, img=>this._setImage(img));
    }

    // Testé
    _setImage(img) {
        function createImage(image) {
            let node =
                image instanceof DocumentFragment
                    ? image.querySelector("svg")
                    : image;
            let svg = node.cloneNode(true);
            let viewBox = svg.getAttribute("viewBox");
            let width = svg.getAttribute("width");
            let height = svg.getAttribute("height");
            if (viewBox) {
                let viewBoxValues = viewBox.split(" ");
                (!width && viewBox) && (width = parseFloat(viewBoxValues[2]));
                (!height && viewBox) && (height = parseFloat(viewBoxValues[3]));
                viewBox && svg.removeAttribute("viewBox");
            }
            width && svg.setAttribute("width", width);
            height && svg.setAttribute("height", height);
            return svg;
        }

        this._svg = createImage(img);
        this._sizeImage(this.width, this.height);
        this._posImage(this.x, this.y);
        matrixOp++;
        this._sizer.appendChild(this._svg);
    }

    // Testé
    _clone() {
        let copy = super._clone();
        copy._sizer = doc.createElementNS(SVG_NS, "g");
        matrixOp++;
        copy._node.appendChild(this._sizer);
        this._cloneAttrs(copy);
        return copy;
    }

    // Testé
    _cloneAttrs(copy) {
        copy._attrs.x = this._attrs.x;
        copy._attrs.y = this._attrs.y;
        copy._attrs.width = this._attrs.width;
        copy._attrs.height = this._attrs.height;
        copy._attrs.href = this._attrs.href;
        return copy;
    }

    // Testé
    _cloneContent(copy) {
        super._cloneContent(copy);
        loadSvgImage(this.href, img=>copy._setImage(img));
        return copy;
    }

    _posImage(x, y) {
        this._attrs.x = x;
        this._attrs.y = y;
        this._node.setAttribute(Attrs.TRANSFORM, Matrix.translate(x, y));
    }

    _sizeImage(width, height) {
        let imgWidth = this._svg.getAttribute("width");
        let imgHeight = this._svg.getAttribute("height");
        this._attrs.width = width ? width : imgWidth;
        this._attrs.height = height ? height : imgHeight;
        let sx = this._attrs.width/imgWidth;
        let sy = this._attrs.height/imgHeight;
        this._sizer.setAttribute(Attrs.TRANSFORM, Matrix.scale(sx, sy, 0, 0).toString());
    }

    get x() {
        return this._attrs.x;
    }

    set x(x) {
        this._posImage(x, this.y);
    }

    get y() {
        return this._attrs.y;
    }

    set y(y) {
        this._posImage(this.x, y);
    }

    get width() {
        return this._attrs.width;
    }

    set width(width) {
        this._sizeImage(width, this.height);
    }

    get height() {
        return this._attrs.height;
    }

    set height(height) {
        this._sizeImage(this.width, height);
    }

    // testé
    get href() {
        return this._attrs.href;
    }
}

export class SvgRasterImage extends Shape {

    constructor(url, x=0, y=0, width=0, height=0) {
        super("g");
        this._attrs.x = x;
        this._attrs.y = y;
        this._attrs.width = width;
        this._attrs.height = height;
        this._url = url;
        loadRasterSvgImage(url, raster=> {
            this._setImage(raster);
        })
    }

    _setImage(raster) {
        this._old = this._node;
        this._node = raster.cloneNode(true);
        this.attrs(this._attrs);
        if (this.parent) {
            this.parent.reset(this);
        }
    }

    _cloneContent(copy) {
        super._cloneContent(copy);
        copy._url = this._url;
        loadRasterSvgImage(this._url, raster=> {
            copy._setImage(raster);
        });
        return this;
    }
}
defineXYWidthHeightProperties(SvgRasterImage);

// Testé
export class FilterElement extends SVGElement {
    // Testé
    constructor(type) {
        super(type);
    }
}
// Testé
defineStringProperty(FilterElement, Attrs.RESULT);
// Testé
defineXYWidthHeightProperties(FilterElement);
// Testé
defineStringProperty(FilterElement, Attrs.IN);

export const FeIn = {
  SOURCEGRAPHIC : "SourceGraphic",
  SOURCEALPHA : "SourceAlpha",
  BACKGROUNDIMAGE : "BackgroundImage",
  BACKGROUNDALPHA : "BackgroundAlpha",
  FILLPAINE : "FillPaint",
  STROKEPAINT : "StrokePaint"
};
export const FeEdgeMode = {
  NONE : "none",
  DUPLICATE : "duplicate",
  WRAP : "wrap"
};

// Testé
export class FeGaussianBlur extends FilterElement {
    // Testé
    constructor() {
        super("feGaussianBlur")
    }
}
// Testé
defineFloatListProperty(FeGaussianBlur, Attrs.STDDEVIATION);
// Testé
defineStringProperty(FeGaussianBlur, Attrs.EDGEMODE);

export class FeDropShadow extends FilterElement {
    constructor() {
        super("feDropShadow")
    }
}
defineFloatListProperty(FeDropShadow, Attrs.STDDEVIATION);
defineFloatProperty(FeDropShadow, Attrs.DX);
defineFloatProperty(FeDropShadow, Attrs.DY);
defineStringProperty(FeDropShadow, Attrs.FLOOD_COLOR);
defineFloatProperty(FeDropShadow, Attrs.FLOOD_OPACITY);

export const FeOperator = {
    ERODE : "erode",
    DILATE: "dilate"
};
export class FeMorphology extends FilterElement {
    constructor() {
        super("feMorphology")
    }
}
defineFloatListProperty(FeMorphology, Attrs.RADIUS);

export const FeScaleSelector = {
    R : "R",
    G : "G",
    B : "B",
    A : "A"
};
export class FeDisplacementMap extends FilterElement {
    constructor() {
        super("feDisplacementMap")
    }
}
defineStringProperty(FeDisplacementMap, Attrs.IN2);
defineFloatProperty(FeDisplacementMap, Attrs.SCALE);
defineStringProperty(FeDisplacementMap, Attrs.XCHANNELSELECTOR);
defineStringProperty(FeDisplacementMap, Attrs.YCHANNELSELECTOR);

export const FeBlendMode = {
    NORMAL: "normal",
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity"
};
export class FeBlend extends FilterElement {
    constructor() {
        super("feBlend")
    }
}
defineStringProperty(FeBlend, Attrs.IN2);
defineStringProperty(FeBlend, Attrs.MODE);

export const FeColorMatrixType = {
    MATRIX : "matrix",
    SATURATE : "saturate",
    HUEROTATE : "hueRotate",
    LUMINANCETOALPHA :"luminanceToAlpha"
};
export class FeColorMatrix extends FilterElement {
    constructor() {
        super("feColorMatrix")
    }
}
defineStringProperty(FeColorMatrix, Attrs.IN2);
defineStringProperty(FeColorMatrix, Attrs.TYPE);
defineIntegerProperty(FeColorMatrix, Attrs.VALUES);

export class FeConvolveMatrix extends FilterElement {
    constructor() {
        super("feConvolveMatrix")
    }
}
defineFloatListProperty(FeConvolveMatrix, Attrs.ORDER);
defineFloatListProperty(FeConvolveMatrix, Attrs.KERNELMATRIX);
defineFloatProperty(FeConvolveMatrix, Attrs.DIVISOR);
defineFloatProperty(FeConvolveMatrix, Attrs.BIAS);
defineFloatProperty(FeConvolveMatrix, Attrs.TARGETX);
defineFloatProperty(FeConvolveMatrix, Attrs.TARGETY);
defineStringProperty(FeConvolveMatrix, Attrs.EDGEMODE);
defineBooleanProperty(FeConvolveMatrix, Attrs.PRESERVEALPHA);

export const FuncColorType = {
    IDENTITY : "identity",
    TABLE : "table",
    DISCRETE : "discrete",
    LINEAR : "linear",
    GAMMA : "gamma"
};
export class FeFuncColor extends SVGElement {
    constructor(type) {
        super(type);
    }
}
defineStringProperty(FeFuncColor, Attrs.TYPE);
defineFloatListProperty(FeFuncColor, Attrs.TABLEVALUES);
defineFloatProperty(FeFuncColor, Attrs.SLOPE);
defineFloatProperty(FeFuncColor, Attrs.INTERCEPT);
defineFloatProperty(FeFuncColor, Attrs.AMPLITUDE);
defineFloatProperty(FeFuncColor, Attrs.EXPONENT);
defineFloatProperty(FeFuncColor, Attrs.OFFSET);

export class FeFuncR extends FeFuncColor {
    constructor() {
        super("feFuncR");
    }
}
export class FeFuncG extends FeFuncColor {
    constructor() {
        super("feFuncG");
    }
}
export class FeFuncB extends FeFuncColor {
    constructor() {
        super("feFuncB");
    }
}
export class FeFuncA extends FeFuncColor {
    constructor() {
        super("feFuncA");
    }
}

export class FeComponentTransfer extends FilterElement {
    constructor() {
        super("feComponentTransfer")
    }

    add(element) {
        if (!element instanceof FeFuncColor) {
            throw "Not a funcColor element";
        }
        return super.add(element);
    }
}

export class FeLight extends SVGElement {
    constructor(type) {
        super(type)
    }
}

export class FeDistantLight extends FeLight {
    constructor() {
        super("feDistantLight")
    }
}
defineFloatProperty(FeDistantLight, Attrs.AZIMUTH);
defineFloatProperty(FeDistantLight, Attrs.ELEVATION);

export class FePointLight extends FeLight {
    constructor() {
        super("fePointLight")
    }
}
defineFloatProperty(FePointLight, Attrs.X);
defineFloatProperty(FePointLight, Attrs.Y);
defineFloatProperty(FePointLight, Attrs.Z);

export class FeSpotLight extends FeLight {
    constructor() {
        super("feSpotLight")
    }
}
defineFloatProperty(FeSpotLight, Attrs.X);
defineFloatProperty(FeSpotLight, Attrs.Y);
defineFloatProperty(FeSpotLight, Attrs.Z);
defineFloatProperty(FeSpotLight, Attrs.POINTSATX);
defineFloatProperty(FeSpotLight, Attrs.POINTSATY);
defineFloatProperty(FeSpotLight, Attrs.POINTSATZ);
defineFloatProperty(FeSpotLight, Attrs.SPECULAREXPONENT);
defineFloatProperty(FeSpotLight, Attrs.LIMITINGCONEANGLE);

export class FeLighting extends FilterElement {
    constructor(type) {
        super(type)
    }

    add(element) {
        if (!element instanceof FeLight) {
            throw "Not a light element";
        }
        return super.add(element);
    }
}
defineFloatProperty(FeLighting, Attrs.SURFACESCALE);
defineStringProperty(FeLighting, Attrs.LIGHTING_COLOR);

export class FeFlood extends FilterElement {
    constructor() {
        super("feFlood")
    }
}
defineStringProperty(FeFlood, Attrs.FLOOD_COLOR);
defineFloatProperty(FeFlood, Attrs.FLOOD_OPACITY);

export class FeSpecularLighting extends FeLighting {
    constructor() {
        super("feSpecularLighting")
    }
}
defineFloatProperty(FeSpecularLighting, Attrs.SPECULARCONSTANT);
defineFloatProperty(FeSpecularLighting, Attrs.SPECULAREXPONENT);

export class FeDiffuseLighting extends FeLighting {
    constructor() {
        super("feDiffuseLighting")
    }
}
defineFloatProperty(FeDiffuseLighting, Attrs.DIFFUSECONSTANT);

export const TurbulenceType = {
    FRACTALNOISE : "fractalNoise",
    TURBULENCE : "turbulence"
};
export const StitchTiles = {
    STITCH : "stitch",
    NOSTITCH : "noStitch"
};
export class FeTurbulence extends FilterElement {
    constructor() {
        super("feTurbulence")
    }
}
defineStringProperty(FeTurbulence, Attrs.TYPE);
defineFloatListProperty(FeTurbulence, Attrs.BASEFREQUENCY, " ");
defineFloatProperty(FeTurbulence, Attrs.NUMOCTAVES);
defineFloatProperty(FeTurbulence, Attrs.SEED);
defineFloatProperty(FeTurbulence, Attrs.STITCHTILES);

export const AspectRatios = {
    XMINYMIN : "xMinYMin",
    XMINYMID : "xMinYMid",
    XMINYMAX : "xMinYMax",
    XMIDYMIN : "xMidYMin",
    XMIDYMID : "xMidYMid",
    XMIDYMAX : "xMindYMax",
    XMAXYMIN : "xMaxYMin",
    XMAXYMID : "xMaxYMid",
    XMAXYMAX : "xMaxYMax"
};
export const MeetOrSliceRatios = {
    MEET : "meet",
    SLICE : "slice"
};
export const CrossOrigins = {
    ANONYMOUS : "anonymous",
    USE_CREDENTIALS : "use-credentials"
};
export class FeImage extends FilterElement {
    constructor() {
        super("feImage")
    }
}
defineStringListProperty(FeImage, Attrs.PRESERVEASPECTRATIO);
defineStringProperty(FeImage, Attrs.CROSSORIGIN);
defineStringProperty(FeImage, Attrs.HREF);

export class FeTile extends FilterElement {
    constructor() {
        super("feTile")
    }
}

export class FeOffset extends FilterElement {
    constructor() {
        super("feOffset")
    }
}
defineDimensionProperty(FeOffset, Attrs.DX);
defineDimensionProperty(FeOffset, Attrs.DY);

export const Operators = {
  OVER : "over",
  IN : "in",
  OUT : "out",
  ATOP : "atop",
  XOR : "xor",
  LIGHTER : "lighter",
  ARITHMETIC : "arithmetic"
};
export class FeComposite extends FilterElement {
    constructor() {
        super("feComposite")
    }
}
defineStringProperty(FeComposite, Attrs.OPERATOR);
defineStringProperty(FeComposite, Attrs.IN2);

export class FeMergeMode extends SVGElement {
    constructor() {
        super("feMergeMode")
    }
}
defineStringProperty(FeMergeMode, Attrs.IN);

export class FeMerge extends FilterElement {
    constructor() {
        super("feMerge")
    }

    add(element) {
        if (!(element instanceof FeMergeMode)) {
            throw "Child is not a mege mode."
        }
        super.add(element);
    }
}

export let FilterUnits = {
    USERSPACEONUSE : "userSpaceOnUse",
    OBJECTBOUNDINGBOX: "objectBoundingBox"
};
export let ColorInterpolationFilters = {
    AUTO:"auto",
    SRGB:"sRGB",
    LINEARRGB:"linearRGB"
};
// Partiel
export class Filter extends SVGElement {
    // Testé
    constructor() {
        super("filter");
    }

    // Partiel
    add(element) {
        // Non testé
        if (!element instanceof FilterElement) {
            throw "Not a filter element";
        }
        return super.add(element);
    }
}
// Testé
defineXYWidthHeightProperties(Filter);
defineElementProperty(Filter, Attrs.HREF);
defineFloatListProperty(Filter, Attrs.FILTERRES);
// Testé
defineStringProperty(Filter, Attrs.FILTERUNITS);
// Testé
defineStringProperty(Filter, Attrs.PRIMITIVEUNITS);
// Ne fonctionne pas sur chrome ?
defineStringProperty(Filter, Attrs.COLOR_INTERPOLATION_FILTER);

export class ForeignObject extends SVGElement {
    constructor(x, y, width, height) {
        super("foreignObject");
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    get innnerHTML() {
        return this._node.innerHTML;
    }

    set innerHTML(innerHTML) {
        this._node.innerHTML = innerHTML;
    }

    addNode(node) {
        matrixOp++;
        this._node.appendChild(node);
        return this;
    }
}
defineXYWidthHeightProperties(ForeignObject);

export const AttributeType = {
    XML : "XML",
    CSS : "CSS",
    AUTO : "auto"
};
export const AnimationFill = {
    FREEZE : "freeze",
    REMOVE : "remove"
};
export const AnimationRestart = {
    ALWAYS : "always",
    WHENNOTACTIVE : "whenNotActive",
    NEVER : "never"
};
export const CalcMode = {
    LINEAR : "linear",
    PACED : "paced",
    DISCRETE : "discrete",
    SPLINE : "spline"
};
export const Additive = {
    SUM : "sum",
    REPLACE : "replace"
};
export const Accumulate = {
    SUM : "sum",
    NONE : "none"
};
export class AbstractAnimate extends SVGElement {
    constructor(type) {
        super(type);
        this.events = new Map();
    }

    on(event, callback) {
        let callbacks = this.events.get(event);
        if (!callbacks) {
            callbacks = new List();
            this.events.set(event, callbacks);
            callbacks.add(callback);
            this._node["on"+event]= event => {
                for (let callback of callbacks) {
                    callback.call(this, event);
                }
            }
        }
    }

    off(event, callback) {
        let callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.remove(callback);
        }
    }

    get keyFrames() {
        let values = this.attrs[Attrs.VALUES];
        let times = this.attrs[Attrs.KEYTIMES];
        let splines = this.attrs[Attrs.KEYSPLINES];
        let length = values ? values.length : times ? times.length : 0;
        let frames = [];
        for (let index=0; index<length; index++) {
            let frame = {};
            values && (frame.value = values[index]);
            times && (frame.time = times[index]);
            splines && (frame.spline = splines[index]);
        }
        return frames;
    }

    set keyFrames(frames) {
        let values=[];
        let times=[];
        let splines=[];
        for (let frame of frames) {
            frame.value!==undefined && values.push(frame.value);
            frame.time!==undefined && times.push(frame.time);
            frame.spline!==undefined && splines.push(frame.spline);
        }
        if (values.length) this.attrs[Attrs.VALUES] = values; else delete this.attrs[Attrs.VALUES];
        if (times.length) this.attrs[Attrs.KEYTIMES] = values; else delete this.attrs[Attrs.KEYTIMES];
        if (splines.length) this.attrs[Attrs.KEYSPLINES] = values; else delete this.attrs[Attrs.KEYSPLINES];
    }
}
defineElementProperty(AbstractAnimate, Attrs.HREF);
defineAttributeProperty(AbstractAnimate, Attrs.ATTRIBUTENAME);
defineStringProperty(AbstractAnimate, Attrs.ATTRIBUTETYPE);
defineClockProperty(AbstractAnimate, Attrs.DUR);
defineClockProperty(AbstractAnimate, Attrs.MIN);
defineClockProperty(AbstractAnimate, Attrs.MAX);
defineAnyProperty(AbstractAnimate, Attrs.REPEATCOUNT);
defineStringProperty(AbstractAnimate, Attrs.FILL);
defineStringProperty(AbstractAnimate, Attrs.BEGIN);
defineStringProperty(AbstractAnimate, Attrs.END);
defineStringProperty(AbstractAnimate, Attrs.RESTART);
defineClockProperty(AbstractAnimate, Attrs.REPEATDUR);
defineFloatListProperty(AbstractAnimate, Attrs.VALUES, "; ");
defineFloatListProperty(AbstractAnimate, Attrs.KEYTIMES, "; ");
defineListOfFloatListProperty(AbstractAnimate, Attrs.KEYSPLINES, "; ", " ");
defineStringProperty(AbstractAnimate, Attrs.CALCMODE);
defineStringProperty(AbstractAnimate, Attrs.ADDITIVE);
defineStringProperty(AbstractAnimate, Attrs.ACCUMULATE);

export class Animate extends AbstractAnimate {
    constructor() {
        super("animate");
    }
}
Animate.INDEFINITE = "indefinite";
defineDimensionProperty(Animate, Attrs.FROM);
defineDimensionProperty(Animate, Attrs.TO);
defineDimensionProperty(Animate, Attrs.BY);

export const MotionRotate = {
    AUTO : "auto",
    AUTO_REVERSE : "auto-reverse"
};
export class AnimateMotion extends AbstractAnimate {
    constructor() {
        super("animateMotion");
    }
}
defineDirectiveProperty(AnimateMotion, Attrs.PATH);
defineElementProperty(AnimateMotion, Attrs.MPATH);
defineAnyProperty(AnimateMotion, Attrs.ROTATE);

export const TransformType = {
    TRANSLATE : "translate",
    SCALE : "scale",
    ROTATE : "rotate",
    SKEWX : "skewX",
    SKEWY : "skewY"
};
export class AnimateTransform extends AbstractAnimate {
    constructor() {
        super("animateTransform");
    }
}
defineStringProperty(AnimateTransform, Attrs.TYPE);
defineFloatListProperty(AnimateTransform, Attrs.FROM, " ");
defineFloatListProperty(AnimateTransform, Attrs.TO, " ");
defineFloatListProperty(AnimateTransform, Attrs.BY, " ");

export const GradientUnit = {
    USERSPACEONUSE : "userSpaceOnUse",
    OBJECTBOUNDINGBOX : "objectBoundingBox"
};
export const SpreadMethod = {
    PAD : "pad",
    REPEAT : "repeat",
    REFLECT : "reflect"
};
export class GradientStop extends SVGElement {
    constructor() {
        super("stop");
    }
}
defineDimensionProperty(GradientStop, Attrs.OFFSET);
defineStringProperty(GradientStop, Attrs.STOP_COLOR);
defineStringProperty(GradientStop, Attrs.STOP_OPACITY);

export class Gradient extends SVGElement {
    constructor(type) {
        super(type);
    }

    add(element) {
        if (!element instanceof GradientStop) {
            throw "Not a gradient stop element";
        }
        return super.add(element);
    }
}
defineStringProperty(Gradient, Attrs.GRADIENTUNIT);
defineStringProperty(Gradient, Attrs.SPREADMETHOD);
defineStringProperty(Gradient, Attrs.GRADIENTTRANSFORM);
defineElementProperty(Gradient, Attrs.HREF);

export class LinearGradient extends Gradient {
    constructor() {
        super("linearGradient");
    }
}
defineDimensionProperty(LinearGradient, Attrs.X1);
defineDimensionProperty(LinearGradient, Attrs.Y1);
defineDimensionProperty(LinearGradient, Attrs.X2);
defineDimensionProperty(LinearGradient, Attrs.Y2);

export class RadialGradient extends Gradient {
    constructor() {
        super("radialGradient");
    }
}
defineDimensionProperty(RadialGradient, Attrs.CX);
defineDimensionProperty(RadialGradient, Attrs.CY);
defineDimensionProperty(RadialGradient, Attrs.R);
defineDimensionProperty(RadialGradient, Attrs.FX);
defineDimensionProperty(RadialGradient, Attrs.FY);

export const Colors = {
    NONE: "none",
    INHERIT : "inherit",
    CRIMSON: "#dc143c",
    DARKEST_GREY: "#303030",
    DARK_GREY: "#505050",
    GREY: "#808080",
    LIGHT_GREY: "#C0C0C0",
    MIDDLE_GREY: "#A0A0A0",
    LIGHTEST_GREY: "#ECECEC",
    BLACK: "#0F0F0F",
    RED: "#F00F0F",
    BLUE: "#0F0FF0",
    GREEN: "#0FF00F",
    WHITE: "#FFFFFF"
};

export function l2m(matrix, ...points) {
    let result = [];
    for (let index=0; index<points.length; index+=2) {
        let x = points[index];
        let y = points[index+1];
        result.push(matrix.x(x, y), matrix.y(x, y));
    }
    return result;
}

export function l2l(sourceMatrix, targetMatrix, ...points) {
    let matrix = sourceMatrix.multLeft(targetMatrix.invert());
    return l2m(matrix, ...points);
}

export const Mutation = {
    CHILDLIST : "childlist",
    ATTRIBUTES : "attributes"
};
