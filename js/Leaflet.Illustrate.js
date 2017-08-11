(function(window, document, undefined) {

"use strict";

L.Illustrate = {};

L.Illustrate.version = "0.0.1";
if (L.DomUtil) {
	L.DomUtil.getRotateString = function(angle, units) {
		var is3d = L.Browser.webkit3d,
			open = 'rotate' + (is3d ? '3d' : '') + '(',
			rotateString = (is3d ? '0, 0, 1, ' : '') + angle + units;
			
		return open + rotateString + ')';
	};
}
if (L.DomUtil) {
	L.DomUtil.setTransform = function (el, point, angle, disable3D) {

		// jshint camelcase: false
		el._leaflet_pos = point;

		if (!disable3D && L.Browser.any3d) {
			el.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(point);
			el.style[L.DomUtil.TRANSFORM] = el.style[L.DomUtil.TRANSFORM] + " " + L.DomUtil.getRotateString(angle, 'rad');
		} else {
			// if 3d is disabled, then there is no rotation at all
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	};
}
L.Map.include({
	_newLayerPointToLatLng: function(point, newZoom, newCenter) {
		var topLeft = L.Map.prototype._getNewTopLeftPoint.call(this, newCenter, newZoom)
				.add(L.Map.prototype._getMapPanePos.call(this));
		return this.unproject(point.add(topLeft), newZoom);
	}
});
if (L.Point) {
	L.Point.prototype._abs =  function() {
		this.x = Math.abs(this.x);
		this.y = Math.abs(this.y);
		return this;
	};
	L.Point.prototype.abs = function() {
		return this.clone()._abs();
	};
}
L.RotatableMarker = L.Marker.extend({

	options: {
		rotation: 0
	},

	initialize: function(latlng, options) {
		L.Marker.prototype.initialize.call(this, latlng, options);
		this.setRotation(this.options.rotation);
	},

	setRotation: function(theta) {
		this._rotation = theta;
		
		this.update();
		this.fire('rotate', { rotation: this._rotation });

		return this;
	},

	getRotation: function() {
		return this._rotation;
	},

	_setPos: function(pos) {
		L.DomUtil.setTransform(this._icon, pos, this._rotation);

		if (this._shadow) {
			L.DomUtil.setTransform(this._shadow, pos, this._rotation);
		}

		this._zIndex = pos.y + this.options.zIndexOffset;

		this._resetZIndex();
	}
});

L.rotatableMarker = function(latlng, options) {
	return new L.RotatableMarker(latlng, options);
};
L.Illustrate.Pointer = L.Path.extend({

	options: {
		noClip: false
	},

	initialize: function(anchor, coordinates, options) {
		L.Path.prototype.initialize.call(this, options);

		this._coordinates = coordinates;
		this._latlng = anchor;
	},

	onAdd: function(map) {
		this._map = map;

		if(!this._container) {
			this._initElements();
			this._initEvents();
		}

		this._updatePath();

		if (this._container) {
			this._pathRoot.appendChild(this._container);
		}

		this.fire('add');

		map.on({
			'viewreset': this._updatePath,
			'moveend': this._updatePath
		}, this);
	},

	onRemove: function(map) {
		this._unbindPathRoot();
		this._pathRoot.parentNode.removeChild(this._pathRoot);

		map.off({
			'viewreset': this._updatePath,
			'moveend': this._updatePath
		}, this);

		this.fire('remove');

		this._map = null;
	},

	getLatLng: function() {
		return this._latlng;
	},

	setLatLng: function(latlng) {
		this._latlng = latlng;

		this._updatePath();

		return this;
	},

	getPoints: function() {
		return this._coordinates;
	},

	setPoints: function(points) {
		this._coordinates = points;

		this._updatePath();

		return this;
	},

	getPathString: function() {
		return L.Polyline.prototype.getPathString.call(this);
	},

	_getPathPartStr: function(points) {
		return L.Polyline.prototype._getPathPartStr.call(this, points);
	},

	_getLatLngs: function() {
		var origin = this._map.latLngToLayerPoint(this._latlng),
			latlngs = [];

		for (var i = 0, l = this._coordinates.length; i < l; i++) {
			latlngs[i] = this._map.layerPointToLatLng(this._coordinates[i].add(origin));
		}

		return latlngs;
	},

	_projectCoordinatesToLayerPoints: function() {
		var origin = this._map.latLngToLayerPoint(this._latlng),
			layerPoint;

		this._layerPoints = [];

		for (var i = 0, length = this._coordinates.length; i < length; i++) {
			layerPoint = this._coordinates[i].add(origin);
			this._layerPoints[i] = layerPoint;
		}
	},

	_clipPoints: function () {
		var points = this._layerPoints,
		    len = points.length,
		    i, k, segment;

		if (this.options.noClip) {
			this._parts = [points];
			return;
		}

		this._parts = [];

		var parts = this._parts,
		    vp = this._pathViewport,
		    lu = L.LineUtil;

		for (i = 0, k = 0; i < len - 1; i++) {
			segment = lu.clipSegment(points[i], points[i + 1], vp, i);
			if (!segment) {
				continue;
			}

			parts[k] = parts[k] || [];
			parts[k].push(segment[0]);

			// if segment goes out of screen, or it's the last one, it's the end of the line part
			if ((segment[1] !== points[i + 1]) || (i === len - 2)) {
				parts[k].push(segment[1]);
				k++;
			}
		}
	},

	_updatePath: function() {
		if (!this._map) { return; }

		this._projectCoordinatesToLayerPoints();
		this._clipPoints();

		L.Path.prototype._updatePath.call(this);
	}
});
L.Illustrate.Pointer = L.Illustrate.Pointer.extend({
	_initElements: function() {
		this._initPathRoot();
		this._initPath();
		this._initStyle();
	},

	_animateZoom: function(opt) {
		var anchor = this._map.latLngToLayerPoint(this._latlng),
			newAnchor = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center),
			offset = newAnchor.subtract(anchor);

		this._pathRoot.style[L.DomUtil.TRANSFORM] =
			L.DomUtil.getTranslateString(this._pathViewport.min.add(offset));
		
		this._pathZooming = true;
	},

	_endZoom: function() {
		this._pathZooming = false;
	},

	_initPathRoot: function() {
		if (!this._pathRoot) {
			this._pathRoot = L.Path.prototype._createElement('svg');
			this._map._panes.overlayPane.appendChild(this._pathRoot);
		}

		if (this._map.options.zoomAnimation && L.Browser.any3d) {
			L.DomUtil.addClass(this._pathRoot, 'leaflet-zoom-animated');

			this._map.on({
				'zoomanim': this._animateZoom,
				'zoomend': this._endZoom
			}, this);
		} else {
			L.DomUtil.addClass(this._pathRoot, 'leaflet-zoom-hide');
		}

		this._map.on('moveend', this._updateSvgViewport, this);
		this._updateSvgViewport();
	},

	_unbindPathRoot: function() {
		this._map.off({
			'zoomanim': this._animateZoom,
			'zoomend': this._endZoom,
			'moveend': this._updateSvgViewport
		}, this);
	},

	_getPanePos: function() {
		return L.DomUtil.getPosition(this._pathRoot);
	},

	_updatePathViewport: function () {
		var p = L.Path.CLIP_PADDING,
		    size = this._map.getSize(),
		    panePos = this._map._getMapPanePos(),
		    min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(p)._round()),
		    max = min.add(size.multiplyBy(1 + p * 2)._round());

		this._pathViewport = new L.Bounds(min, max);
	},

	_updateSvgViewport: function() {
		if (this._pathZooming) {
			// Do not update SVGs while a zoom animation is going on otherwise the animation will break.
			// When the zoom animation ends we will be updated again anyway
			// This fixes the case where you do a momentum move and zoom while the move is still ongoing.
			return;
		}

		this._updatePathViewport();

		var vp = this._pathViewport,
		    min = vp.min,
		    max = vp.max,
		    width = max.x - min.x,
		    height = max.y - min.y,
		    pane = this._map._panes.overlayPane;

		// Hack to make flicker on drag end on mobile webkit less irritating
		if (L.Browser.mobileWebkit) {
			pane.removeChild(this._pathRoot);
		}

		L.DomUtil.setPosition(this._pathRoot, min);
		this._pathRoot.setAttribute('width', width);
		this._pathRoot.setAttribute('height', height);
		this._pathRoot.setAttribute('viewBox', [min.x, min.y, width, height].join(' '));

		if (L.Browser.mobileWebkit) {
			pane.appendChild(this._pathRoot);
		}
	}
});
L.Illustrate.Textbox = L.RotatableMarker.extend({
	statics: {
		TYPE: 'textbox',
		TEXTEDIT_EVENTS: [ 'change', 'keyup', 'paste', 'cut' ]
	},

	includes: [L.Mixin.Events],

	options: {
		/* this._minSize is used by edit handles (L.Illustrate.EditHandle) when updating size. */
		minSize: new L.Point(10, 10),
		textEditable: true,
		textContent: ''
	},

	initialize: function(latlng, options) {
		options.icon = new L.DivIcon({
			className: 'leaflet-illustrate-textbox-container',
			html: '<textarea style="width: 100%; height: 100%">' + this.options.textContent + '</textarea>',
			iconAnchor: new L.Point(0, 0)
		});

		L.RotatableMarker.prototype.initialize.call(this, latlng, options);

		this._textContent = this.options.textContent;
		this._minSize = this.options.minSize;
		
		this.setSize(this.options.size || this._minSize);
	},

	onAdd: function(map) {
		var textarea, editevent;

		L.RotatableMarker.prototype.onAdd.call(this, map);

		textarea = this.getTextarea();

		this.setContent(this._textContent);
		this.setLatLng(this._latlng);
		this._updateSize();

		/* Enable typing, text selection, etc. */
		this._enableTyping();

		/* Disable the textarea if the textbox content should not be editable. */
		if (!this.options.textEditable) {
			textarea.setAttribute('readonly', 'readonly');
		}

		this._addClasses();

		for (var i = 0; i < L.Illustrate.Textbox.TEXTEDIT_EVENTS.length; i++) {
			editevent = L.Illustrate.Textbox.TEXTEDIT_EVENTS[i];
			L.DomEvent.on(textarea, editevent, this._showIfEmpty, this);
		}

		this._showIfEmpty({ target: textarea });
	},

	addTo: function(map) {
		map.addLayer(this);
		return this;
	},

	onRemove: function(map) {
		/* In case the textbox was removed from the map while dragging was disabled. */
		/* (see _enableTyping) */
		this._map.dragging.enable();

		/* Save the text content of the textbox. */
		this.getContent();

		L.RotatableMarker.prototype.onRemove.call(this, map);
	},


	getSize: function() {
		return this._size;
	},

	setSize: function(size) {
		var minWidth = (size.x < this._minSize.x) ? size.x : this._minSize.x,
			minHeight = (size.y < this._minSize.y) ? size.y : this._minSize.y;

		/* If size is smaller than this._minSize, reset this._minSize. */
		this._minSize = new L.Point(minWidth, minHeight);

		this._size = size;

		/* Set size on textarea via CSS */
		if (this._map) {
			this._updateSize();
		}
		this.fire('resize', { size: this._size });

		return this;
	},

	setContent: function(text) {
		this.getTextarea().innerHTML = text;
		return this;
	},

	getContent: function() {
		/* Don't want to call this.getTextarea() if the textbox has been removed from the map. */
		if (this._map) {
			this._textContent = this.getTextarea().value;
		}

		return this._textContent;
	},

	_updateCenter: function() {
		this.setLatLng(this._latlng);
	},

	setStyle: function() {
		// use this to change the styling of the textbox.  should accept an 'options' argument.
		return this;
	},

	getTextarea: function() {
		return this._icon.children[0];
	},

	_updateSize: function() {
		var size = this.getSize();

		if (this._icon) {
			this._icon.style.marginTop = - Math.round(size.y/2) + "px";
			this._icon.style.marginLeft = - Math.round(size.x/2) + "px";
			this._icon.style.width = size.x + "px";
			this._icon.style.height = size.y + "px";
		}
	},

	_onTextEdit: function() {
		if (this._text_edited) {
			this.fire('textedit', { textContent: this.getContent() });
			this._text_edited = false;
		}
	},

	_enableTyping: function() {
		var map = this._map,
			textarea = this.getTextarea(),
			onTextChange = function() {
				this._text_edited = true;
			},
			editevent;

		/* Enable text selection and editing. */
		this._selecting = new L.Illustrate.Selectable(textarea);

		L.DomEvent.on(textarea, 'click', function(event) {
			event.target.focus();
		}, this);

		L.DomEvent.on(textarea, 'mouseover', function() {
			map.dragging.disable();
			this._selecting.enable();
		}, this);

		L.DomEvent.on(textarea, 'mouseout', function() {
			map.dragging.enable();
			this._selecting.disable();
		}, this);

		/* When user leaves the textarea, fire a 'textedit' event if they changed anything. */
		for (var i = 0; i < L.Illustrate.Textbox.TEXTEDIT_EVENTS.length; i++) {
			editevent = L.Illustrate.Textbox.TEXTEDIT_EVENTS[i];
			L.DomEvent.on(textarea, editevent, onTextChange, this);
		}

		L.DomEvent.on(textarea, 'blur', this._onTextEdit, this);
	},

	_showIfEmpty: function(event) {
		var textarea = event.target,
			text = textarea.value;

		if (text === '') {
			L.DomUtil.addClass(textarea, 'leaflet-illustrate-textbox-empty');
		} else {
			L.DomUtil.removeClass(textarea, 'leaflet-illustrate-textbox-empty');
		}
	},

	_addClasses: function() {
		var textarea = this.getTextarea();

		L.DomUtil.addClass(textarea, 'leaflet-illustrate-textbox');

		if (this.options.className) {
			L.Domutil.addClass(textarea, this.options.className);
		}
	}

});

/* Add GeoJSON Conversion */
L.Illustrate.Textbox.prototype.toGeoJSON = function() {
	var size = this.getSize(),
		properties = {
			textContent: this.getContent(),
			style: {
				width: size.x,
				height: size.y,
				rotation: this.getRotation()
			}
		},
		feature = L.GeoJSON.getFeature(this, {
			type: 'Point',
			coordinates: L.GeoJSON.latLngToCoords(this.getLatLng())
		});

	feature.properties = properties;

	return feature;
};

L.Illustrate.textbox = function(latlng, options) {
	return new L.Illustrate.Textbox(latlng, options);
};

L.Illustrate.Selectable = L.Handler.extend({

	includes: [L.Mixin.Events],

	statics: {
		START: L.Draggable.START,
		END: L.Draggable.END,
		MOVE: L.Draggable.MOVE
	},

	initialize: function(element, selectStartTarget) {
		this._element = element;
		this._selectStartTarget = selectStartTarget || element;
	},

	addHooks: function() {
		var start = L.Illustrate.Selectable.START;
		L.DomEvent.on(this._selectStartTarget, start.join(' '), this._onDown, this);
	},

	removeHooks: function() {
		var start = L.Illustrate.Selectable.START;
		L.DomEvent.off(this._selectStartTarget, start.join(' '), this._onDown, this);
	},

	_onDown: function(event) {
		L.DomEvent.stopPropagation(event);
	}
});
L.Illustrate.Create = L.Illustrate.Create || {};
L.Illustrate.Create.Pointer = L.Draw.Polyline.extend({
	// Have *GOT* to refactor this.
	// Really, I should get the layer point position on click, not the latlng.  There's no need to be endlessly
	// translating between latlng and layerpoint.

	statics: {
		TYPE: 'pointer'
	},

	initialize: function(map, options) {
		L.Draw.Polyline.prototype.initialize.call(this, map, options);

		this.type = L.Illustrate.Create.Pointer.TYPE;
	},

	_fireCreatedEvent: function() {
		var latlngs = this._poly.getLatLngs(),
			coordinates = [],
			origin = this._map.latLngToLayerPoint(latlngs[0]),
			pointer;

		for (var i = 0, length = latlngs.length; i < length; i++) {
			coordinates[i] = this._map.latLngToLayerPoint(latlngs[i])._subtract(origin);
		}

		pointer = new L.Illustrate.Pointer(latlngs[0], coordinates, this.options.shapeOptions);
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, pointer);
	}
});
L.Illustrate.Create.Textbox = L.Draw.Rectangle.extend({
	statics: {
		TYPE: 'textbox'
	},

	options: {
		/* Set dynamically using this._setShapeOptions() */
		shapeOptions: {},

		/* Change these to match your CSS textbox styles. */
		textOptions: {
			borderColor: '#4387fd',
			borderWidth: 2
		}
	},

	initialize: function(map, options) {
		this.options.textOptions = L.extend({}, this.options.textOptions, options);
		this._setShapeOptions();

		/* 
		 * A <textarea> element can only be drawn from upper-left to lower-right. 
		 * Implement drawing using L.Draw.Rectangle so that a textbox can be drawn in any direction,
		 * then return a L.Illustrate.Textbox instance once drawing is complete.
		 */
		L.Draw.Rectangle.prototype.initialize.call(this, map, options);

		this.type = L.Illustrate.Create.Textbox.TYPE;
	},

	_fireCreatedEvent: function() {
		var latlngs = this._shape.getLatLngs(),
			center = new L.LatLngBounds(latlngs).getCenter(),
			corner = latlngs[1],
			oppositeCorner = latlngs[3],
			cornerPixelCoordinates = this._map.latLngToLayerPoint(corner).round(),
			oppositeCornerPixelCoordinates = this._map.latLngToLayerPoint(oppositeCorner).round(),
			width = oppositeCornerPixelCoordinates.x - cornerPixelCoordinates.x + 2,
			height = oppositeCornerPixelCoordinates.y - cornerPixelCoordinates.y + 2;

		var textbox = new L.Illustrate.Textbox(center, this.options.textOptions)
			.setSize(new L.Point(width, height));

		L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, textbox);
	},

	_setShapeOptions: function() {
		/* shapeOptions are set dynamically so that the Rectangle looks the same as the Textbox. */
		var borderWidth = this.options.textOptions.borderWidth ?
						  this.options.textOptions.borderWidth :
						  2,
			borderColor = this.options.textOptions.borderColor ?
			              this.options.textOptions.borderColor :
			              '#4387fd';

		this.options.shapeOptions = L.extend({}, this.options.shapeOptions, {
			weight: borderWidth,
			color: borderColor,
			fill: false,
			opacity: 1
		});
	}
});
L.Illustrate.Toolbar = L.Toolbar.extend({
	statics: {
		TYPE: 'illustrate'
	},

	options: {
		textbox: {},
		pointer: {}
	},

	initialize: function(options) {
		// Ensure that the options are merged correctly since L.extend is only shallow
		for (var type in this.options) {
			if (this.options.hasOwnProperty(type)) {
				if (options[type]) {
					options[type] = L.extend({}, this.options[type], options[type]);
				}
			}
		}

		this._toolbarClass = 'leaflet-illustrate-create';
		L.Toolbar.prototype.initialize.call(this, options);
	},

	getModeHandlers: function(map) {
		return [
			{
				enabled: this.options.textbox,
				handler: new L.Illustrate.Create.Textbox(map, this.options.textbox),
				title: 'Add a textbox'
			},
			{
				enabled: this.options.pointer,
				handler: new L.Illustrate.Create.Pointer(map, this.options.pointer),
				title: 'Add a pointer'
			}
		];
	},

	getActions: function() {
		return [];
	},

	setOptions: function (options) {
		L.setOptions(this, options);

		for (var type in this._modes) {
			if (this._modes.hasOwnProperty(type) && options.hasOwnProperty(type)) {
				this._modes[type].handler.setOptions(options[type]);
			}
		}
	}
});

L.Illustrate.Control = L.Control.Draw.extend({
	initialize: function(options) {
		if (L.version < '0.7') {
			throw new Error('Leaflet.draw 0.2.3+ requires Leaflet 0.7.0+. Download latest from https://github.com/Leaflet/Leaflet/');
		}

		L.Control.prototype.initialize.call(this, options);

		var id,
			toolbar;

		this._toolbars = {};

		/* Initialize toolbars for creating L.Illustrate objects. */
		if (L.Illustrate.Toolbar && this.options.draw) {
			toolbar = new L.Illustrate.Toolbar(this.options.draw);
			id = L.stamp(toolbar);
			this._toolbars[id] = toolbar;

			// Listen for when toolbar is enabled
			this._toolbars[id].on('enable', this._toolbarEnabled, this);
		}

		/* Initialize generic edit/delete toolbars. */
		if (L.EditToolbar && this.options.edit) {
			toolbar = new L.EditToolbar(this.options.edit);
			id = L.stamp(toolbar);
			this._toolbars[id] = toolbar;

			this._toolbars[id] = toolbar;

			// Listen for when toolbar is enabled
			this._toolbars[id].on('enable', this._toolbarEnabled, this);
		}
	}
});

L.Map.addInitHook(function() {
	if (this.options.illustrateControl) {
		this.illustrateControl = new L.Illustrate.Control();
		this.addControl(this.illustrateControl);
	}
});

/* Override the _toggleMarkerHighlight method to prevent annoying highlighting of textboxes. */
if (L.EditToolbar.Edit) {
	L.EditToolbar.Edit.prototype._toggleMarkerHighlight = function() {};
}
L.Illustrate.tooltipText = {
	create: {
		toolbar: {
			actions: {

			},
			undo: {

			},
			buttons: {

			}
		},
		handlers: {

		}
	},

	edit: {
		toolbar: {
			actions: {

			},
			undo: {

			},
			buttons: {

			}
		},
		handlers: {
			textbox: {
				tooltip: {
					start: ''
				}
			}
		}
	}
};
L.Illustrate.EditHandle = L.RotatableMarker.extend({
	options: {
		moveIcon: new L.DivIcon({
			iconSize: new L.Point(8, 8),
			className: 'leaflet-div-icon leaflet-editing-icon leaflet-edit-move'
		}),
		resizeIcon: new L.DivIcon({
			iconSize: new L.Point(8, 8),
			className: 'leaflet-div-icon leaflet-editing-icon leaflet-edit-resize'
		})
	},

	initialize: function(shape, options) {
		L.setOptions(this, options);

		this._handleOffset = new L.Point(options.offset.x || 0, options.offset.y || 0);
		this._handled = shape;

		var latlng = this._handled._map.layerPointToLatLng(this._textboxCoordsToLayerPoint(
				this._handleOffset
			)),
			markerOptions = {
				draggable: true,
				icon: this.options.resizeIcon,
				zIndexOffset: 10
			};

		if (this._handled.getRotation) {
			markerOptions.rotation = this._handled.getRotation();
		}

		L.RotatableMarker.prototype.initialize.call(this, latlng, markerOptions);
	},

	onAdd: function(map) {
		L.RotatableMarker.prototype.onAdd.call(this, map);
		this._bindListeners();
	},

	onRemove: function(map) {
		this._unbindListeners();
		L.RotatableMarker.prototype.onRemove.call(this, map);
	},

	_animateZoom: function(opt) {
		var map = this._handled._map,
			handleLatLng = map._newLayerPointToLatLng(
				this._textboxCoordsToLayerPoint(this._handleOffset, opt), opt.zoom, opt.center
			),
			pos = map._latLngToNewLayerPoint(handleLatLng, opt.zoom, opt.center).round();

		this._setPos(pos);
	},

	updateHandle: function() {
		var rotation = this._handled.getRotation(),
			latlng = this._textboxCoordsToLatLng(this._handleOffset);

		this.setRotation(rotation);
		this.setLatLng(latlng);
	},

	_onHandleDragStart: function() {
		this._handled.fire('editstart');
	},

	_onHandleDragEnd: function() {
		this._fireEdit();
	},

	_fireEdit: function() {
		this._handled.edited = true;
		this._handled.fire('edit');
	},

	_bindListeners: function() {
		this.on({
			'dragstart': this._onHandleDragStart,
			'drag': this._onHandleDrag,
			'dragend': this._onHandleDragEnd
		}, this);

		this._handled._map.on('zoomend', this.updateHandle, this);

		this._handled.on('rotate', this.updateHandle, this);
		this._handled.on('resize', this.updateHandle, this);
		this._handled.on('move', this.updateHandle, this);
	},

	_unbindListeners: function() {
		this.off({
			'dragstart': this._onHandleDragStart,
			'drag': this._onHandleDrag,
			'dragend': this._onHandleDragEnd
		}, this);

		this._handled._map.off('zoomend', this.updateHandle, this);
		this._handled.off('update', this.updateHandle, this);
	},

	_calculateRotation: function(point, theta) {
		return new L.Point(
			point.x*Math.cos(theta) - point.y*Math.sin(theta),
			point.y*Math.cos(theta) + point.x*Math.sin(theta)
		).round();
	},

	/* Perhaps this should be moved to L.Illustrate.Textbox? */
	_layerPointToTextboxCoords: function(point, opt) {
		var map = this._handled._map,
			rotation = this._handled.getRotation(),
			center = this._handled.getLatLng(),
			origin, textboxCoords;

		if (opt && opt.zoom && opt.center) {
			origin = map._latLngToNewLayerPoint(center, opt.zoom, opt.center);
		} else {
			origin = map.latLngToLayerPoint(center);
		}

		/* First need to translate to the textbox coordinates. */
		textboxCoords = point.subtract(origin);

		/* Then unrotate. */
		return this._calculateRotation(textboxCoords, - rotation);
	},

	/* Perhaps this should be moved to L.Illustrate.Textbox? */
	_textboxCoordsToLayerPoint: function(coord, opt) {
		var map = this._handled._map,
			rotation = this._handled.getRotation(),
			center = this._handled.getLatLng(),
			origin, rotated;

		if (opt && opt.zoom && opt.center) {
			origin = map._latLngToNewLayerPoint(center, opt.zoom, opt.center);
		} else {
			origin = map.latLngToLayerPoint(center);
		}

		/* First need to rotate the offset to obtain the layer point. */
		rotated = this._calculateRotation(coord, rotation);

		/* Then translate to layer coordinates. */
		return rotated.add(origin);
	},

	_latLngToTextboxCoords: function(latlng, opt) {
		var map = this._handled._map;

		return this._layerPointToTextboxCoords(map.latLngToLayerPoint(latlng), opt);
	},

	_textboxCoordsToLatLng: function(coord, opt) {
		var map = this._handled._map;

		return map.layerPointToLatLng(this._textboxCoordsToLayerPoint(coord, opt));
	}
	
});
L.Illustrate.MoveHandle = L.Illustrate.EditHandle.extend({
	options: {
		TYPE: 'move'
	},

	_onHandleDrag: function(event) {
		var handle = event.target;

		this._handled.setLatLng(handle.getLatLng());
	}
});
L.Illustrate.PointerHandle = L.Illustrate.EditHandle.extend({
	initialize: function(shape, options) {
		L.Illustrate.EditHandle.prototype.initialize.call(this, shape, options);

		if (this._handled.editing) {
			this._editing = this._handled.editing;
		}

		this._id = options.id;
		this._type = options.type;
	},

	_onHandleDrag: function(event) {
		var handle = event.target,
			edit = this._editing;

		this._handleOffset = this._latLngToTextboxCoords(this.getLatLng());

		switch(handle._type) {
		case 'vertex':
			edit._updateVertex(handle);
			break;
		case 'midpoint':
			edit._addVertex(handle);
			break;
		}
	},

	_onHandleClick: function(event) {
		var handle = event.target,
			edit = this._editing;

		this._handleOffset = this._latLngToTextboxCoords(handle.getLatLng());

		switch(this._type) {
		case 'vertex':
			edit._removeVertex(handle);
			break;
		case 'midpoint':
			edit._addVertex(handle);
			break;
		}
	},

	_bindListeners: function() {
		L.Illustrate.EditHandle.prototype._bindListeners.call(this);
		this.on('click', this._onHandleClick, this);
		this._handled.on({
			'edit:remove-vertex': this._onVertexRemove,
			'edit:add-vertex': this._onVertexAdd,
			'edit:update-vertex': this._onVertexUpdate
		}, this);
	},

	_unbindListeners: function() {
		L.Illustrate.EditHandle.prototype._unbindListeners.call(this);
		this.off('click', this._onHandleClick, this);
		this._handled.off({
			'edit:remove-vertex': this._onVertexRemove,
			'edit:add-vertex': this._onVertexAdd,
			'edit:update-vertex': this._onVertexUpdate
		}, this);
	},

	_onVertexAdd: function(event) {
		var id = event.addedId;

		if (this._id === id) {
			this._id += 1;
			this._type = 'vertex';
			this.setOpacity(1);
		} else if (this._id > id) {
			this._id += 2;
		}
	},

	_onVertexRemove: function(event) {
		var id = event.removedId;

		if (this._id > id + 1) {
			this._id -= 2;
		}
	},

	_onVertexUpdate: function(event) {
		var edit = this._handled.editing,
			updated = event.handle,
			id = updated._id,
			i = edit._handleIdToCoordIndex(id, updated._type),
			pointer = this._handled,
			origin = pointer._map.latLngToLayerPoint(pointer.getLatLng()),
			midpoint, latlng;

		/* Update the positions of the two adjacent 'midpoint' handles. */
		if ((this._id === id - 1) && i > 0) {
			midpoint = edit._calculateMidpoint(i - 1, i).add(origin);
			latlng = pointer._map.layerPointToLatLng(midpoint);
			this.setLatLng(latlng);
		} else if ((this._id === id + 1) && i + 1 < pointer.getPoints().length) {
			midpoint = edit._calculateMidpoint(i, i + 1).add(origin);
			latlng = pointer._map.layerPointToLatLng(midpoint);
			this.setLatLng(latlng);
		}
	}
});
L.Illustrate.ResizeHandle = L.Illustrate.EditHandle.extend({
	options: {
		TYPE: 'resize'
	},

	initialize: function(shape, options) {
		L.Illustrate.EditHandle.prototype.initialize.call(this, shape, options);
		this._corner = options.corner;
	},

	_onHandleDrag: function(event) {
		var handle = event.target,
			offset = this._getOffset(handle.getLatLng());

		this._handled.setSize(offset.abs().multiplyBy(2).round());
	},

	_getOffset: function(latlng) {
		var coord = this._latLngToTextboxCoords(latlng),
			minOffset = this._handled._minSize.divideBy(2),
			x = (Math.abs(coord.x) < minOffset.x) ? minOffset.x : coord.x,
			y = (Math.abs(coord.y) < minOffset.y) ? minOffset.y : coord.y;

		return new L.Point(x,y);
	},

	updateHandle: function() {
		var size = this._handled.getSize(),
			height = Math.round(size.y/2),
			width = Math.round(size.x/2);

		switch (this._corner) {
		case 'upper-left':
			this._handleOffset = new L.Point(-width, height);
			break;
		case 'upper-right':
			this._handleOffset = new L.Point(width, height);
			break;
		case 'lower-left':
			this._handleOffset = new L.Point(-width, -height);
			break;
		case 'lower-right':
			this._handleOffset = new L.Point(width, -height);
			break;
		}

		L.Illustrate.EditHandle.prototype.updateHandle.call(this);
	}
});
L.Illustrate.RotateHandle = L.Illustrate.EditHandle.extend({
	options: {
		TYPE: 'rotate'
	},

	initialize: function(shape, options) {
		L.Illustrate.EditHandle.prototype.initialize.call(this, shape, options);
		this._createPointer();
	},

	onAdd: function(map) {
		L.Illustrate.EditHandle.prototype.onAdd.call(this, map);
		this._map.addLayer(this._pointer);
	},

	onRemove: function(map) {
		this._map.removeLayer(this._pointer);

		L.Illustrate.EditHandle.prototype.onRemove.call(this, map);
	},

	_onHandleDrag: function(event) {
		var handle = event.target,
			latlng = handle.getLatLng(),
			center = this._handled.getLatLng(),
			point = this._map.latLngToLayerPoint(latlng).subtract(this._map.latLngToLayerPoint(center)),
			theta;

		if (point.y > 0) {
			theta = Math.PI - Math.atan(point.x / point.y);
		} else {
			theta = - Math.atan(point.x / point.y);
		}

		/* rotate the textbox */
		this._handled.setRotation(theta);
	},

	updateHandle: function() {
		this._handleOffset = new L.Point(0, -this._handled.getSize().y);

		this._updatePointer();

		L.Illustrate.EditHandle.prototype.updateHandle.call(this);
	},

	_createPointer: function() {
		var textarea = this._handled.getTextarea(),
			borderWidth = L.DomUtil.getStyle(textarea, 'border-width'),
			borderColor = L.DomUtil.getStyle(textarea, 'border-color'),
			options = {
				color: borderColor,
				weight: Math.round(borderWidth)
			};

		this._pointer = new L.Illustrate.Pointer(this._handled.getLatLng(), [], options);
		this._updatePointer();

		this._handled.on({ 'update': this._updatePointer }, this);
	},

	_updatePointer: function() {
		var map = this._handled._map,
			center = this._handled.getLatLng(),
			origin = map.latLngToLayerPoint(center);

		this._pointerStart = this._handleOffset.multiplyBy(0.5);

		this._pointer.setLatLng(center);
		this._pointer.setPoints([
			this._textboxCoordsToLayerPoint(this._pointerStart).subtract(origin),
			this._textboxCoordsToLayerPoint(this._handleOffset).subtract(origin)
		]);
	}
});
L.Illustrate.Edit = L.Illustrate.Edit || {};

L.Illustrate.Edit.Pointer = L.Edit.Poly.extend({
	initialize: function(shape, options) {
		L.Edit.Poly.prototype.initialize.call(this, shape, options);
		this._shape = shape;
	},

	addHooks: function() {
		if (this._shape._map) {
			this._map = this._shape._map;

			this._initHandles();
		}
	},

	removeHooks: function() {
		if (this._shape._map) {
			this._map.removeLayer(this._handleGroup);
			delete this._handleGroup;
		}
	},

	_initHandles: function() {
		if (!this._handleGroup) {
			var coordinates = this._shape.getPoints(),
				length = coordinates.length,
				i;

			/* Pointers are not rotatable, but EditHandles expect rotatable objects. */
			this._shape.getRotation = function() { return 0; };

			this._handleGroup = new L.FeatureGroup();
			this._map.addLayer(this._handleGroup);

			this._handles = [];

			for (i = 0; i < length; i++) {
				this._handles.push(this._createVertexHandle(i));

				if ( i < length - 1) {
					this._handles.push(this._createMidpointHandle(i));
				}
			}
		}
	},

	_removeVertex: function(handle) {
		var pointer = this._shape,
			coordinates = pointer.getPoints(),
			removedId = handle._id,
			i = this._handleIdToCoordIndex(removedId, handle._type),
			removed;

		if (i === 0 || i === coordinates.length - 1 ) {
			removed = [handle];
		} else {
			removed = pointer.editing._handles.splice(i, 3);
		}

		for (var j = 0, l = removed.length; j < l; j++) {
			this._handleGroup.removeLayer(removed[j]);
			delete removed[j];
		}

		/* Modify the path and redraw the pointer */
		coordinates.splice(i, 1);
		pointer.setPoints(coordinates);

		pointer.fire('edit:remove-vertex', { 'handle': handle, 'removedId': removedId });

		this._handles.splice(removedId - 1, 0, this._createMidpointHandle(i - 1));
	},

	_addVertex: function(handle) {
		var pointer = this._shape,
			coordinates = pointer.getPoints(),
			addedId = handle._id,
			i = this._handleIdToCoordIndex(addedId, handle._type),
			before, after;

		/* Modify the path and redraw the pointer. */
		coordinates.splice(i + 1, 0, L.point(handle._handleOffset));
		pointer.setPoints(coordinates);

		pointer.fire('edit:add-vertex', { 'handle': handle, 'addedId': addedId });

		before = this._createMidpointHandle(i);
		after = this._createMidpointHandle(i + 1);

		this._handles.splice(addedId, 0, before);
		this._handles.splice(addedId + 2, 0, after);
	},

	_updateVertex: function(handle) {
		var	pointer = this._shape,
			i = this._handleIdToCoordIndex(handle._id, handle._type);

		pointer._coordinates.splice(i, 1, L.point(handle._handleOffset));
		pointer.setPoints(pointer._coordinates);
		pointer.fire('edit:update-vertex', { 'handle': handle });
	},

	/* TODO: Move this into a subclass of L.Illustrate.PointerHandle */
	_createVertexHandle: function(index) {
		var coordinates = this._shape.getPoints(),
			vertexHandle = new L.Illustrate.PointerHandle(this._shape, {
				offset: coordinates[index],
				id: this._coordIndexToHandleId(index, 'vertex'),
				type: 'vertex'
			});

		this._handleGroup.addLayer(vertexHandle);

		return vertexHandle;
	},

	/* TODO: Move this into a subclass of L.Illustrate.PointerHandle */
	_createMidpointHandle: function(index) {
		var	midpointHandle = new L.Illustrate.PointerHandle(this._shape, {
				offset: this._calculateMidpoint(index, index + 1),
				id: this._coordIndexToHandleId(index, 'midpoint'),
				type: 'midpoint'
			});

		midpointHandle.setOpacity(0.6);
		this._handleGroup.addLayer(midpointHandle);

		return midpointHandle;
	},

	_handleIdToCoordIndex: function(id, type) {
		var index;

		switch(type) {
		case 'vertex':
			index = id/2;
			break;
		case 'midpoint':
			index = (id - 1)/2;
			break;
		}
		return index;
	},

	_coordIndexToHandleId: function(index, type) {
		var id;

		switch(type) {
		case 'vertex':
			id = index*2;
			break;
		case 'midpoint':
			id = index*2 + 1;
			break;
		}
		return id;
	},

	_calculateMidpoint: function(i, j) {
		var	coordinates = this._shape.getPoints(),
			v1 = coordinates[i],
			v2 = coordinates[j],
			delta = v2.subtract(v1).divideBy(2);

		return v1.add(delta);
	}
});

L.Illustrate.Pointer.addInitHook(function() {
	if (L.Illustrate.Edit.Pointer) {
		this.editing = new L.Illustrate.Edit.Pointer(this);

		if (this.options.editable) {
			this.editing.enable();
		}
	}
});
L.Illustrate.Edit = L.Illustrate.Edit || {};

L.Illustrate.Edit.Textbox = L.Edit.SimpleShape.extend({
	addHooks: function() {
		/* L.EditToolbar.Edit#_enableLayerEdit enables dragging - but we don't want that. */
		this._shape.dragging.disable();

		if (this._shape._map) {
			this._map = this._shape._map;

			this._initHandles();
			this._initEvents();
		}
	},

	removeHooks: function() {
		if (this._shape._map) {
			this._map.removeLayer(this._handles);
			delete this._handles;
		}

		this._map = null;
	},

	_initHandles: function() {
		if (!this._handles) {

			this._handles = new L.LayerGroup();
			this._map.addLayer(this._handles);

			this._addRotateHandle();
			this._addResizeHandles();
			this._addMoveHandle();
		}
	},

	_initEvents: function() {
		var fireEdit = function() { this._shape.fire('edit'); },
			changeEvents = [ 'resize', 'rotate', 'textedit', 'move' ];

		for (var i = 0; i < changeEvents.length; i++) {
			this._shape.on(changeEvents[i], fireEdit, this);
		}
	},

	_addRotateHandle: function() {
		this._rotateHandle = new L.Illustrate.RotateHandle(this._shape, {
			offset: new L.Point(0, -this._shape.getSize().y)
		});
		this._handles.addLayer(this._rotateHandle);
	},

	_addMoveHandle: function() {
		this._moveHandle = new L.Illustrate.MoveHandle(this._shape, {
			offset: new L.Point(0,0)
		});
		this._handles.addLayer(this._moveHandle);
	},

	_addResizeHandles: function() {
		var size = this._shape.getSize(),
			height = Math.round(size.y/2),
			width = Math.round(size.x/2),
			upperLeft = new L.Illustrate.ResizeHandle(this._shape, {
				offset: new L.Point(-width, -height),
				corner: 'upper-left'
			}),
			upperRight = new L.Illustrate.ResizeHandle(this._shape, {
				offset: new L.Point(width, -height),
				corner: 'upper-right'
			}),
			lowerLeft = new L.Illustrate.ResizeHandle(this._shape, {
				offset: new L.Point(-width, height),
				corner: 'lower-left'
			}),
			lowerRight = new L.Illustrate.ResizeHandle(this._shape, {
				offset: new L.Point(width, height),
				corner: 'lower-right'
			});

		this._resizeHandles = [ upperLeft, upperRight, lowerLeft, lowerRight ];

		for (var i = 0; i < this._resizeHandles.length; i++) {
			this._handles.addLayer(this._resizeHandles[i]);
		}
	}
});

L.Illustrate.Textbox.addInitHook(function() {
	if (L.Illustrate.Edit.Textbox) {
		this.editing = new L.Illustrate.Edit.Textbox(this);

		if (this.options.editable) {
			this.editing.enable();
		}
	}
});

}(window, document));