'use strict';

import {
    describe, it, before, assert, defer
} from "./test-toolkit.js";
import {
    getDOMOrder, getDOMPosition,
    ClipPath, Mask, Rect, Circle, Ellipse, Line, Svg, Group, Translation, Rotation, Scaling, Pack,
    Path, M, m, L, l, H, h, V, v, Q, q, C, c, S, s,
    Polygon, Polyline, RasterImage, ClippedRasterImage, SvgImage, SvgRasterImage,
    MouseEvents, Colors, Visibility, FeGaussianBlur, Filter, P100,
    FilterUnits, FeEdgeMode, FeIn
} from "../js/graphics.js";
import {
    Matrix2D
} from "../js/geometry.js";

function mouse(evType, target, x, y) {
    let eventSpecs = {bubbles:true, clientX:x, clientY:y};
    let event = new MouseEvent(evType, eventSpecs);
    target._node.dispatchEvent(event);
}

describe("Basic SVG Objects", ()=> {

    let svg;

    before(()=> {
        document.body.innerHTML='';
        svg = new Svg(2000, 1000)
            .anchor(document.body);
    });

    it("Creates an SVG", ()=>{
        assert(document.body.innerHTML)
            .equalsTo('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="2000" height="1000">' +
                '<defs></defs>' +
                '<g></g>' +
                '</svg>')
    });

    it ("Inserts something (a rect) in SVG", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        assert(document.body.innerHTML)
            .equalsTo('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="2000" height="1000">' +
                '<defs></defs>' +
                '<g>' +
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '</g>' +
                '</svg>');
    });

    it ("Shows a rect", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        assert(rect.outerHTML)
            .equalsTo('<rect x="10" y="20" width="100" height="200"></rect>');
        rect.x = 20;
        rect.y = 30;
        rect.width = 90;
        rect.height = 190;
        assert(rect.outerHTML)
            .equalsTo('<rect x="20" y="30" width="90" height="190"></rect>');
        assert(rect.x).equalsTo(20);
        assert(rect.y).equalsTo(30);
        assert(rect.width).equalsTo(90);
        assert(rect.height).equalsTo(190);
        rect.rx = 3;
        rect.ry = 5;
        assert(rect.outerHTML)
            .equalsTo('<rect x="20" y="30" width="90" height="190" rx="3" ry="5"></rect>');
        assert(rect.rx).equalsTo(3);
        assert(rect.ry).equalsTo(5);
        assert(rect.bbox).objectEqualsTo({x:20, y:30, width:90, height:190});
    });

    it ("Shows a circle", ()=>{
        let circle = new Circle(100, 150, 50);
        svg.add(circle);
        assert(circle.outerHTML).equalsTo('<circle cx="100" cy="150" r="50"></circle>');
        circle.r = 90;
        circle.cx = 110;
        circle.cy = 120;
        assert(circle.outerHTML).equalsTo('<circle cx="110" cy="120" r="90"></circle>');
        assert(circle.r).equalsTo(90);
        assert(circle.cx).equalsTo(110);
        assert(circle.cy).equalsTo(120);
        assert(circle.bbox).objectEqualsTo({x:20, y:30, width:180, height:180});
    });

    it ("Shows an ellipse", ()=>{
        let ellipse = new Ellipse(100, 150, 50, 60);
        svg.add(ellipse);
        assert(ellipse.outerHTML).equalsTo('<ellipse cx="100" cy="150" rx="50" ry="60"></ellipse>');
        ellipse.rx = 90;
        ellipse.ry = 80;
        ellipse.cx = 110;
        ellipse.cy = 120;
        assert(ellipse.outerHTML).equalsTo('<ellipse cx="110" cy="120" rx="90" ry="80"></ellipse>');
        assert(ellipse.rx).equalsTo(90);
        assert(ellipse.ry).equalsTo(80);
        assert(ellipse.cx).equalsTo(110);
        assert(ellipse.cy).equalsTo(120);
        assert(ellipse.bbox).objectEqualsTo({x:20, y:40, width:180, height:160});
    });

    it ("Shows a line", ()=>{
        let line = new Line(10, 20, 110, 120);
        line.stroke = Colors.BLACK;
        svg.add(line);
        assert(line.outerHTML).equalsTo('<line x1="10" y1="20" x2="110" y2="120" stroke="#0F0F0F"></line>');
        line.x1 = 30;
        line.y1 = 40;
        line.x2 = 130;
        line.y2 = 140;
        assert(line.outerHTML).equalsTo('<line x1="30" y1="40" x2="130" y2="140" stroke="#0F0F0F"></line>');
        assert(line.x1).equalsTo(30);
        assert(line.y1).equalsTo(40);
        assert(line.x2).equalsTo(130);
        assert(line.y2).equalsTo(140);
        assert(line.bbox).objectEqualsTo({x:30, y:40, width:100, height:100});
    });

    it ("Shows a polygon", ()=>{
        let poly = new Polygon([50, 10], [90, 50], [10, 50]);
        svg.add(poly);
        assert(poly.outerHTML).equalsTo('<polygon points="50,10 90,50 10,50"></polygon>');
        poly.points = [[50, 50], [90, 10], [10, 10]];
        assert(poly.outerHTML).equalsTo('<polygon points="50,50 90,10 10,10"></polygon>');
        assert(poly.points).arrayEqualsTo([[50, 50], [90, 10], [10, 10]]);
        assert(poly.bbox).objectEqualsTo({x:10, y:10, width:80, height:40});
    });

    it ("Shows a polyline", ()=>{
        let poly = new Polyline([50, 10], [90, 50], [10, 50]);
        svg.add(poly);
        assert(poly.outerHTML).equalsTo('<polyline points="50,10 90,50 10,50"></polyline>');
        poly.points = [[50, 50], [90, 10], [10, 10]];
        assert(poly.outerHTML).equalsTo('<polyline points="50,50 90,10 10,10"></polyline>');
        assert(poly.points).arrayEqualsTo([[50, 50], [90, 10], [10, 10]]);
        assert(poly.bbox).objectEqualsTo({x:10, y:10, width:80, height:40});
    });

    it ("Shows a rasterized image", (done)=>{
        let image = new RasterImage("images/home.png");
        svg.add(image);
        assert(svg.innerHTML).equalsTo('<defs></defs><g><g></g></g>');
        defer(()=>{
            assert(svg.innerHTML).equalsTo(
                '<defs></defs><g><image width="40" height="40" href="images/home.png" x="0" y="0" preserveAspectRatio="none"></image></g>');
            done();
        }, 50);
    });

    it ("Shows a svg image", (done)=>{
        let image = new SvgImage("images/comments_on.svg", 100, 100, 80, 80);
        svg.add(image);
        assert(svg.innerHTML).equalsTo('<defs></defs><g><g><g></g></g></g>');
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g transform="matrix(1 0 0 1 100 100)">' +
                '<g transform="matrix(2 0 0 2 0 0)">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><title>Henry-icons</title>');
            done();
        }, 50);
    });

    it ("Shows a rasterized svg image", (done)=>{
        let image = new SvgRasterImage("images/comments_on.svg", 100, 100, 80, 80);
        svg.add(image);
        assert(svg.innerHTML).equalsTo('<defs></defs><g><g></g></g>');
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image height="80" width="80" xlink:href="data:image/png;base64,');
            done();
        }, 50);
    });

    it ("Creates a group", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let group = new Group();
        svg.add(group.add(rect));
        assert(svg.innerHTML).equalsTo('<defs></defs><g><g><rect x="10" y="20" width="100" height="200"></rect></g></g>');
    });

    it ("Uses a translation", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        let group = new Translation(30, 40);
        svg.add(group.add(rect));
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(1 0 0 1 30 40)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.set(20, 50);
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(1 0 0 1 20 50)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.move(10, 15);
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(1 0 0 1 30 65)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        assert(group.dx).equalsTo(30);
        assert(group.dy).equalsTo(65);
    });

    it ("Uses a rotation", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        let group = new Rotation(90, 50, 60);
        svg.add(group.add(rect));
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0 1 -1 0 110 10)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.angle = -90;
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0 -1 1 0 -10 110)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.center(60, 70);
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0 -1 1 0 -10 130)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        assert(group.angle).equalsTo(-90);
        assert(group.cx).equalsTo(60);
        assert(group.cy).equalsTo(70);
    });

    it ("Uses a scaling", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        let group = new Scaling(0.5, 0.5, 100, 150);
        svg.add(group.add(rect));
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0.5 0 0 0.5 50 75)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.scale(0.25, 0.75);
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0.25 0 0 0.75 75 37.5)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        group.center(60, 70);
        assert(group.outerHTML).equalsTo(
            '<g transform="matrix(0.25 0 0 0.75 45 17.5)"><rect x="10" y="20" width="100" height="200"></rect></g>');
        assert(group.scalex).equalsTo(0.25);
        assert(group.scaley).equalsTo(0.75);
        assert(group.cx).equalsTo(60);
        assert(group.cy).equalsTo(70);
    });

    it ("Checks innerHTML and outerHTML properties", ()=>{
        svg.innerHTML = '<rect x="10" y="20" width="100" height="200"></rect>';
        assert(svg.outerHTML)
            .equalsTo('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
                ' width="2000" height="1000">' +
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '</svg>');
        assert(svg.innerHTML)
            .equalsTo('<rect x="10" y="20" width="100" height="200"></rect>');
        assert(svg.children.length).equalsTo(0);
    });

    it ("Checks container methods", ()=>{
        let group = new Group();
        svg.add(group);
        let rect = new Rect(10, 20, 100, 200);
        group.add(rect);
        let circle = new Circle(100, 150, 50);
        group.add(circle);
        assert(group.innerHTML)
            .equalsTo(
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '<circle cx="100" cy="150" r="50"></circle>'
            );
        assert(group.children).hasContent(rect, circle);
        assert(rect.parent).equalsTo(group);
        assert(circle.parent).equalsTo(group);
        group.remove(circle);
        assert(group.innerHTML)
            .equalsTo(
                '<rect x="10" y="20" width="100" height="200"></rect>'
            );
        assert(group.children).hasContent(rect);
        assert(circle.parent).equalsTo(null);
        group.insert(rect, circle);
        assert(group.innerHTML)
            .equalsTo(
                '<circle cx="100" cy="150" r="50"></circle>'+
                '<rect x="10" y="20" width="100" height="200"></rect>'
            );
        assert(group.children).hasContent(circle, rect);
        assert(circle.parent).equalsTo(group);
        let ellipse = new Ellipse(100, 150, 50, 60);
        group.replace(circle, ellipse);
        assert(group.innerHTML)
            .equalsTo(
                '<ellipse cx="100" cy="150" rx="50" ry="60"></ellipse>'+
                '<rect x="10" y="20" width="100" height="200"></rect>'
            );
        assert(group.children).hasContent(ellipse, rect);
        assert(circle.parent).equalsTo(null);
        assert(ellipse.parent).equalsTo(group);
        group.clear();
        assert(group.innerHTML)
            .equalsTo('');
        assert(svg.children.empty);
        assert(rect.parent).equalsTo(null);
        assert(ellipse.parent).equalsTo(null);
    });

    it ("Checks container methods", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        let circle = new Circle(100, 150, 50);
        svg.add(circle);
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g>' +
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '<circle cx="100" cy="150" r="50"></circle>' +
                '</g>');
        assert(svg.children).hasContent(rect, circle);
        assert(rect.parent).equalsTo(svg);
        assert(circle.parent).equalsTo(svg);
        svg.remove(circle);
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g>' +
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '</g>');
        assert(svg.children).hasContent(rect);
        assert(circle.parent).equalsTo(null);
        svg.insert(rect, circle);
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g>' +
                '<circle cx="100" cy="150" r="50"></circle>'+
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '</g>');
        assert(svg.children).hasContent(circle, rect);
        assert(circle.parent).equalsTo(svg);
        let ellipse = new Ellipse(100, 150, 50, 60);
        svg.replace(circle, ellipse);
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g>' +
                '<ellipse cx="100" cy="150" rx="50" ry="60"></ellipse>'+
                '<rect x="10" y="20" width="100" height="200"></rect>' +
                '</g>');
        assert(svg.children).hasContent(ellipse, rect);
        assert(circle.parent).equalsTo(null);
        assert(ellipse.parent).equalsTo(svg);
        svg.clear();
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g></g>');
        assert(svg.children.empty);
        assert(rect.parent).equalsTo(null);
        assert(ellipse.parent).equalsTo(null);
    });

    it ("Checks reset node method", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let otherRect = new Rect(15, 25, 105, 205);
        svg.add(rect);
        rect._old = rect._node;
        rect._node = otherRect._node;
        svg.reset(rect);
        assert(svg.innerHTML)
            .equalsTo('<defs></defs><g>' +
                '<rect x="15" y="25" width="105" height="205"></rect>' +
                '</g>');
    });

    it ("Listens mouse event", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        let clicked = 0;
        let trigger = event=>{
            clicked++;
        };
        rect.on(MouseEvents.CLICK, trigger);
        mouse("click", rect, 0, 0);
        assert(clicked).equalsTo(1);
        rect.off(MouseEvents.CLICK, trigger);
        mouse("click", rect, 0, 0);
        assert(clicked).equalsTo(1);
    });

    it ("Triggers drag events", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        let moved = 0;
        let status = "not dragged";
        rect.onDrag(event=> {
                status = "dragged";
            },
            event=> {
                status = "moved";
            },
            event=> {
                status = "dropped"
            }
        );
        mouse("mousemove", rect, 0, 0);
        assert(status).equalsTo("not dragged");
        mouse("mouseup", rect, 10, 10);
        assert(status).equalsTo("not dragged");
        mouse("mousedown", rect,0, 0);
        assert(status).equalsTo("dragged");
        mouse("mousemove", rect, 0, 0); // Same place => event is ignored
        assert(status).equalsTo("dragged");
        mouse("mousemove", rect, 10, 10); // Not same place
        assert(status).equalsTo("moved");
        mouse("mousedown", rect, 0, 0);
        assert(status).equalsTo("moved");
        mouse("mouseup", rect, 10, 10);
        assert(status).equalsTo("dropped");
        status = "not dragged";
        mouse("mousemove", rect, 0, 0);
        assert(status).equalsTo("not dragged");
        mouse("mouseup", rect, 10, 10);
        assert(status).equalsTo("not dragged");
        rect.offDrag();
        mouse("mousedown", rect, 0, 0);
        assert(status).equalsTo("not dragged");
    });

    it ("Shows a Gaussian Blur filter", ()=>{
        let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
            'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">' +
//            'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB">' +
            '<feGaussianBlur stdDeviation="3 10" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" ' +
            'edgeMode="none" result="blur"></feGaussianBlur>' +
            '</filter>';
        let rect = new Rect(10, 20, 100, 200);
        let filterElement = new FeGaussianBlur().attrs({stdDeviation:[3, 10],
            x:P100(0), y:P100(0), width:P100(100), height:P100(100), in:FeIn.SOURCEGRAPHIC,
            edgeMode:FeEdgeMode.NONE, result:"blur"});
        let filter = new Filter().attrs({
            id:"filter",
            x:P100(-20), y:P100(-20), width:P100(140), height:P100(140),
            filterUnits:FilterUnits.OBJECTBOUNDINGBOX,
            primitiveUnits:FilterUnits.USERSPACEONUSE
        }).add(filterElement);
        svg.addDef(filter);
        assert(svg.defs.innerHTML).equalsTo(filterHtml);
        rect.filter = filter;
        assert(rect.filter).equalsTo(filter);
        svg.add(rect);
        assert(rect.outerHTML).equalsTo('<rect x="10" y="20" width="100" height="200" filter="url(#filter)"></rect>');
    });

    it ("Shows a Drop Shadow filter", ()=>{
        let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
            'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" ' +
            //'color-interpolation-filters="linearRGB"
            '>' +
            '<feDropShadow stdDeviation="5 5" in="SourceGraphic" dx="10" dy="10" flood-color="#1F3646" ' +
            'flood-opacity="1" x="0%" y="0%" width="100%" height="100%" result="dropShadow"/>' +
            '</filter>'
    });

    it ("Shows a Morphology filter", ()=>{
       let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
           'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" ' +
           //'color-interpolation-filters="linearRGB"' +
           '>' +
           '<feMorphology operator="erode" radius="3 3" x="0%" y="0%" width="100%" height="100%" ' +
           'in="dropShadow" result="morphology"/>' +
           '</filter>'
    });

    it ("Shows a Displacement Map filter", ()=>{
       let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
           'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" ' +
           //'color-interpolation-filters="linearRGB"' +
           '>' +
           '<feDisplacementMap in="SourceGraphic" in2="morphology" scale="20" xChannelSelector="R" yChannelSelector="B" ' +
           'x="0%" y="0%" width="100%" height="100%" result="displacementMap"/>' +
           '</filter>'
    });

    it ("Shows a Blend filter", ()=>{
        let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
            'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" ' +
            // 'color-interpolation-filters="linearRGB"' +
            '>' +
            '<feBlend mode="multiply" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" in2="SourceGraphic" ' +
            'result="blend"/>' +
            '</filter>'
    });

    it ("Shows a Color Matrix filter", ()=>{
       let filterHtml = '<filter id="filter" x="-20%" y="-20%" width="140%" height="140%" ' +
           'filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" ' +
           'color-interpolation-filters="linearRGB"' +
           '>' +
           '<feColorMatrix type="saturate" values="5" x="0%" y="0%" width="100%" height="100%" in="blend" ' +
           'result="colormatrix"/>' +
           '</filter>'
    });

    it ("Build a simple clone", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let copy = rect.clone();
        svg.add(copy);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs><g>' +
            '<rect x="10" y="20" width="100" height="200"></rect>' +
            '</g>');
        assert(copy.constructor).equalsTo(Rect);
        assert(copy.x).equalsTo(10);
        assert(copy.y).equalsTo(20);
        assert(copy.width).equalsTo(100);
        assert(copy.height).equalsTo(200);
    });

    it ("Clone an element tree", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let circle = new Circle(100, 150, 50);
        let group = new Group();
        let clone = group.add(rect).add(circle).clone();
        svg.add(clone);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs><g><g>' +
            '<rect x="10" y="20" width="100" height="200"></rect>' +
            '<circle cx="100" cy="150" r="50"></circle>' +
            '</g></g>');
        let cRect = clone.children[0];
        let cCircle = clone.children[1];
        assert(cRect.constructor).equalsTo(Rect);
        assert(cCircle.constructor).equalsTo(Circle);
        assert(cRect.parent).equalsTo(clone);
        assert(cCircle.parent).equalsTo(clone);
    });

    it ("Checks (mouse) event after clone op", ()=> {
        let clicked = 0;
        let trigger = event=>{
            clicked++;
        };
        let rect = new Rect(10, 20, 100, 200);
        rect.on(MouseEvents.CLICK, trigger);
        //rect.eventCloning = false; // Default : events are not cloned
        let copy = rect.clone();
        svg.add(copy);
        mouse("click", copy);
        assert(clicked).equalsTo(0);    // EventHandling not cloned : nothing happen
        rect.eventCloning = true;
        copy = rect.clone();
        svg.add(copy);
        mouse("click", copy);
        assert(clicked).equalsTo(1);
    });

    it ("Triggers drag events after clone op", ()=> {
        let rect = new Rect(10, 20, 100, 200);
        rect.eventCloning = true;
        let status = "not dragged";
        rect.onDrag(event=> {
                status = "dragged";
            },
            event=> {
                status = "moved";
            },
            event=> {
                status = "dropped"
            }
        );
        let copy = rect.clone();
        svg.add(copy);
        mouse("mousedown", copy, 0, 0);
        assert(status).equalsTo("dragged");
        mouse("mousemove", copy, 10, 10);
        assert(status).equalsTo("moved");
        mouse("mouseup", copy, 0, 0);
        assert(status).equalsTo("dropped");
        assert(copy.eventCloning).equalsTo(true);
    });

    it ("Build a clone of rasterized image", (done)=>{
        let image = new RasterImage("images/home.png");
        svg.add(image.clone());
        defer(()=>{
            assert(svg.innerHTML).equalsTo(
                '<defs></defs><g>' +
                '<image width="40" height="40" href="images/home.png" x="0" y="0" preserveAspectRatio="none"></image>' +
                '</g>');
            done();
        }, 50);
    });

    it ("Build a clone of an svg image", (done)=>{
        let image = new SvgImage("images/comments_on.svg", 100, 100, 80, 80);
        svg.add(image.clone());
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><g transform="matrix(1 0 0 1 100 100)"><g transform="matrix(2 0 0 2 0 0)">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><title>Henry-icons</title>');
            done();
        }, 50);
    });

    it ("Build a clone of a rasterized svg image", (done)=>{
        let image = new SvgRasterImage("images/comments_on.svg", 100, 100, 80, 80);
        svg.add(image.clone());
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image height="80" width="80" xlink:href="data:image/png;base64,');
            done();
        }, 50);
    });

    it ("Checks global matrix", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let group = new Translation(100, 50);
        let gmatrix = rect.globalMatrix;
        assert(gmatrix.toString()).equalsTo("matrix(1 0 0 1 0 0)");
        svg.add(group.add(rect));
        gmatrix = rect.globalMatrix;
        assert(gmatrix.toString()).equalsTo("matrix(1 0 0 1 100 50)");
    });

    it ("Checks getElementFromPoint", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        let target = svg.getElementFromPoint(12, 32);
        assert(target).equalsTo(rect);
        target = svg.getElementFromPoint(300, 300);
        assert(target).equalsTo(svg);
    });

    it ("Checks standard element attributes", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        svg.add(rect);
        rect.id = "rect";
        rect.opacity = 0.5;
        rect.visibility = Visibility.HIDDEN;
        rect.stroke = "#000000";
        assert(rect.outerHTML).equalsTo('<rect x="10" y="20" width="100" height="200" id="rect" opacity="0.5" ' +
            'visibility="hidden" stroke="#000000"></rect>');
    });

    it ("Checks clic path attributes (when inserted in svg defs)", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let clip = new ClipPath("ID1").add(new Rect(0, 0, 50, 50));
        svg.add(rect);
        svg.addDef(clip);
        rect.clip_path = clip;
        rect.id = "rect";
        assert(svg.outerHTML).contains('<defs><clipPath id="ID1"><rect x="0" y="0" width="50" height="50">' +
            '</rect></clipPath></defs>');
        assert(rect.outerHTML).equalsTo('<rect x="10" y="20" width="100" height="200" clip-path="url(#ID1)" id="rect"></rect>');
    });

    it ("Checks clic path attributes (when inserted in a group)", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let clip = new ClipPath("ID1").add(new Rect(0, 0, 50, 50));
        clip.id='ID1';
        let group = new Group();
        svg.add(group);
        group.add(clip).add(rect);
        rect.clip_path = clip;
        rect.id = "rect";
        assert(group.outerHTML).equalsTo('<g>' +
            '<clipPath id="ID1"><rect x="0" y="0" width="50" height="50"></rect></clipPath>' +
            '<rect x="10" y="20" width="100" height="200" clip-path="url(#ID1)" id="rect"></rect></g>');
    });

    it ("Checks mask attributes (when inserted in svg defs)", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let mask = new Mask("ID1", 0, 0, 50, 25).add(new Rect(0, 0, 50, 50).attrs({fill:Colors.BLACK}));
        svg.add(rect);
        svg.addDef(mask);
        rect.mask = mask;
        rect.id = "rect";
        assert(svg.outerHTML).contains('<defs><mask id="ID1" x="0" y="0" width="50" height="25">' +
            '<rect x="0" y="0" width="50" height="50" fill="#0F0F0F"></rect></mask></defs>');
        assert(rect.outerHTML).equalsTo('<rect x="10" y="20" width="100" height="200" mask="url(#ID1)" id="rect">' +
            '</rect>');
    });

    it ("Checks mask attributes (when inserted in a group)", ()=>{
        let rect = new Rect(10, 20, 100, 200);
        let mask = new Mask("ID1", 0, 0, 50, 25).add(new Rect(0, 0, 50, 50).attrs({fill:Colors.BLACK}));
        let group = new Group();
        svg.add(group);
        group.add(mask).add(rect);
        rect.mask = mask;
        rect.id = "rect";
        assert(group.outerHTML).equalsTo('<g><mask id="ID1" x="0" y="0" width="50" height="25">' +
            '<rect x="0" y="0" width="50" height="50" fill="#0F0F0F"></rect></mask>' +
            '<rect x="10" y="20" width="100" height="200" mask="url(#ID1)" id="rect"></rect></g>');
    });

    it ("Shows a clipped rasterized image", (done)=>{
        let image = new ClippedRasterImage("images/home.png", 5, 5, 25, 25);
        svg.add(image);
        assert(svg.innerHTML).equalsTo('<defs></defs><g><g></g></g>');
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image xlink:href="data:image/png;base64,iVBOR');
            done();
        }, 50);
    });

    it ("Build a clone of a clipped rasterized image", (done)=>{
        let image = new ClippedRasterImage("images/home.png", 5, 5, 25, 25);
        svg.add(image.clone());
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image xlink:href="data:image/png;base64,iVBOR');
            done();
        }, 50);
    });

    it ("Change clip of a clipped rasterized image", (done)=>{
        let image = new ClippedRasterImage("images/home.png", 5, 5, 25, 25);
        svg.add(image);
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAABRklEQVRIS+');
            image.clip(10, 10, 20, 20);
            defer(()=>{
                assert(svg.innerHTML).contains(
                    '<g><image xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAqUlEQVQ4T+');
                done();
            });
        }, 50);
    });

    it ("Change image of a clipped rasterized image", (done)=>{
        let image = new ClippedRasterImage("images/home.png", 5, 5, 25, 25);
        svg.add(image);
        defer(()=>{
            assert(svg.innerHTML).contains(
                '<g><image xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAABRklEQVRIS+');
            image.href = "images/profile.png";
            defer(()=>{
                assert(svg.innerHTML).contains(
                    '<g><image xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAACF0lEQVRIS7XVS');
                done();
            });
        }, 100);
    });

    it ("Shows a path", ()=>{
        let path = new Path(M(20, 25), m(10, 15), L(50, 5), l(-10, -15), Q(10, 25, 20, 15), q(-10, -25, -20, -15));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, m 10 15, L 50 5, l -10 -15, Q 10 25 20 15, q -10 -25 -20 -15"></path>');
    });

    it ("Shows a path containing L directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), L(50, 5));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, L 50 5"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:5, width:30, height:20});
    });

    it ("Shows a path containing l directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), l(20, -15));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, l 20 -15"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:5, width:30, height:20});
    });

    it ("Shows a path containing H directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), H(50));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, H 50"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:5});
    });

    it ("Shows a path containing h directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), h(20));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, h 20"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:5});
    });

    it ("Shows a path containing V directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), V(50));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, V 50"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:10, height:30});
    });

    it ("Shows a path containing v directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), v(30));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, v 30"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:10, height:30});
    });

    it ("Shows a path containing C directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), C(50, 30, 40, 40, 30, 50));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, C 50 30 40 40 30 50"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Shows a path containing c directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), c(20, 10, 10, 20, 0, 30));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, c 20 10 10 20 0 30"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Shows a path containing S directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), S(50, 30, 30, 50));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, S 50 30 30 50"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Shows a path containing s directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), s(20, 10, 0, 30));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, s 20 10 0 30"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Shows a path containing Q directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), Q(50, 30, 30, 50));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, Q 50 30 30 50"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Shows a path containing q directive", ()=>{
        let path = new Path(M(20, 25), L(30, 20), q(20, 10, 0, 30));
        svg.add(path);
        assert(path.outerHTML).equalsTo('<path d="M 20 25, L 30 20, q 20 10 0 30"></path>');
        assert(path.bbox).objectEqualsTo({x:20, y:20, width:30, height:30});
    });

    it ("Gets the DOM order of elements", ()=>{
        let group1 = new Group();
        let group2 = new Group();
        let group3 = new Group();
        let rect1 = new Rect(10, 10, 10, 10);
        let rect2 = new Rect(10, 10, 10, 10);
        let rect3 = new Rect(10, 10, 10, 10);
        let rect4 = new Rect(10, 10, 10, 10);
        svg.add(
            rect1
        ).add(
            group1.add(
                group2.add(rect2).add(rect3)
            ).add(
                group3.add(rect4)
            )
        );
        assert(getDOMOrder(rect2, rect4, rect1, rect3)).arrayEqualsTo([rect1, rect2, rect3, rect4]);
    });

    it ("Gets the DOM position of an element among a list of elements", ()=>{
        let group1 = new Group();
        let group2 = new Group();
        let group3 = new Group();
        let rect1 = new Rect(10, 10, 10, 10);
        let rect2 = new Rect(10, 10, 10, 10);
        let rect3 = new Rect(10, 10, 10, 10);
        let rect4 = new Rect(10, 10, 10, 10);
        svg.add(
            rect1
        ).add(
            group1.add(
                group2.add(rect2).add(rect3)
            ).add(
                group3.add(rect4)
            )
        );
        assert(getDOMPosition(rect1, [rect1, rect2, rect3, rect4])).equalsTo(0);
        assert(getDOMPosition(rect4, [rect1, rect2, rect3, rect4])).equalsTo(3);
        assert(getDOMPosition(rect3, [rect1, rect2, rect3, rect4])).equalsTo(2);
        assert(getDOMPosition(rect1, [rect2, rect3, rect4])).equalsTo(0);
        assert(getDOMPosition(rect4, [rect1, rect2, rect3])).equalsTo(3);
        assert(getDOMPosition(rect3, [rect1, rect2, rect4])).equalsTo(2);
    });

    it ("Sets the z-index of a svg child", ()=>{
        let zIndexedRect = new Rect(20, 20, 40, 40).attrs({fill:Colors.RED, z_index:1});
        let rect = new Rect(30, 30, 40, 40);
        svg.add(zIndexedRect).add(rect);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' + // Layer 0
            '<rect x="30" y="30" width="40" height="40"></rect>' +
            '</g>' +
            '<g>' + // Layer 1
            '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '</g>')
    });

    it ("Changes the z-index of a svg child", ()=>{
        let zIndexedRect = new Rect(20, 20, 40, 40).attrs({fill:Colors.RED});
        let rect = new Rect(30, 30, 40, 40);
        svg.add(zIndexedRect).add(rect);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
            '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '<rect x="30" y="30" width="40" height="40"></rect>' +
            '</g>'
        );
        zIndexedRect.z_index = 1;
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' + // Layer 0
            '<rect x="30" y="30" width="40" height="40"></rect>' +
            '</g>' +
            '<g>' + // Layer 1
            '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '</g>');
        zIndexedRect.z_index = 0;
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
            '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '<rect x="30" y="30" width="40" height="40"></rect>' +
            '</g>'
        );
    });

    it ("Sets the z-index of an element (which is not a svg child)", ()=>{
        let group = new Group();
        let zIndexedRect = new Rect(20, 20, 40, 40).attrs({fill:Colors.RED, z_index:1});
        let rect = new Rect(30, 30, 40, 40);
        svg.add(group);
        group.add(zIndexedRect).add(rect);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
                '<g><rect x="30" y="30" width="40" height="40"></rect></g>' +
            '</g>' +
            '<g>' +
                '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '</g>'
        );
    });

    it ("Changes the z-index of an element (which is not a svg child)", ()=>{
        let group = new Group();
        let zIndexedRect = new Rect(20, 20, 40, 40).attrs({fill:Colors.RED});
        let rect = new Rect(30, 30, 40, 40);
        svg.add(group);
        group.add(zIndexedRect).add(rect);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
                '<g>' +
                    '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
                    '<rect x="30" y="30" width="40" height="40"></rect>' +
                '</g>' +
            '</g>'
        );
        zIndexedRect.z_index = 1;
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' + // Layer 0
                '<g>' +
                    '<rect x="30" y="30" width="40" height="40"></rect>' +
                '</g>' +
            '</g>' +
            '<g>' + // Layer 1
                '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
            '</g>');
        zIndexedRect.z_index = 0;
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
                '<g>' +
                    '<rect x="20" y="20" width="40" height="40" fill="#F00F0F"></rect>' +
                    '<rect x="30" y="30" width="40" height="40"></rect>' +
                '</g>' +
            '</g>'
        );
    });

    it ("Moves a z-indexed element by moving its parent", (done)=>{
        let group = new Group();
        group.matrix = Matrix2D.translate(15, 15);
        let zIndexedRect = new Rect(20, 20, 40, 40).attrs({fill:Colors.RED, z_index:1});
        let rect = new Rect(30, 30, 40, 40);
        svg.add(group);
        group.add(zIndexedRect).add(rect);
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' +
            '<g transform="matrix(1 0 0 1 15 15)"><rect x="30" y="30" width="40" height="40"></rect></g>' +
            '</g>' +
            '<g>' +
            '<rect x="20" y="20" width="40" height="40" fill="#F00F0F" transform="matrix(1 0 0 1 15 15)"></rect>' +
            '</g>'
        );
        group.matrix = Matrix2D.translate(25, 25);
        defer(()=>{
            assert(svg.innerHTML).equalsTo(
                '<defs></defs>' +
                '<g>' +
                '<g transform="matrix(1 0 0 1 25 25)"><rect x="30" y="30" width="40" height="40"></rect></g>' +
                '</g>' +
                '<g>' +
                '<rect x="20" y="20" width="40" height="40" fill="#F00F0F" transform="matrix(1 0 0 1 25 25)"></rect>' +
                '</g>'
            );
            done();
        }, 10);
    });

    it ("Checks that z-index matrix is merged with element matrix", (done)=>{
        let rootGroup = new Group();
        let group = new Group();
        group.matrix = Matrix2D.translate(15, 15);
        let rect = new Rect(30, 30, 40, 40);
        svg.add(rootGroup.add(group.add(rect)));
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' + // z-index = 0
                '<g>' +
                    '<g transform="matrix(1 0 0 1 15 15)"><rect x="30" y="30" width="40" height="40"></rect></g>' +
                '</g>' +
            '</g>'
        );
        group.z_index = 1;
        assert(svg.innerHTML).equalsTo(
            '<defs></defs>' +
            '<g>' + // z-index = 0
                '<g></g>' +
            '</g>' +
            '<g>' + // z-index = 1
                '<g transform="matrix(1 0 0 1 15 15)"><rect x="30" y="30" width="40" height="40"></rect></g>' +
            '</g>'
        );
        rootGroup.matrix = Matrix2D.translate(25, 25);
        defer(()=>{
            assert(svg.innerHTML).equalsTo(
                '<defs></defs>' +
                '<g>' + // z-index = 0
                    '<g transform="matrix(1 0 0 1 25 25)"></g>' +
                '</g>' +
                '<g>' + // z-index = 1
                    '<g transform="matrix(1 0 0 1 40 40)">' +   // matrixes are merged
                        '<rect x="30" y="30" width="40" height="40"></rect>' +
                    '</g>' +
                '</g>'
            );
            group.z_index = 0;
            defer(()=>{
                assert(svg.innerHTML).equalsTo(
                    '<defs></defs>' +
                    '<g>' +
                        '<g transform="matrix(1 0 0 1 25 25)">' +
                            '<g transform="matrix(1 0 0 1 15 15)"><rect x="30" y="30" width="40" height="40"></rect></g>' +
                        '</g>' +
                    '</g>'
                );
                done();
            }, 10);
        }, 10);
    });

    it ("Select an item on a point", ()=>{
        let rect = new Rect(10, 15, 30, 40);
        svg.add(rect);
        let selection = svg.getElementsOn(20, 30);
        assert(selection).arrayEqualsTo([rect]);
        selection = svg.getElementsOn(100, 100);
        assert(selection).arrayEqualsTo([]);
    });

    it ("Select one item among many", ()=>{
        let rects = [];
        for (let i=0; i<50; i++) {
            rects[i] = [];
            for (let j=0; j<50; j++) {
                rects[i][j] = new Rect(i*40, j*20, 40, 20);
                svg.add(rects[i][j]);
            }
        }
        let selection = svg.getElementsOn(60, 70);
        let d1 = new Date().getTime();
        for (let i=0; i<1000; i++) {
            let selection = svg.getElementsOn(60, 70);
            assert(selection).arrayEqualsTo([rects[1][3]]);
        }
        let d2 = new Date().getTime();
        console.log(d2-d1);
    });

    it ("Checks that an element inside a group is found by svg.getElementsOn (but the group is not)", ()=>{
        let rect = new Rect(10, 15, 30, 40);
        let group = new Group();
        svg.add(group.add(rect));
        let selection = svg.getElementsOn(20, 30);
        assert(selection).arrayEqualsTo([rect]);
    });

    it ("Checks that an element inside a section (pack) is found by svg.getElementsOn (but the pack is not)", ()=>{
        let rect = new Rect(10, 15, 30, 40);
        let pack = new Pack();
        pack.matrix = Matrix2D.translate(10, 15);
        svg.add(pack.add(rect));
        assert(pack.bbox).objectEqualsTo({x:10, y:15, width:30, height:40});
        assert(pack.rbox).objectEqualsTo({x:20, y:30, width:30, height:40});
        let selection = svg.getElementsOn(30, 45);
        assert(selection).arrayEqualsTo([rect]);
        selection = svg.getElementsOn(15, 45);
        assert(selection).arrayEqualsTo([]);
        selection = svg.getElementsOn(45, 45);
        assert(selection).arrayEqualsTo([rect]);
        selection = svg.getElementsOn(55, 45);
        assert(selection).arrayEqualsTo([]);
    });

    it ("Checks that an item is updated on layout when its geometry change", ()=>{
        let rect = new Rect(10, 15, 30, 40);
        svg.add(rect);
        let selection = svg.getElementsOn(35, 30);
        assert(selection).arrayEqualsTo([rect]);
        selection = svg.getElementsOn(45, 30);
        assert(selection).arrayEqualsTo([]);
        rect.width = 40;
        selection = svg.getElementsOn(45, 30);
        assert(selection).arrayEqualsTo([rect]);
    });

});
