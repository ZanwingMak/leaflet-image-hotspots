#### 实现热点图像区域编辑功能，能够在图片上绘制、编辑、删除图形区域以及文字说明。
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111107364455.png)

### 使用
[leaflet](https://github.com/Leaflet/Leaflet "leaflet")(v0.7.7) <br/>
[leaflet.draw](https://github.com/Leaflet/Leaflet.draw "leaflet.draw")(v0.4.9) <br/>
[leaflet.label](https://github.com/Leaflet/Leaflet.label "leaflet.label") <br/>
[sweetalert2](https://github.com/limonte/sweetalert2 "sweetalert2") <br/>
[pinyinjs](https://github.com/sxei/pinyinjs "pinyinjs") <br/>
[jquery](https://github.com/jquery/jquery "jquery")(v3.1.1)
### Demo
[http://demo.laji.blog/hotspots](http://demo.laji.blog/hotspots "http://demo.laji.blog/hotspots")
### Github
[https://github.com/xiaomai0830/leaflet-image-hotspots](https://github.com/xiaomai0830/leaflet-image-hotspots "https://github.com/xiaomai0830/leaflet-image-hotspots")

###遇到的各种问题的解决方法和解答出处 <br/>
#### 1.用代码添加了一个多边形但是无法通过点击工具栏来编辑的原因 <br/>
应该addTo(drawnItems)而不是addTo(map) <br/>
[https://github.com/Leaflet/Leaflet.draw/issues/159](https://github.com/Leaflet/Leaflet.draw/issues/159 "https://github.com/Leaflet/Leaflet.draw/issues/159") <br/>
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111053399162.png)
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111054029615.png)
#### 2.leaflet在使用CRS.Simple坐标时画圆的问题
添加以下代码：
```javascript
    L.Edit.Circle.include({
        _move: function (latlng) {
            var resizemarkerPoint = this._getResizeMarkerPoint(latlng);

            // Move the resize marker
            this._resizeMarkers[0].setLatLng(resizemarkerPoint);

            // Move the circle
            this._shape.setLatLng(latlng);

            // output the radius, for debugging purpose.
            document.getElementById("radius").innerHTML = this._shape._radius;
        }
    });
    // Correct Leaflet L.Circle for use with flat map. Comment the following function to see the original impact on radius when the circle is dragged along the vertical axis.
    L.Circle.include({
        _getLngRadius: function () {
            return this._getLatRadius();
        }
    });
```
[https://stackoverflow.com/questions/29366268/leaflet-circle-drawing-editing-issue](https://stackoverflow.com/questions/29366268/leaflet-circle-drawing-editing-issue "https://stackoverflow.com/questions/29366268/leaflet-circle-drawing-editing-issue")
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111056432901.png) <br/>
[http://jsfiddle.net/jameslaneconkling/mhpd9ca5](http://jsfiddle.net/jameslaneconkling/mhpd9ca5 "http://jsfiddle.net/jameslaneconkling/mhpd9ca5")
#### 3.leaflet 添加文字的方法
**方法一**：通过修改Marker的icon来实现 <br/>
[https://stackoverflow.com/questions/41082236/leafletjs-l-divicon-html-marker-text-scale-relative-to-map-zoom](https://stackoverflow.com/questions/41082236/leafletjs-l-divicon-html-marker-text-scale-relative-to-map-zoom "https://stackoverflow.com/questions/41082236/leafletjs-l-divicon-html-marker-text-scale-relative-to-map-zoom")

**方法二**：添加以下代码(参照别人的代码改的,但在画polygon的时候会出现无法使用setText方法的问题，后来改用include就可以了)：
```javascript
    //添加文字
    var original_getPathString_circle = L.Circle.prototype.getPathString;
    L.Circle.include({
        getPathString: function () {
            var center = this._point,
                r = this._radius;
            if (this._textNode && this._textNode.parentNode) {
                this._path.parentNode.removeChild(this._textNode);
                delete this._textNode;
            }
            var textNode = L.Path.prototype._createElement('text');

            textNode.setAttribute('text-anchor', 'middle');
            textNode.setAttribute('style', 'font-weight:bold');
            textNode.setAttribute('x', center.x);
            textNode.setAttribute('y', center.y);
            var font_size;
            if(this._map.getZoom()>0){
                font_size = (textFontSize_default+4) * this._map.getZoom()*2;
            }else{
                font_size = textFontSize_default;
            }
            textNode.setAttribute('font-size', font_size );

            textNode.appendChild(document.createTextNode((this.text)?this.text:''));

            this._path.parentNode.appendChild(textNode);

            this._textNode = textNode;

            return original_getPathString_circle.call(this);

        },
        setText: function (text) {
            this.text = text;
            return this.redraw();
        }

    });

    var original_getPathString_rectangle = L.Rectangle.prototype.getPathString;
    L.Rectangle.include({
        getPathString: function () {
            var center = map.latLngToLayerPoint(this.getBounds().getCenter());
            if (this._textNode && this._textNode.parentNode) {
                this._path.parentNode.removeChild(this._textNode);
                delete this._textNode;
            }
            var textNode = L.Path.prototype._createElement('text');

            textNode.setAttribute('text-anchor', 'middle');
            textNode.setAttribute('style', 'font-weight:bold');
            textNode.setAttribute('x', center.x);
            textNode.setAttribute('y', center.y);
            var font_size;
            if(this._map.getZoom()>0){
                font_size = (textFontSize_default+4) * this._map.getZoom()*2;
            }else{
                font_size = textFontSize_default;
            }
            textNode.setAttribute('font-size', font_size );

            textNode.appendChild(document.createTextNode((this.text)?this.text:''));

            this._path.parentNode.appendChild(textNode);

            this._textNode = textNode;

            return original_getPathString_rectangle.call(this);

        },
        setText: function (text) {
            this.text = text;
            return this.redraw();
        }

    });


    var original_getPathString_polygon = L.Polygon.prototype.getPathString;
    L.Polygon.include({
        getPathString: function () {
            var center = map.latLngToLayerPoint(this.getBounds().getCenter());
            if (this._textNode && this._textNode.parentNode) {
                this._path.parentNode.removeChild(this._textNode);
                delete this._textNode;
            }
            var textNode = L.Path.prototype._createElement('text');
            textNode.setAttribute('text-anchor', 'middle');
            textNode.setAttribute('style', 'font-weight:bold');
            textNode.setAttribute('x', center.x);
            textNode.setAttribute('y', center.y);
            var font_size;
            if(this._map.getZoom()>0){
                font_size = (textFontSize_default+4) * this._map.getZoom()*2;
            }else{
                font_size = textFontSize_default;
            }
            textNode.setAttribute('font-size', font_size );

            textNode.appendChild(document.createTextNode((this.text)?this.text:''));

            this._path.parentNode.appendChild(textNode);

            this._textNode = textNode;

            return original_getPathString_polygon.call(this);

        },
        setText: function (text) {
            this.text = text;
            return this.redraw();
        }

    });
```
[https://stackoverflow.com/questions/39367040/can-i-have-fixed-text-in-leaflet](https://stackoverflow.com/questions/39367040/can-i-have-fixed-text-in-leaflet "https://stackoverflow.com/questions/39367040/can-i-have-fixed-text-in-leaflet") <br/>
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111050102672.png)
#### 4.leaflet 获取图形的中心点
Circle可直接用_point属性，Rectangle、Polygon要用map.latLngToLayerPoint(this.getBounds().getCenter())来获取。 <br/>
[https://stackoverflow.com/questions/13316925/simple-label-on-a-leaflet-geojson-polygon](https://stackoverflow.com/questions/13316925/simple-label-on-a-leaflet-geojson-polygon "https://stackoverflow.com/questions/13316925/simple-label-on-a-leaflet-geojson-polygon") <br/>
![](https://o7y8mvdbc.qnssl.com/tc/uploads/1708/111104051809.png)
