/*
---

name: DropZone.Flash

description: A DropZone module. Handles uploading using the Flash method

license: MIT-style license

authors:
  - Mateusz Cyrankiewicz
  - Juan Lago

requires: [DropZone]

provides: [DropZone.Flash]

...
*/

DropZone.Flash = new Class({

	Extends: DropZone,
	
	options: {
		
		flash: {
			movie: 'Moo.Uploader.swf'
		}
		
	},
	
	initialize: function (options) {
		
		this.setOptions(options);
		
		this.method = 'Flash'
		
		this.activate();
		
	},
	
	activate: function () {
				
		// activate parent
		this.parent();
		
		// add hover effect to button
		// so it always re-positions flash before click
		this.uiButton.addEvent('mouseenter', this.positionContainer.bind(this));
		
		this.positionContainer();
		
	},
	
	createFlash: function(){
		
		var btn = this.uiButton;
		var btnsize = btn.getSize();
		
		var uid = String.uniqueID();
		
		// Create container for flash
		this.flashContainer = new Element('div', {
			id: 'dropzone_flash_wrap_' + uid,
			styles: {
				position: 'absolute'
			}
		}).inject(this.hiddenContainer);
		
		// Deploy flash movie
		this.flashObj = new Swiff(this.options.flash.movie + (this.options.flash.movie.contains('?') ? '&' : '?') + uid, { // add randomid to prevent caching in IE
			container: this.flashContainer.get('id'),
			width: btnsize.x,
			height: btnsize.y,
			params: {
				wMode: 'transparent',
				bgcolor: '#000000'
			},
			callBacks: {

				load: function () {
					
					Swiff.remote(this.flashObj.toElement(), 'xInitialize', {
						multiple: this.options.multiple,
						url: this.url,
						method: 'post',
						queued: this.options.max_queue,
						fileSizeMin: this.options.min_file_size,
						fileSizeMax: this.options.max_file_size,
						typeFilter: this._flashFilter(this.options.accept),
						mergeData: true,
						data: this._cookieData(),
						verbose: true
					});
					
					this.isFlashLoaded = true;

				}.bind(this),
				
				buttonEnter: function(){
					this.uiButton.addClass('hover');
					this.uiButton.fireEvent('mouseenter');
				}.bind(this),
				
				buttonLeave: function(){
					this.uiButton.removeClass('hover');
					this.uiButton.fireEvent('mouseleave');
				}.bind(this),
				
				select: function (files){
					
					this.addFiles(files[0]);
					
					this.nCurrentUploads = files[0].length;
					
				}.bind(this),

				complete: function (resume) {
					
					this.isUploading = false;
					
				}.bind(this),

				fileOpen: function (file) {
					
					//
					
				}.bind(this),

				fileProgress: function (r) {
					
					// get the right file object
					var file = this.fileList[r[0].id];
									
					var item,
						perc = r[0].progress.percentLoaded;
					if(perc > 100) perc = 100; // in case backend or flash mess something up
					if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + file.uniqueid + '_' + file.id);
					
					// set file progress
					file.progress = perc;
					
					this._itemProgress(item, perc);
					
				}.bind(this),

				fileComplete: function (r) {
					
					// get the right file object
					var file = this.fileList[r[0].id];
					
					// set to uploaded
					file.uploaded = true;
					
					var item;
					if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + file.uniqueid + '_' + file.id);
										
					// get response right
					
					try {
						response = JSON.decode(r[0].response.text, true);
					} catch(e){
						response = '';
					}
					
					// check if uploaded correctly
					
					if (this._checkResponse(response)) {
						
						this._itemComplete(item, file, response);
						
					} else {
						
						this._itemError(item, file, response);
												
					}
					
				}.bind(this)

			}
		});
		
	},
	
	reset: function(){
	
		this.parent();
		this.createFlash();
		this.positionContainer();
		
	},

	upload: function () {
		
		if (!this.isUploading) {
			
			for (var i = 0, f; f = this.fileList[i]; i++) {
				if (!f.uploading) Swiff.remote(this.flashObj.toElement(), 'xFileStart', i);
			}
			
			this.parent();

		}

	},
	
	positionContainer: function(){
	
		if(!this.flashContainer) return;
		
		var btn = this.uiButton;
		var btnposition = btn.getPosition(btn.getOffsetParent());
		
		this.flashContainer.setStyles({
			top: btnposition.y,
			left: btnposition.x
		});
			
	},

	_flashFilter: function (filters) {
		var filtertypes = {},
			assocfilters = {},
			extensions = {
			'image': '*.jpg; *.jpeg; *.gif; *.png; *.bmp;',
			'video': '*.avi; *.mpg; *.mpeg; *.flv; *.ogv; *.webm; *.mov; *.wm;',
			'text': '*.txt; *.rtf; *.doc; *.docx; *.odt; *.sxw;',
			'*': '*.*;'
		}

		filters.split(',').each(function (val) {
			val = val.split('/').invoke('trim');
			filtertypes[val[0]] = (filtertypes[val[0]] ? filtertypes[val[0]] + ' ' : '') + '*.' + val[1] + ';';
		});

		Object.each(filtertypes, function (val, key) {
			var newindex = key == '*' ? 'All Files' : key.capitalize();
			if (val == '*.*;') val = extensions[key];
			assocfilters[newindex + ' (' + val + ')'] = val;
		});

		return assocfilters;
	},

	// appendCookieData based in Swiff.Uploader.js
	_cookieData: function () {

		var hash = {};

		document.cookie.split(/;\s*/).each(function (cookie) {

			cookie = cookie.split('=');

			if (cookie.length == 2) {
				hash[decodeURIComponent(cookie[0])] = decodeURIComponent(cookie[1]);
			}
		});

		return hash;
	},

	cancel: function (id, item) {
		
		this.parent(id, item);
		Swiff.remote(this.flashObj.toElement(), 'xFileRemove', id);
		
	}

});