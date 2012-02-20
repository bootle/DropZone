/*
---

name: DropZone.HTML5

description: A DropZone module. Handles uploading using the HTML5 method

license: MIT-style license

authors:
  - Mateusz Cyrankiewicz
  - Juan Lago

requires: [DropZone]

provides: [DropZone.HTML5]

...
*/

DropZone.HTML5 = new Class({

	Extends: DropZone,

	initialize: function (options) {
		
		this.setOptions(options);
		
		this.method = 'HTML5'
		
		this.activate();
		
	},
	
	activate: function (){
		
		this.parent();
		
		// If drop area is specified, 
		// and in HTML5 mode,
		// activate dropping
		
		if(this.uiDropArea){
			
			// Extend new events
			Object.append(Element.NativeEvents, {
				dragenter: 2,
				dragleave: 2,
				dragover: 2,
				drop: 2
			});
			
			this.uiDropArea.addEvents({
							
				'dragenter': function (e) {
					
					e.stop();
					this.uiDropArea.addClass('dropzone_over');
					
				}.bind(this),
				
				'dragleave': function (e) {
					
					e.stop();
					
					if (e.target && e.target === this.uiDropArea) {
						this.uiDropArea.removeClass('dropzone_over');
					}
					
				}.bind(this),
				
				'dragover': function (e) {
				
					e.stop();
					e.preventDefault();
					
				}.bind(this),
				
				'drop': function (e) {
				
					e.stop();
					
					if(e.event.dataTransfer) {
						
						this.addFiles(e.event.dataTransfer.files);
						
					}
					
					this.uiDropArea.removeClass('dropzone_over');
					
				}.bind(this)
				
			});
			
			// prevent defaults on window
			
			// --> ADD REMOVING THESE ON KILL
			
			/*$(document.body).addEvents({
							
				'dragenter': function (e) {
					
					e.stop();
					
				}.bind(this),
				
				'dragleave': function (e) {
					
					e.stop();
					
				}.bind(this),
				
				'dragover': function (e) {
				
					e.stop();
					
				}.bind(this),
				
				'drop': function (e) {
				
					e.stop();
					
				}.bind(this)
				
			});*/
		}
		
		
		// Activate trigger for html file input
		
		this._activateHTMLButton();
		
	},
	
	upload: function () {
		
		this.parent();
		
		this.fileList.each(function(file, i){
	
			if (this.nCurrentUploads <= this.options.max_queue) {
				
				// Upload only checked and new files
				if (file.checked && !file.uploading) {
					this.isUploading = true;
					file.uploading = true;
					this.nCurrentUploads++;
					
					this._html5Send(file, 0, false);
					
				}

			}

		}, this);
		
	},

	_html5Send: function (file, start, resume) {
		
		var item;
		if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + (file.uniqueid));
		
		var end = this.options.block_size,
			chunk,
			is_blob = true;

		var total = start + end;
		if (total > file.size) end = total - file.size;


		// Get slice method
		
		if (file.file.mozSlice) // Mozilla based
			chunk = file.file.mozSlice(start, total);
		else if (file.file.webkitSlice) // Chrome and webkit based (but not yet Safari)
			chunk = file.file.webkitSlice(start, total);
		else if (file.file.slice) // Opera and other standards browsers
			chunk = file.file.slice(start, total);
		else { // Safari
		
			// send as form data instead of Blob
			chunk = new FormData();
			chunk.append('file', file.file);
			is_blob = false;
			
		}
		
		// Set headers
		
		var headers = {
			'Cache-Control': 'no-cache'
		}
		
		// Add call-specific vars
		
		var url = this.url + '&' + Object.toQueryString({
			'X-Requested-With': 'XMLHttpRequest',
			'X-File-Name': file.name,
			'X-File-Size': file.size,
			'X-File-Id': file.id,
			'X-File-Resume': resume
		});
		
		// Send request
		
		var xhr = new Request.Blob({
			url: url,
			headers: headers,
			onProgress: function(e){
				if(!is_blob){
					
					// track xhr progress only if data isn't actually sent as a chunk (eg. in Safari)
					
					var perc = e.loaded / e.total * 100;
					this.fileList[file.id].progress = perc;
					this._itemProgress(item, perc);
					
				}
			}.bind(this),
			onSuccess: function (response) {
				
				try {
					response = JSON.decode(response, true);
				} catch(e){
					response = '';
				}
				
				if (this._checkResponse(response)) {
					
					if (response.finish == true || total >= file.size) {
						
						// job done!
						
						this._itemComplete(item, file, response);

						if (this.nCurrentUploads != 0 && this.nCurrentUploads <= this.options.max_queue && file.checked) this.upload();

					} else {
						
						// in progress..
						
						if(file.checked) {
							
							var perc = (total / file.size) * 100;
							
							// used to calculate global progress
							this.fileList[file.id].progress = perc;
							
							this._itemProgress(item, perc);
							
							this._html5Send(file, start + response.size.toInt(), true) // Recursive upload
							
						}
						
					}
					
				} else {
					
					// errror!
					
					this._itemError(item, file, response);
					
					if(this.nCurrentUploads == 0)
						this._queueComplete();
					else if (this.nCurrentUploads != 0 && this.nCurrentUploads <= this.options.max_queue) 
						this.upload();

				}

			}.bind(this)
			
		});

		xhr.send(chunk);

	},

	cancel: function (id, item) {
		
		this.parent(id, item);
		
		//
		
	},
	
	
	/* Private methods */
	
	_newInput: function () {
		
		this.parent();
		
		// add interaction to input
		
		this.lastInput.addEvent('change', function (e) {
			
			e.stop();

			this.addFiles(this.lastInput.files);

		}.bind(this));
		
	}

});